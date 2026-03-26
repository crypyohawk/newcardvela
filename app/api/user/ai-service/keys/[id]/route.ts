export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../../src/lib/auth';
import { updateNewApiToken, deleteNewApiToken } from '../../../../../../src/lib/newapi';

// 获取单个 Key 详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const aiKey = await db.aIKey.findFirst({
      where: { id: params.id, userId: payload.userId },
      include: { tier: true },
    });

    if (!aiKey) return NextResponse.json({ error: 'Key 不存在' }, { status: 404 });

    return NextResponse.json({ key: aiKey });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 更新 Key（改名、设上限、启用/禁用）
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const aiKey = await db.aIKey.findFirst({
      where: { id: params.id, userId: payload.userId },
    });
    if (!aiKey) return NextResponse.json({ error: 'Key 不存在' }, { status: 404 });

    const body = await request.json();
    const updateData: any = {};

    if (body.keyName !== undefined) updateData.keyName = body.keyName.trim();
    if (body.monthlyLimit !== undefined) {
      updateData.monthlyLimit = (body.monthlyLimit === null || body.monthlyLimit === '' || body.monthlyLimit === 0) ? null : Number(body.monthlyLimit);
      if (updateData.monthlyLimit !== null && (isNaN(updateData.monthlyLimit) || updateData.monthlyLimit < 0)) {
        return NextResponse.json({ error: '月度限额不能为负数' }, { status: 400 });
      }
    }
    if (body.status !== undefined && ['active', 'disabled'].includes(body.status)) {
      // 重新启用 Key 时必须检查余额
      if (body.status === 'active') {
        const user = await db.user.findUnique({ where: { id: payload.userId }, select: { balance: true } });
        if (!user || user.balance <= 0) {
          return NextResponse.json({ error: '账户余额不足，无法启用 Key，请先充值' }, { status: 400 });
        }
      }
      updateData.status = body.status;

      // 同步到 new-api
      if (aiKey.newApiTokenId) {
        try {
          await updateNewApiToken(aiKey.newApiTokenId, {
            status: body.status === 'active' ? 1 : 2,
          });
        } catch (e: any) {
          console.error('同步 new-api 状态失败:', e.message);
          return NextResponse.json({
            error: '同步网关状态失败，请检查 new-api 管理认证配置',
            details: e.message,
          }, { status: 502 });
        }
      }
    }

    const updated = await db.aIKey.update({
      where: { id: params.id },
      data: updateData,
      include: { tier: { select: { name: true, displayName: true } } },
    });

    return NextResponse.json({ success: true, key: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 删除 Key
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const aiKey = await db.aIKey.findFirst({
      where: { id: params.id, userId: payload.userId },
    });
    if (!aiKey) return NextResponse.json({ error: 'Key 不存在' }, { status: 404 });

    // 删除 new-api 侧的 token
    if (aiKey.newApiTokenId) {
      try {
        await deleteNewApiToken(aiKey.newApiTokenId);
      } catch (e: any) {
        console.error('删除 new-api token 失败:', e.message);
        return NextResponse.json({
          error: '删除网关 Key 失败，请检查 new-api 管理认证配置',
          details: e.message,
        }, { status: 502 });
      }
    }

    await db.aIKey.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
