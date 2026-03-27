export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';

// 获取用量数据
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d'; // 7d | 30d | month
    const keyId = searchParams.get('keyId'); // 可选：按 Key 筛选

    // 计算时间范围
    const now = new Date();
    let startDate: Date;
    if (period === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const where: any = {
      userId: payload.userId,
      createdAt: { gte: startDate },
    };
    if (keyId) where.aiKeyId = keyId;

    // 总量聚合（数据库端完成，不受条数限制）
    const totals = await db.aIUsageLog.aggregate({
      where,
      _sum: { cost: true, inputTokens: true, outputTokens: true },
      _count: true,
    });

    // 按模型聚合
    const byModelRaw = await db.aIUsageLog.groupBy({
      by: ['model'],
      where,
      _sum: { cost: true },
      _count: true,
    });
    const byModel = byModelRaw.map(m => ({
      model: m.model,
      cost: Math.round((m._sum.cost || 0) * 100) / 100,
      count: m._count,
    }));

    // 按天聚合：取最近日志做内存聚合（保留前端图表所需格式）
    const logs = await db.aIUsageLog.findMany({
      where,
      select: { createdAt: true, cost: true, inputTokens: true, outputTokens: true },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const dailyMap = new Map<string, { cost: number; inputTokens: number; outputTokens: number; count: number }>();
    for (const log of logs) {
      const day = log.createdAt.toISOString().slice(0, 10);
      const existing = dailyMap.get(day) || { cost: 0, inputTokens: 0, outputTokens: 0, count: 0 };
      existing.cost += log.cost;
      existing.inputTokens += log.inputTokens;
      existing.outputTokens += log.outputTokens;
      existing.count += 1;
      dailyMap.set(day, existing);
    }

    const daily = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      period,
      totalCost: Math.round((totals._sum.cost || 0) * 100) / 100,
      totalTokens: (totals._sum.inputTokens || 0) + (totals._sum.outputTokens || 0),
      totalRequests: totals._count,
      daily,
      byModel,
    });
  } catch (error: any) {
    console.error('获取用量失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
