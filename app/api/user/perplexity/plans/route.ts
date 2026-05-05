import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../../src/lib/auth';
import { prisma } from '../../../../../src/lib/prisma';

// 用户端：列出可订阅的 Cardvela Pro 套餐
export async function GET(request: NextRequest) {
  const user = await verifyAuth(request);
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const plans = await prisma.perplexityPlan.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { priceUsd: 'asc' }],
  });
  return NextResponse.json({ plans });
}
