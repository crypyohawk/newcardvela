import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, adminError } from '../../../../src/lib/adminAuth';
import { prisma } from '../../../../src/lib/prisma';

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError('未授权');

  const plans = await prisma.perplexityPlan.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json({ plans });
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError('未授权');

  try {
    const body = await request.json();
    const {
      code, displayName, priceUsd, durationDays, monthlyQuotaUsd,
      payAsYouGoEquivUsd, intro, features, highlight, sortOrder, isActive,
    } = body;

    if (!code || !displayName || priceUsd == null || monthlyQuotaUsd == null) {
      return NextResponse.json({ error: 'code/displayName/priceUsd/monthlyQuotaUsd 必填' }, { status: 400 });
    }

    const plan = await prisma.perplexityPlan.create({
      data: {
        code,
        displayName,
        priceUsd: parseFloat(priceUsd),
        durationDays: durationDays ? parseInt(durationDays) : 30,
        monthlyQuotaUsd: parseFloat(monthlyQuotaUsd),
        payAsYouGoEquivUsd: payAsYouGoEquivUsd != null ? parseFloat(payAsYouGoEquivUsd) : null,
        intro: intro || null,
        features: features || null,
        highlight: !!highlight,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        isActive: isActive !== false,
      },
    });
    return NextResponse.json({ plan });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: '套餐 code 已存在' }, { status: 409 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
