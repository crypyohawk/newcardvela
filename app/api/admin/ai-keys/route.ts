export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyAdmin } from '../../../../src/lib/adminAuth';
import { updateNewApiToken, deleteNewApiToken } from '../../../../src/lib/newapi';

// 获取所有用户的 Key（管理员）
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};
    // 默认不显示已吊销的 Key，除非明确筛选
    if (status) {
      where.status = status;
    } else {
      where.status = { not: 'revoked' };
    }
    if (search) {
      where.OR = [
        { keyName: { contains: search, mode: 'insensitive' } },
        { apiKey: { contains: search, mode: 'insensitive' } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [keys, total] = await Promise.all([
      db.aIKey.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, email: true, balance: true, aiBalance: true, role: true, enterpriseApps: { where: { status: 'approved' }, select: { companyName: true }, orderBy: { reviewedAt: 'desc' }, take: 1 } } },
          tier: { select: { name: true, displayName: true, modelGroup: true, provider: { select: { type: true, displayName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.aIKey.count({ where }),
    ]);

    return NextResponse.json({
      keys: keys.map(k => ({
        ...k,
        apiKey: k.apiKey.length > 12
          ? k.apiKey.slice(0, 8) + '...' + k.apiKey.slice(-4)
          : '****',
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 管理员操作 Key（禁用/启用）
export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });

  try {
    const body = await request.json();
    const { keyId, status } = body;

    if (!keyId || !['active', 'disabled'].includes(status)) {
      return NextResponse.json({ error: '参数无效' }, { status: 400 });
    }

    // 查询 Key 获取 newApiTokenId 用于同步
    const existingKey = await db.aIKey.findUnique({
      where: { id: keyId },
      include: {
        tier: {
          include: {
            provider: true,
          },
        },
      },
    });
    if (!existingKey) {
      return NextResponse.json({ error: 'Key 不存在' }, { status: 404 });
    }

    // 同步状态到 new-api 网关
    if (existingKey.newApiTokenId) {
      try {
        await updateNewApiToken(existingKey.newApiTokenId, {
          status: status === 'active' ? 1 : 2,
        });
      } catch (e: any) {
        console.error('[admin] 同步 new-api 状态失败:', e.message);
      }
    }

    // 号池 Key 现在可以自由启用/禁用（共享池模型，无需绑定账号）

    const updated = await db.aIKey.update({
      where: { id: keyId },
      data: { status },
    });

    return NextResponse.json({ success: true, key: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 管理员导入 Key（分销模式：从 CloseAI 等上游复制 Key 分配给用户）
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });

  try {
    const body = await request.json();
    const { userId, tierId, keyName, apiKey } = body;

    if (!userId || !tierId || !keyName?.trim() || !apiKey?.trim()) {
      return NextResponse.json({ error: '用户ID、套餐、Key名称和API Key 都不能为空' }, { status: 400 });
    }

    // 验证套餐存在且为分销模式
    const tier = await db.aIServiceTier.findUnique({
      where: { id: tierId },
      include: { provider: true },
    });
    if (!tier) {
      return NextResponse.json({ error: '套餐不存在' }, { status: 400 });
    }

    // 验证用户存在
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    // 检查 Key 是否已存在
    const existing = await db.aIKey.findUnique({ where: { apiKey: apiKey.trim() } });
    if (existing) {
      return NextResponse.json({ error: '该 API Key 已存在' }, { status: 400 });
    }

    const aiKey = await db.aIKey.create({
      data: {
        userId,
        tierId,
        keyName: keyName.trim(),
        apiKey: apiKey.trim(),
        newApiTokenId: null,
        status: 'active',
      },
      include: {
        user: { select: { id: true, username: true, email: true } },
        tier: { select: { name: true, displayName: true } },
      },
    });

    return NextResponse.json({ success: true, key: aiKey });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 管理员删除 Key（软删除：标记为 revoked + 禁用/删除 new-api 侧 token）
export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json({ error: '缺少 Key ID' }, { status: 400 });
    }

    const aiKey = await db.aIKey.findUnique({
      where: { id: keyId },
      select: { id: true, newApiTokenId: true, keyName: true },
    });
    if (!aiKey) {
      return NextResponse.json({ error: 'Key 不存在' }, { status: 404 });
    }

    // 先禁用再删除 new-api 侧 token，确保 key 立即失效
    if (aiKey.newApiTokenId) {
      try {
        await updateNewApiToken(aiKey.newApiTokenId, { status: 2 });
      } catch (e: any) {
        console.error('[admin] 禁用 new-api token 失败:', e.message);
      }
      try {
        await deleteNewApiToken(aiKey.newApiTokenId);
      } catch (e: any) {
        console.error('[admin] 删除 new-api token 失败:', e.message);
      }
    }

    // 软删除：标记为 revoked
    await db.aIKey.update({
      where: { id: keyId },
      data: { status: 'revoked' },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
