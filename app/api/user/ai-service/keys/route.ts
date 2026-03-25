import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';
import { generateApiKey, createNewApiToken, deleteNewApiToken, usdToQuota } from '../../../../../src/lib/newapi';

// 获取用户的所有 Key
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const keys = await db.aIKey.findMany({
      where: { userId: payload.userId },
      include: { tier: { select: { name: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ keys });
  } catch (error: any) {
    console.error('获取 Key 失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 创建新 Key
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const body = await request.json();
    const { keyName, tierId, monthlyLimit } = body;

    if (!keyName?.trim() || !tierId) {
      return NextResponse.json({ error: '请填写 Key 名称并选择套餐' }, { status: 400 });
    }

    // 验证套餐存在
    const tier = await db.aIServiceTier.findUnique({ where: { id: tierId } });
    if (!tier || !tier.isActive) {
      return NextResponse.json({ error: '套餐不存在或已下线' }, { status: 400 });
    }

    // 验证用户余额
    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    if (user.balance <= 0) {
      return NextResponse.json({ error: '账户余额不足，请先充值' }, { status: 400 });
    }

    // 限制每个用户最多 10 个 Key
    const existingCount = await db.aIKey.count({ where: { userId: payload.userId } });
    if (existingCount >= 10) {
      return NextResponse.json({ error: '每个用户最多创建 10 个 Key' }, { status: 400 });
    }

    // 生成 API Key
    const apiKey = generateApiKey();

    // 在 new-api 创建对应 token
    let newApiTokenId: number | null = null;
    try {
      const quotaAmount = monthlyLimit ? usdToQuota(monthlyLimit) : usdToQuota(1000);
      const result = await createNewApiToken({
        name: `${user.username}-${keyName.trim()}`,
        key: apiKey,
        remainQuota: quotaAmount,
        group: tier.name,
      });
      newApiTokenId = result.id;
    } catch (e: any) {
      console.error('new-api 创建 token 失败:', e.message);
      // new-api 未部署时不阻断，Key 仍可创建
    }

    // 存入数据库
    const aiKey = await db.aIKey.create({
      data: {
        userId: payload.userId,
        tierId,
        keyName: keyName.trim(),
        apiKey,
        newApiTokenId,
        status: 'active',
        monthlyLimit: monthlyLimit || null,
      },
      include: { tier: { select: { name: true, displayName: true } } },
    });

    return NextResponse.json({
      success: true,
      key: aiKey,
      configGuide: {
        baseUrl: process.env.AI_API_BASE_URL || 'https://api.cardvela.com',
        apiKey: aiKey.apiKey,
      },
    });
  } catch (error: any) {
    console.error('创建 Key 失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
