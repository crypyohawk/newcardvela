export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCards, quickApplyCard } from '../../../../src/lib/gsalary';
import { verifyToken, getTokenFromRequest } from '../../../../src/lib/auth';
import { getNormalizedInitialAmount } from '../../../../src/lib/cardOpening';
import { db } from '../../../../src/lib/db';

async function requireAdmin(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await db.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.role !== 'admin') return null;
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: '无管理员权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await getCards({ page, limit });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('获取卡片失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: '无管理员权限' }, { status: 403 });
    }

    const body = await request.json();
    const { product_code, amount, quantity } = body;

    if (!product_code || amount === undefined) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const results = [];
    const count = quantity || 1;
    const normalizedAmount = getNormalizedInitialAmount(product_code, Number(amount) || 0);

    for (let i = 0; i < count; i++) {
      const result = await quickApplyCard({
        product_code,
        init_balance: Math.round(normalizedAmount * 100),
      });
      results.push(result);
    }

    return NextResponse.json({ success: true, cards: results });
  } catch (error: any) {
    console.error('开卡失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
