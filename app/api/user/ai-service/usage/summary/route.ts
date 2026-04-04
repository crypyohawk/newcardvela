export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../../src/lib/auth';
import { getNewApiTokenUsage, getAllNewApiLogs, mapWithConcurrencyLimit, quotaToUSD } from '../../../../../../src/lib/newapi';

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
      select: { id: true, status: true, newApiTokenId: true, newApiTokenName: true, monthUsed: true, totalUsed: true },
    });

    const activeKeys = keys.filter(k => k.status === 'active').length;

    // 本月起始时间戳
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTimestamp = Math.floor(monthStart.getTime() / 1000);

    // 并行：每个 Key 同时拉取 token 累计用量 + 本月日志
    const results = await mapWithConcurrencyLimit(keys, 4, async (key) => {
      let totalUsed = 0, monthCost = 0, monthRequests = 0;

      // token 累计用量（用于 totalCost）
      if (key.newApiTokenId) {
        try {
          const usage = await getNewApiTokenUsage(key.newApiTokenId);
          totalUsed = quotaToUSD(usage.usedQuota);
        } catch (_) {}
      }

      // 本月日志（用于 monthCost + monthRequests）
      if (key.newApiTokenName) {
        try {
          const logs = await getAllNewApiLogs({
            tokenName: key.newApiTokenName,
            startTimestamp: monthTimestamp,
          });
          monthCost = logs.logs.reduce((s, l) => s + quotaToUSD(l.quota || 0), 0);
          monthRequests = logs.logs.length;
        } catch (_) {}
      }

      return { totalUsed, monthCost, monthRequests };
    });

    const totalCost = results.reduce((s, r) => s + r.totalUsed, 0);
    const monthCostFromLogs = results.reduce((s, r) => s + r.monthCost, 0);
    const monthRequests = results.reduce((s, r) => s + r.monthRequests, 0);
    const localMonthCost = keys.reduce((s, k) => s + (k.monthUsed || 0), 0);
    const localTotalCost = keys.reduce((s, k) => s + (k.totalUsed || 0), 0);
    const monthCost = monthCostFromLogs > 0 ? monthCostFromLogs : localMonthCost;
    const resolvedTotalCost = totalCost > 0 ? totalCost : localTotalCost;

    return NextResponse.json({
      balance: user.balance,
      aiBalance: user.aiBalance,
      monthCost: Math.round(monthCost * 100) / 100,
      totalCost: Math.round(resolvedTotalCost * 100) / 100,
      monthTokens: 0,
      monthRequests,
      totalKeys: keys.length,
      activeKeys,
    });
  } catch (error: any) {
    console.error('获取用量汇总失败:', error);
    return NextResponse.json({ error: '获取用量汇总失败' }, { status: 500 });
  }
}
