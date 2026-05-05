import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, adminError } from '../../../../../src/lib/adminAuth';
import { prisma } from '../../../../../src/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError('未授权');
  const plan = await prisma.perplexityPlan.findUnique({ where: { id: params.id } });
  if (!plan) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ plan });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError('未授权');

  try {
    const body = await request.json();
    const data: any = {};
    const allow = ['code', 'displayName', 'priceUsd', 'durationDays', 'monthlyQuotaUsd',
      'payAsYouGoEquivUsd', 'intro', 'features', 'highlight', 'sortOrder', 'isActive'];
    for (const k of allow) {
      if (body[k] === undefined) continue;
      if (['priceUsd', 'monthlyQuotaUsd', 'payAsYouGoEquivUsd'].includes(k)) {
        data[k] = body[k] === null || body[k] === '' ? null : parseFloat(body[k]);
      } else if (['durationDays', 'sortOrder'].includes(k)) {
        data[k] = parseInt(body[k]);
      } else if (['highlight', 'isActive'].includes(k)) {
        data[k] = !!body[k];
      } else {
        data[k] = body[k];
      }
    }
    const plan = await prisma.perplexityPlan.update({ where: { id: params.id }, data });
    return NextResponse.json({ plan });
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (e.code === 'P2002') return NextResponse.json({ error: 'code 冲突' }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError('未授权');
  try {
    await prisma.perplexityPlan.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (e.code === 'P2003') return NextResponse.json({ error: '该套餐已有用户订阅，请先停用' }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
