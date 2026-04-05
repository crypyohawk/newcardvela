export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';
import { mapWithConcurrencyLimit } from '../../../../../src/lib/newapi';

// 获取企业所有 Key 的用量汇总（按员工 Key 分组）
// 汇总口径统一以平台数据库中的聚合字段为准，避免与 new-api 当前 token 生命周期统计混用。
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
        monthlyLimit: true, lastUsedAt: true, monthUsed: true, totalUsed: true,
        monthRequestCount: true, totalRequestCount: true,
        monthPromptTokens: true, monthCompletionTokens: true,
        newApiTokenId: true,
      },
    });

    // 并行聚合每个 Key 的本地累计字段
    let totalMonthCost = 0;
    let totalMonthRequests = 0;
    let totalMonthTokens = 0;
    let totalAllTimeCost = 0;
    let totalAllTimeRequests = 0;

    const perKey = await mapWithConcurrencyLimit(keys, 4, async (key) => {
      const allTimeCost = key.totalUsed || 0;
      const allTimeRequests = key.totalRequestCount || 0;
      const monthCost = key.monthUsed || 0;
      const monthRequests = key.monthRequestCount || 0;
      const monthTokens = (key.monthPromptTokens || 0) + (key.monthCompletionTokens || 0);

      totalMonthCost += monthCost;
      totalMonthRequests += monthRequests;
      totalMonthTokens += monthTokens;
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
        tokens: Math.round(totalMonthTokens),
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
