export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../src/lib/db';
import { verifyAdmin, adminError } from '../../../../../../src/lib/adminAuth';

// 获取单个订单的凭证详情（paymentProof + txHash）
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError('未授权');

  try {
    const order = await db.transaction.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        txHash: true,
        paymentProof: true,
        type: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    return NextResponse.json({
      id: order.id,
      txHash: order.txHash,
      paymentProof: order.paymentProof,
      type: order.type,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
