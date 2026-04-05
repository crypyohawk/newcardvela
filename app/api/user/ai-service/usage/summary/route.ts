export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../../src/lib/auth';

// 获取用量汇总（本月消费、余额、Key 数量等）
// 汇总口径统一以平台数据库中的聚合字段为准，避免与 new-api 当前 token 生命周期统计混用。
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
      select: {
        id: true,
        status: true,
        newApiTokenId: true,
        monthUsed: true,
        totalUsed: true,
        monthRequestCount: true,
        monthPromptTokens: true,
        monthCompletionTokens: true,
      },
    });

    const activeKeys = keys.filter(k => k.status === 'active').length;
    const localMonthCost = keys.reduce((s, k) => s + (k.monthUsed || 0), 0);
    const localTotalCost = keys.reduce((s, k) => s + (k.totalUsed || 0), 0);
    const monthRequests = keys.reduce((s, k) => s + (k.monthRequestCount || 0), 0);
    const monthTokens = keys.reduce((s, k) => s + (k.monthPromptTokens || 0) + (k.monthCompletionTokens || 0), 0);

    return NextResponse.json({
      balance: user.balance,
      aiBalance: user.aiBalance,
      monthCost: Math.round(localMonthCost * 100) / 100,
      totalCost: Math.round(localTotalCost * 100) / 100,
      monthTokens: Math.round(monthTokens),
      monthRequests,
      totalKeys: keys.length,
      activeKeys,
    });
  } catch (error: any) {
    console.error('获取用量汇总失败:', error);
    return NextResponse.json({ error: '获取用量汇总失败' }, { status: 500 });
  }
}
