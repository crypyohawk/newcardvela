export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';
import { getAllNewApiLogs, mapWithConcurrencyLimit, quotaToUSD } from '../../../../../src/lib/newapi';

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
    const startTimestamp = Math.floor(startDate.getTime() / 1000);

    // 查出用户的所有 Key 的 newApiTokenName（用于匹配 new-api 日志）
    const keyWhere: any = { userId: payload.userId, status: { not: 'revoked' }, newApiTokenName: { not: null } };
    if (keyId) keyWhere.id = keyId;
    const keys = await db.aIKey.findMany({
      where: keyWhere,
      select: { id: true, newApiTokenName: true, keyName: true },
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

    // 并行拉取每个 Key 的日志（带自动分页）
    const logResults = await mapWithConcurrencyLimit(keys, 4, async (key) => {
        try {
          return await getAllNewApiLogs({
            tokenName: key.newApiTokenName!,
            startTimestamp,
          });
        } catch (_) {
          return { logs: [], total: 0, truncated: false };
        }
      });

    const allLogs = logResults.flatMap(r => r.logs);

    // 聚合统计
    let totalCost = 0;
    let totalTokens = 0;
    const dailyMap = new Map<string, { cost: number; inputTokens: number; outputTokens: number; count: number }>();
    const modelMap = new Map<string, { cost: number; count: number }>();

    for (const log of allLogs) {
      const cost = quotaToUSD(log.quota || 0);
      const input = log.prompt_tokens || 0;
      const output = log.completion_tokens || 0;
      totalCost += cost;
      totalTokens += input + output;

      // 按天
      const day = new Date(log.created_at * 1000).toISOString().slice(0, 10);
      const existing = dailyMap.get(day) || { cost: 0, inputTokens: 0, outputTokens: 0, count: 0 };
      existing.cost += cost;
      existing.inputTokens += input;
      existing.outputTokens += output;
      existing.count += 1;
      dailyMap.set(day, existing);

      // 按模型
      const model = log.model_name || 'unknown';
      const mExisting = modelMap.get(model) || { cost: 0, count: 0 };
      mExisting.cost += cost;
      mExisting.count += 1;
      modelMap.set(model, mExisting);
    }

    const daily = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const byModel = Array.from(modelMap.entries())
      .map(([model, data]) => ({
        model,
        cost: Math.round(data.cost * 100) / 100,
        count: data.count,
      }))
      .sort((a, b) => b.cost - a.cost);

    return NextResponse.json({
      period,
      totalCost: Math.round(totalCost * 100) / 100,
      totalTokens,
      totalRequests: allLogs.length,
      daily,
      byModel,
    });
  } catch (error: any) {
    console.error('获取用量失败:', error);
    return NextResponse.json({ error: '获取用量失败' }, { status: 500 });
  }
}
