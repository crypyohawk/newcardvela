export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';

// 获取企业所有 Key 的用量汇总（按员工 Key 分组）
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

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 获取企业自身所有 Key
    const keys = await db.aIKey.findMany({
      where: { userId: payload.userId },
      select: { id: true, keyName: true, status: true, monthUsed: true, totalUsed: true, monthlyLimit: true, lastUsedAt: true },
    });

    // 本月用量汇总
    const monthUsage = await db.aIUsageLog.aggregate({
      where: {
        userId: payload.userId,
        createdAt: { gte: monthStart },
      },
      _sum: { cost: true, inputTokens: true, outputTokens: true },
      _count: true,
    });

    // 总用量
    const totalUsage = await db.aIUsageLog.aggregate({
      where: { userId: payload.userId },
      _sum: { cost: true },
      _count: true,
    });

    // 按 Key 分组的本月消费
    const perKeyUsage = await db.aIUsageLog.groupBy({
      by: ['aiKeyId'],
      where: {
        userId: payload.userId,
        createdAt: { gte: monthStart },
      },
      _sum: { cost: true },
      _count: true,
    });

    // 匹配 Key 名称
    const keyMap = new Map(keys.map(k => [k.id, k]));
    const perKey = perKeyUsage.map(u => {
      const key = keyMap.get(u.aiKeyId);
      return {
        keyId: u.aiKeyId,
        keyName: key?.keyName || '未知',
        monthCost: Math.round((u._sum.cost || 0) * 10000) / 10000,
        requestCount: u._count,
        monthlyLimit: key?.monthlyLimit || null,
        status: key?.status || 'unknown',
      };
    });

    return NextResponse.json({
      enterpriseBalance: user.balance,
      keyCount: keys.length,
      month: {
        cost: Math.round((monthUsage._sum.cost || 0) * 10000) / 10000,
        tokens: (monthUsage._sum.inputTokens || 0) + (monthUsage._sum.outputTokens || 0),
        requests: monthUsage._count,
      },
      total: {
        cost: Math.round((totalUsage._sum.cost || 0) * 10000) / 10000,
        requests: totalUsage._count,
      },
      perKey,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
