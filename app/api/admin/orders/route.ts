import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyAdmin, adminError } from '../../../../src/lib/adminAuth';

// 获取所有充值订单
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError();

  try {
    const orders = await db.transaction.findMany({
      where: { type: 'recharge' },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ orders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 订单操作（确认/拒绝）
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError();

  try {
    const body = await request.json();
    const { action, orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: '订单ID不能为空' }, { status: 400 });
    }

    // 使用 Transaction 模型
    const order = await db.transaction.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    if (action === 'confirm') {
      if (order.status !== 'processing' && order.status !== 'pending') {
        return NextResponse.json({ error: '订单状态不可操作' }, { status: 400 });
      }

      // 更新订单状态
      await db.transaction.update({
        where: { id: orderId },
        data: { status: 'completed' },
      });

      // 增加用户余额
      await db.user.update({
        where: { id: order.userId },
        data: { balance: { increment: order.amount } },
      });

      console.log('[管理后台] 订单确认成功:', orderId, '金额:', order.amount);

      return NextResponse.json({ success: true, message: '充值已确认' });
    }

    if (action === 'reject') {
      await db.transaction.update({
        where: { id: orderId },
        data: { status: 'failed' },
      });

      console.log('[管理后台] 订单拒绝:', orderId);

      return NextResponse.json({ success: true, message: '订单已拒绝' });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error: any) {
    console.error('[管理后台] 订单操作失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
