export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';
import { getNewApiTokenUsage, getAllNewApiLogs, mapWithConcurrencyLimit, quotaToUSD } from '../../../../../src/lib/newapi';

// 获取企业所有 Key 的用量汇总（按员工 Key 分组）
// 数据来源：new-api token 用量 + 日志（new-api 自带计费规则）
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user || !['enterprise', 'ADMIN', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: '仅企业账户/管理员可使用此功能' }, { status: 403 });
    }

    // 获取企业自身所有有效 Key（排除已删除/吊销的）
    const keys = await db.aIKey.findMany({
      where: { userId: payload.userId, status: { not: 'revoked' } },
      select: {
        id: true, keyName: true, label: true, status: true,
        monthlyLimit: true, lastUsedAt: true,
        newApiTokenId: true, newApiTokenName: true,
      },
    });

    // 本月起始时间戳
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTimestamp = Math.floor(monthStart.getTime() / 1000);

    // 并行拉取每个 Key 的 token 累计用量 + 本月日志
    let totalMonthCost = 0;
    let totalMonthRequests = 0;
    let totalAllTimeCost = 0;
    let totalAllTimeRequests = 0;

    const perKey = await mapWithConcurrencyLimit(keys, 4, async (key) => {
      let allTimeCost = 0, allTimeRequests = 0;
      let monthCost = 0, monthRequests = 0;

      // token 累计用量
      if (key.newApiTokenId) {
        try {
          const usage = await getNewApiTokenUsage(key.newApiTokenId);
          allTimeCost = quotaToUSD(usage.usedQuota);
          allTimeRequests = usage.requestCount || 0;
        } catch (_) {}
      }

      // 本月日志
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

      totalMonthCost += monthCost;
      totalMonthRequests += monthRequests;
      totalAllTimeCost += allTimeCost;
      totalAllTimeRequests += allTimeRequests;

      return {
        keyId: key.id,
        keyName: key.keyName,
        label: key.label || null,
        monthCost: Math.round(monthCost * 10000) / 10000,
        requestCount: monthRequests,
        monthlyLimit: key.monthlyLimit || null,
        status: key.status,
      };
    });

    return NextResponse.json({
      enterpriseBalance: user.balance,
      keyCount: keys.length,
      month: {
        cost: Math.round(totalMonthCost * 10000) / 10000,
        tokens: 0,
        requests: totalMonthRequests,
      },
      total: {
        cost: Math.round(totalAllTimeCost * 10000) / 10000,
        requests: totalAllTimeRequests,
      },
      perKey,
    });
  } catch (error: any) {
    console.error('获取企业用量失败:', error);
    return NextResponse.json({ error: '获取企业用量失败' }, { status: 500 });
  }
}
