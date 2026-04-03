export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../../src/lib/auth';

// 获取用量汇总（本月消费、余额、Key 数量等）
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    // Key 统计（排除已吊销的 Key）
    const keys = await db.aIKey.findMany({
      where: { userId: payload.userId, status: { not: 'revoked' } },
      select: { id: true, status: true, monthUsed: true, totalUsed: true },
    });

    const activeKeys = keys.filter(k => k.status === 'active').length;
    const monthUsed = keys.reduce((sum, k) => sum + k.monthUsed, 0);
    const totalUsed = keys.reduce((sum, k) => sum + k.totalUsed, 0);

    return NextResponse.json({
      balance: user.balance,
      aiBalance: user.aiBalance,
      monthCost: Math.round(monthUsed * 100) / 100,
      totalCost: Math.round(totalUsed * 100) / 100,
      monthTokens: 0,    // 新计费模式不再单独追踪 token 数
      monthRequests: 0,   // 请求数可在 new-api 后台查看
      totalKeys: keys.length,
      activeKeys,
    });
  } catch (error: any) {
    console.error('获取用量汇总失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
