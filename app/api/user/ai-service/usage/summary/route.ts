export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../../src/lib/auth';
import { getNewApiTokenUsage, mapWithConcurrencyLimit, quotaToUSD } from '../../../../../../src/lib/newapi';

// 获取用量汇总（本月消费、余额、Key 数量等）
// 数据来源：new-api token 的 used_quota + 日志（new-api 自带计费规则）
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

    // 本月起始时间戳
    const now = new Date();
    // 并行：每个 Key 仅拉取 token 累计用量，本月请求数/tokens 走本地聚合
    const results = await mapWithConcurrencyLimit(keys, 4, async (key) => {
      let totalUsed = 0;

      if (key.newApiTokenId) {
        try {
          const usage = await getNewApiTokenUsage(key.newApiTokenId);
          totalUsed = quotaToUSD(usage.usedQuota);
        } catch (_) {}
      }

      return { totalUsed };
    });

    const totalCost = results.reduce((s, r) => s + r.totalUsed, 0);
    const localMonthCost = keys.reduce((s, k) => s + (k.monthUsed || 0), 0);
    const localTotalCost = keys.reduce((s, k) => s + (k.totalUsed || 0), 0);
    const monthRequests = keys.reduce((s, k) => s + (k.monthRequestCount || 0), 0);
    const monthTokens = keys.reduce((s, k) => s + (k.monthPromptTokens || 0) + (k.monthCompletionTokens || 0), 0);
    const monthCost = localMonthCost;
    const resolvedTotalCost = totalCost > 0 ? totalCost : localTotalCost;

    return NextResponse.json({
      balance: user.balance,
      aiBalance: user.aiBalance,
      monthCost: Math.round(monthCost * 100) / 100,
      totalCost: Math.round(resolvedTotalCost * 100) / 100,
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
