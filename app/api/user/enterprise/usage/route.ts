import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';

// 获取企业所有子账户的用量汇总
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.role !== 'enterprise') {
      return NextResponse.json({ error: '仅企业账户可使用此功能' }, { status: 403 });
    }

    // 获取所有子账户 ID
    const subAccounts = await db.enterpriseSubAccount.findMany({
      where: { enterpriseId: payload.userId, isActive: true },
      select: { subUserId: true },
    });
    const subUserIds = subAccounts.map(s => s.subUserId);

    // 加上企业自身
    const allUserIds = [payload.userId, ...subUserIds];

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 本月用量汇总
    const monthUsage = await db.aIUsageLog.aggregate({
      where: {
        userId: { in: allUserIds },
        createdAt: { gte: monthStart },
      },
      _sum: { cost: true, inputTokens: true, outputTokens: true },
      _count: true,
    });

    // 总用量
    const totalUsage = await db.aIUsageLog.aggregate({
      where: { userId: { in: allUserIds } },
      _sum: { cost: true },
      _count: true,
    });

    // 按子账户分组的本月消费
    const perUserUsage = await db.aIUsageLog.groupBy({
      by: ['userId'],
      where: {
        userId: { in: allUserIds },
        createdAt: { gte: monthStart },
      },
      _sum: { cost: true },
      _count: true,
    });

    return NextResponse.json({
      enterpriseBalance: user.balance,
      subAccountCount: subUserIds.length,
      month: {
        cost: Math.round((monthUsage._sum.cost || 0) * 100) / 100,
        tokens: (monthUsage._sum.inputTokens || 0) + (monthUsage._sum.outputTokens || 0),
        requests: monthUsage._count,
      },
      total: {
        cost: Math.round((totalUsage._sum.cost || 0) * 100) / 100,
        requests: totalUsage._count,
      },
      perUser: perUserUsage.map(u => ({
        userId: u.userId,
        monthCost: Math.round((u._sum.cost || 0) * 100) / 100,
        requestCount: u._count,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
