export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';

// 获取用量数据 — 从实际扣费记录 + 按天统计聚合
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

    const keyWhere: any = { userId: payload.userId, status: { not: 'revoked' } };
    if (keyId) keyWhere.id = keyId;
    const keys = await db.aIKey.findMany({
      where: keyWhere,
      select: { id: true },
    });

    if (keys.length === 0) {
      return NextResponse.json({
        period,
        totalCost: 0,
        totalTokens: 0,
        totalRequests: 0,
        daily: [],
        byModel: [],
      });
    }

    // 从实际扣费记录（transaction）聚合每日费用 — 保证与用户余额变动一致
    const transactions = await db.transaction.findMany({
      where: {
        userId: payload.userId,
        type: 'ai_usage',
        status: 'completed',
        createdAt: { gte: startDate },
      },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const txDailyMap = new Map<string, number>();
    for (const tx of transactions) {
      const day = tx.createdAt.toISOString().slice(0, 10);
      txDailyMap.set(day, (txDailyMap.get(day) || 0) + Math.abs(tx.amount));
    }

    // 从 AIKeyDailyStat 取请求次数和 token 数（这些统计是准确的）
    const dailyStats = await db.aIKeyDailyStat.findMany({
      where: {
        aiKeyId: { in: keys.map((key) => key.id) },
        date: { gte: new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())) },
      },
      orderBy: { date: 'asc' },
    });

    let totalTokens = 0;
    const statDailyMap = new Map<string, { inputTokens: number; outputTokens: number; count: number }>();
    for (const stat of dailyStats) {
      const input = stat.promptTokens || 0;
      const output = stat.completionTokens || 0;
      totalTokens += input + output;

      const day = stat.date.toISOString().slice(0, 10);
      const existing = statDailyMap.get(day) || { inputTokens: 0, outputTokens: 0, count: 0 };
      existing.inputTokens += input;
      existing.outputTokens += output;
      existing.count += stat.requestCount || 0;
      statDailyMap.set(day, existing);
    }

    // 合并：费用用 transaction，请求/tokens 用 dailyStat
    const allDays = new Set([...txDailyMap.keys(), ...statDailyMap.keys()]);
    let totalCost = 0;
    const daily = Array.from(allDays)
      .map((date) => {
        const cost = txDailyMap.get(date) || 0;
        const stats = statDailyMap.get(date) || { inputTokens: 0, outputTokens: 0, count: 0 };
        totalCost += cost;
        return { date, cost: Math.round(cost * 10000) / 10000, ...stats };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      period,
      totalCost: Math.round(totalCost * 100) / 100,
      totalTokens,
      totalRequests: daily.reduce((sum, item) => sum + item.count, 0),
      daily,
      byModel: [],
    });
  } catch (error: any) {
    console.error('获取用量失败:', error);
    return NextResponse.json({ error: '获取用量失败' }, { status: 500 });
  }
}
