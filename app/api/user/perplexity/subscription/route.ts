import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../../src/lib/auth';
import { prisma } from '../../../../../src/lib/prisma';

// GET 当前激活订阅 + 历史
export async function GET(request: NextRequest) {
  const user = await verifyAuth(request);
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const now = new Date();
  const active = await prisma.perplexitySubscription.findFirst({
    where: { userId: user.id, status: 'active', expiresAt: { gt: now } },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  });

  const history = await prisma.perplexitySubscription.findMany({
    where: { userId: user.id },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return NextResponse.json({
    active,
    history,
    aiBalance: user.aiBalance,
  });
}

// POST 开通订阅（从 aiBalance 扣费）
export async function POST(request: NextRequest) {
  const user = await verifyAuth(request);
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const { planId } = await request.json();
    if (!planId) return NextResponse.json({ error: '缺少 planId' }, { status: 400 });

    const plan = await prisma.perplexityPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: '套餐不存在或已下架' }, { status: 404 });
    }

    // 检查是否已有未过期订阅
    const now = new Date();
    const existing = await prisma.perplexitySubscription.findFirst({
      where: { userId: user.id, status: 'active', expiresAt: { gt: now } },
    });
    if (existing) {
      return NextResponse.json({
        error: '你已有进行中的 Cardvela Pro 订阅，到期后可续订',
        existing: { expiresAt: existing.expiresAt },
      }, { status: 409 });
    }

    // 余额检查
    if (user.aiBalance < plan.priceUsd) {
      return NextResponse.json({
        error: 'AI 余额不足',
        needRecharge: true,
        balance: user.aiBalance,
        required: plan.priceUsd,
        shortfall: +(plan.priceUsd - user.aiBalance).toFixed(4),
      }, { status: 402 });
    }

    const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 3600 * 1000);

    // 事务：扣费 + 创建订阅
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.id, aiBalance: { gte: plan.priceUsd } },
        data: { aiBalance: { decrement: plan.priceUsd } },
      });
      const sub = await tx.perplexitySubscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          pricePaidUsd: plan.priceUsd,
          quotaTotalUsd: plan.monthlyQuotaUsd,
          quotaUsedUsd: 0,
          startAt: now,
          expiresAt,
          status: 'active',
        },
        include: { plan: true },
      });
      return { sub, balance: updated.aiBalance };
    });

    return NextResponse.json({
      ok: true,
      subscription: result.sub,
      balance: result.balance,
      message: `成功开通 ${plan.displayName}，扣费 $${plan.priceUsd}`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
