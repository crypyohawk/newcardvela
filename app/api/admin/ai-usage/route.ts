import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyAdmin } from '../../../../src/lib/adminAuth';

// 全局 AI 用量统计
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 今日统计
    const todayStats = await db.aIUsageLog.aggregate({
      where: { createdAt: { gte: today } },
      _sum: { cost: true, inputTokens: true, outputTokens: true },
      _count: true,
    });

    // 本月统计
    const monthStats = await db.aIUsageLog.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { cost: true, inputTokens: true, outputTokens: true },
      _count: true,
    });

    // 总统计
    const totalStats = await db.aIUsageLog.aggregate({
      _sum: { cost: true },
      _count: true,
    });

    // Key 统计
    const keyStats = await db.aIKey.groupBy({
      by: ['status'],
      _count: true,
    });

    // 按 Tier 分布
    const tierStats = await db.aIKey.groupBy({
      by: ['tierId'],
      _count: true,
      _sum: { totalUsed: true, monthUsed: true },
    });

    const tiers = await db.aIServiceTier.findMany({
      select: { id: true, displayName: true },
    });
    const tierMap = new Map(tiers.map(t => [t.id, t.displayName]));

    // 最近 7 天每日用量
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentLogs = await db.aIUsageLog.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { cost: true, createdAt: true },
    });

    const dailyMap = new Map<string, number>();
    for (const log of recentLogs) {
      const day = log.createdAt.toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + log.cost);
    }
    const dailyChart = Array.from(dailyMap.entries())
      .map(([date, cost]) => ({ date, cost: Math.round(cost * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      today: {
        cost: Math.round((todayStats._sum.cost || 0) * 100) / 100,
        requests: todayStats._count,
        tokens: (todayStats._sum.inputTokens || 0) + (todayStats._sum.outputTokens || 0),
      },
      month: {
        cost: Math.round((monthStats._sum.cost || 0) * 100) / 100,
        requests: monthStats._count,
        tokens: (monthStats._sum.inputTokens || 0) + (monthStats._sum.outputTokens || 0),
      },
      total: {
        cost: Math.round((totalStats._sum.cost || 0) * 100) / 100,
        requests: totalStats._count,
      },
      keys: keyStats.map(k => ({ status: k.status, count: k._count })),
      byTier: tierStats.map(t => ({
        tier: tierMap.get(t.tierId) || t.tierId,
        keyCount: t._count,
        monthUsed: Math.round((t._sum.monthUsed || 0) * 100) / 100,
        totalUsed: Math.round((t._sum.totalUsed || 0) * 100) / 100,
      })),
      dailyChart,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
