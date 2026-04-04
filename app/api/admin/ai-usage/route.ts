export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyAdmin } from '../../../../src/lib/adminAuth';
import { getAllNewApiLogs, quotaToUSD } from '../../../../src/lib/newapi';

// 全局 AI 用量统计 — 数据从 new-api 日志 + AIKey 聚合字段获取
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ---- 从 new-api 拉取日志（本月，自动分页） ----
    const monthTimestamp = Math.floor(monthStart.getTime() / 1000);
    const todayTimestamp = Math.floor(today.getTime() / 1000);
    const sevenDaysTimestamp = Math.floor(sevenDaysAgo.getTime() / 1000);

    let allMonthLogs: Array<{ quota: number; created_at: number }> = [];
    try {
      const result = await getAllNewApiLogs({ startTimestamp: monthTimestamp });
      allMonthLogs = result.logs;
    } catch (e: any) {
      console.error('[admin-ai-usage] 拉取 new-api 日志失败:', e.message);
    }

    // 今日费用 & 请求数
    const todayLogs = allMonthLogs.filter(l => l.created_at >= todayTimestamp);
    const todayCost = todayLogs.reduce((s, l) => s + quotaToUSD(l.quota || 0), 0);
    const todayRequests = todayLogs.length;

    // 本月费用 & 请求数
    const monthCost = allMonthLogs.reduce((s, l) => s + quotaToUSD(l.quota || 0), 0);
    const monthRequests = allMonthLogs.length;

    // ---- Key 统计（从本地数据库，排除已吊销） ----
    const keyStats = await db.aIKey.groupBy({
      by: ['status'],
      where: { status: { not: 'revoked' } },
      _count: true,
    });
    const totalKeys = keyStats.reduce((s, k) => s + k._count, 0);
    const activeKeys = keyStats.find(k => k.status === 'active')?._count || 0;

    // 累计费用（从 new-api token 用量获取更准确，但这里用 DB 聚合作为参考）
    const totalAgg = await db.aIKey.aggregate({
      where: { status: { not: 'revoked' } },
      _sum: { totalUsed: true },
    });
    const totalCost = totalAgg._sum.totalUsed || 0;

    // 按 Tier 分布
    const tierStats = await db.aIKey.groupBy({
      by: ['tierId'],
      where: { status: { not: 'revoked' } },
      _count: true,
      _sum: { totalUsed: true, monthUsed: true },
    });
    const tiers = await db.aIServiceTier.findMany({ select: { id: true, displayName: true } });
    const tierMap = new Map(tiers.map(t => [t.id, t.displayName]));

    // 7 天每日用量（从 new-api 日志聚合）
    const recentLogs = allMonthLogs.filter(l => l.created_at >= sevenDaysTimestamp);
    const dailyMap = new Map<string, number>();
    for (const log of recentLogs) {
      const day = new Date(log.created_at * 1000).toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + quotaToUSD(log.quota || 0));
    }
    const dailyChart = Array.from(dailyMap.entries())
      .map(([date, cost]) => ({ date, cost: Math.round(cost * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 返回平铺字段，匹配前端读取方式
    return NextResponse.json({
      todayCost: Math.round(todayCost * 100) / 100,
      todayRequests,
      monthCost: Math.round(monthCost * 100) / 100,
      monthRequests,
      totalCost: Math.round(totalCost * 100) / 100,
      totalKeys,
      activeKeys,
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
    console.error('[admin-ai-usage] 失败:', error);
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
