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

    // 获取日志
    const logs = await db.aIUsageLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    // 按天聚合
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

    // 按模型聚合
    const modelMap = new Map<string, { cost: number; count: number }>();
    for (const log of logs) {
      const existing = modelMap.get(log.model) || { cost: 0, count: 0 };
      existing.cost += log.cost;
      existing.count += 1;
      modelMap.set(log.model, existing);
    }
    const byModel = Array.from(modelMap.entries())
      .map(([model, data]) => ({ model, ...data }));

    // 汇总
    const totalCost = logs.reduce((sum, l) => sum + l.cost, 0);
    const totalTokens = logs.reduce((sum, l) => sum + l.inputTokens + l.outputTokens, 0);

    return NextResponse.json({
      period,
      totalCost: Math.round(totalCost * 100) / 100,
      totalTokens,
      totalRequests: logs.length,
      daily,
      byModel,
    });
  } catch (error: any) {
    console.error('获取用量失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
