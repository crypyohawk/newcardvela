import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyAdmin, adminError } from '../../../../src/lib/adminAuth';

// 获取所有充值订单
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError('未授权');

  try {
    // 获取汇率配置
    let exchangeRate = 7.2;
    try {
      const rateConfig = await db.systemConfig.findUnique({
        where: { key: 'recharge_usd_cny_rate' },
      });
      if (rateConfig) {
        exchangeRate = parseFloat(rateConfig.value) || 7.2;
      }
    } catch (e) {
      console.log('获取汇率配置失败，使用默认值 7.2');
    }

    const orders = await db.transaction.findMany({
      where: { 
        type: 'recharge',
        status: { not: 'pending' },  // 不显示未提交凭证的订单
      },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,  // 最多返回200条，避免数据量过大
    });

    // 为每个订单添加人民币金额
    const ordersWithCNY = orders.map(order => ({
      ...order,
      cnyAmount: Math.ceil(order.amount * exchangeRate),
      exchangeRate: exchangeRate,
    }));

    return NextResponse.json({ orders: ordersWithCNY, exchangeRate });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 订单操作（确认/拒绝）
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError('未授权');

  try {
    const body = await request.json();
    const { action, orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: '订单ID不能为空' }, { status: 400 });
    }

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

      // ✅ 原子性状态检查+更新+加余额，防止并发重复确认
      const result = await db.$transaction(async (tx) => {
        const updated = await tx.transaction.updateMany({
          where: {
            id: orderId,
            status: { in: ['processing', 'pending'] },
          },
          data: { status: 'completed' },
        });

        if (updated.count === 0) {
          throw new Error('ORDER_ALREADY_PROCESSED');
        }

        await tx.user.update({
          where: { id: order.userId },
          data: { balance: { increment: order.amount } },
        });

        return updated;
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
    if (error.message === 'ORDER_ALREADY_PROCESSED') {
      return NextResponse.json({ error: '订单已处理，请勿重复操作' }, { status: 409 });
    }
    console.error('[管理后台] 订单操作失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
