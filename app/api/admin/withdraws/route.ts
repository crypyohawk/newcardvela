import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyAdmin, adminError } from '../../../../src/lib/adminAuth';

// 获取所有提现订单
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError('未授权');

  try {
    const orders = await db.transaction.findMany({
      where: { type: 'withdraw' },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,  // 最多返回200条
    });
    return NextResponse.json({ orders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 处理提现订单
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError('未授权');

  try {
    const body = await request.json();
    const { orderId, action } = body;

    const order = await db.transaction.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    if (order.status !== 'pending') {
      return NextResponse.json({ error: '订单已处理' }, { status: 400 });
    }

    if (action === 'confirm') {
      // 确认提现 - 订单已经扣款了，只需更新状态
      await db.transaction.update({
        where: { id: orderId },
        data: { status: 'completed' },
      });

      return NextResponse.json({ success: true, message: '提现已确认' });
    }

    if (action === 'reject') {
      // 拒绝提现 - 退还用户余额
      await db.user.update({
        where: { id: order.userId },
        data: { balance: { increment: order.amount } },
      });

      await db.transaction.update({
        where: { id: orderId },
        data: { status: 'failed' },
      });

      return NextResponse.json({ success: true, message: '提现已拒绝，余额已退还' });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
