export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';
import { quotaToUSD } from '../../../../../src/lib/newapi';

// 获取用量数据 — 直接从 new-api 日志拉取（new-api 自带完整计费规则）
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
    // 查出用户的所有 Key ID（用于匹配本地按天聚合）
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

    const dailyStats = await db.aIKeyDailyStat.findMany({
      where: {
        aiKeyId: { in: keys.map((key) => key.id) },
        date: { gte: new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())) },
      },
      orderBy: { date: 'asc' },
    });

    let totalCost = 0;
    let totalTokens = 0;
    const dailyMap = new Map<string, { cost: number; inputTokens: number; outputTokens: number; count: number }>();

    for (const stat of dailyStats) {
      const cost = stat.cost || 0;
      const input = stat.promptTokens || 0;
      const output = stat.completionTokens || 0;
      totalCost += cost;
      totalTokens += input + output;

      const day = stat.date.toISOString().slice(0, 10);
      const existing = dailyMap.get(day) || { cost: 0, inputTokens: 0, outputTokens: 0, count: 0 };
      existing.cost += cost;
      existing.inputTokens += input;
      existing.outputTokens += output;
      existing.count += stat.requestCount || 0;
      dailyMap.set(day, existing);
    }

    const daily = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
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
