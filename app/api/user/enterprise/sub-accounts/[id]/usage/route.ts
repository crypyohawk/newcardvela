export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../../../src/lib/auth';

// 获取单个子账户的详细用量（模型分布、时间趋势等）
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user || !['enterprise', 'ADMIN', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: '仅企业账户/管理员可使用此功能' }, { status: 403 });
    }

    // 验证子账户归属
    const subAccount = await db.enterpriseSubAccount.findFirst({
      where: { id: params.id, enterpriseId: payload.userId },
      include: { subUser: { select: { id: true, username: true, email: true } } },
    });
    if (!subAccount) {
      return NextResponse.json({ error: '子账户不存在' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d'; // 7d, 30d, 90d

    const now = new Date();
    let startDate: Date;
    switch (range) {
      case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    }

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const subUserId = subAccount.subUserId;

    // 并行查询各项数据
    const [
      todayUsage,
      weekUsage,
      monthUsage,
      totalUsage,
      modelBreakdown,
      dailyTrend,
    ] = await Promise.all([
      // 今日用量
      db.aIUsageLog.aggregate({
        where: { userId: subUserId, createdAt: { gte: todayStart } },
        _sum: { cost: true, inputTokens: true, outputTokens: true },
        _count: true,
      }),
      // 本周用量
      db.aIUsageLog.aggregate({
        where: { userId: subUserId, createdAt: { gte: weekStart } },
        _sum: { cost: true, inputTokens: true, outputTokens: true },
        _count: true,
      }),
      // 本月用量
      db.aIUsageLog.aggregate({
        where: { userId: subUserId, createdAt: { gte: monthStart } },
        _sum: { cost: true, inputTokens: true, outputTokens: true },
        _count: true,
      }),
      // 总用量
      db.aIUsageLog.aggregate({
        where: { userId: subUserId },
        _sum: { cost: true },
        _count: true,
      }),
      // 按模型分组消费（指定时间范围）
      db.aIUsageLog.groupBy({
        by: ['model'],
        where: { userId: subUserId, createdAt: { gte: startDate } },
        _sum: { cost: true, inputTokens: true, outputTokens: true },
        _count: true,
        orderBy: { _sum: { cost: 'desc' } },
      }),
      // 按天聚合趋势（指定时间范围内的原始日志，前端做聚合）
      db.aIUsageLog.findMany({
        where: { userId: subUserId, createdAt: { gte: startDate } },
        select: { model: true, cost: true, inputTokens: true, outputTokens: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // 将原始日志聚合为按天的趋势数据
    const trendMap: Record<string, { date: string; cost: number; requests: number; tokens: number; models: Record<string, number> }> = {};
    for (const log of dailyTrend) {
      const dateKey = log.createdAt.toISOString().split('T')[0];
      if (!trendMap[dateKey]) {
        trendMap[dateKey] = { date: dateKey, cost: 0, requests: 0, tokens: 0, models: {} };
      }
      trendMap[dateKey].cost += log.cost;
      trendMap[dateKey].requests += 1;
      trendMap[dateKey].tokens += log.inputTokens + log.outputTokens;
      trendMap[dateKey].models[log.model] = (trendMap[dateKey].models[log.model] || 0) + log.cost;
    }
    const trend = Object.values(trendMap);

    return NextResponse.json({
      subAccount: {
        id: subAccount.id,
        user: subAccount.subUser,
        dailyBudget: subAccount.dailyBudget,
        weeklyBudget: subAccount.weeklyBudget,
        monthlyBudget: subAccount.monthlyBudget,
        isActive: subAccount.isActive,
      },
      today: {
        cost: Math.round((todayUsage._sum.cost || 0) * 10000) / 10000,
        requests: todayUsage._count,
        tokens: (todayUsage._sum.inputTokens || 0) + (todayUsage._sum.outputTokens || 0),
      },
      week: {
        cost: Math.round((weekUsage._sum.cost || 0) * 10000) / 10000,
        requests: weekUsage._count,
        tokens: (weekUsage._sum.inputTokens || 0) + (weekUsage._sum.outputTokens || 0),
      },
      month: {
        cost: Math.round((monthUsage._sum.cost || 0) * 10000) / 10000,
        requests: monthUsage._count,
        tokens: (monthUsage._sum.inputTokens || 0) + (monthUsage._sum.outputTokens || 0),
      },
      total: {
        cost: Math.round((totalUsage._sum.cost || 0) * 10000) / 10000,
        requests: totalUsage._count,
      },
      modelBreakdown: modelBreakdown.map(m => ({
        model: m.model,
        cost: Math.round((m._sum.cost || 0) * 10000) / 10000,
        requests: m._count,
        inputTokens: m._sum.inputTokens || 0,
        outputTokens: m._sum.outputTokens || 0,
      })),
      trend,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
