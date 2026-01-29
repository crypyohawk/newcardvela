import { NextRequest, NextResponse } from 'next/server';
import { getCards, quickApplyCard } from '../../../../src/lib/gsalary';
import { verifyToken, getTokenFromRequest } from '../../../../src/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: '无效的令牌' }, { status: 401 });
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
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: '无效的令牌' }, { status: 401 });
    }

    const body = await request.json();
    const { product_code, amount, quantity } = body;

    if (!product_code || amount === undefined) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const results = [];
    const count = quantity || 1;

    for (let i = 0; i < count; i++) {
      const result = await quickApplyCard({
        product_code,
        init_balance: Math.round(amount * 100),
      });
      results.push(result);
    }

    return NextResponse.json({ success: true, cards: results });
  } catch (error: any) {
    console.error('开卡失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
