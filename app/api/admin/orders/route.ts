export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyAdmin, adminError } from '../../../../src/lib/adminAuth';

// 获取充值订单（支持分页、状态筛选）
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError('未授权');

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));
    const statusFilter = searchParams.get('status') || 'pending_review'; // pending_review | all | completed | failed
    const skip = (page - 1) * pageSize;

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

    // 构建筛选条件
    const where: any = {
      type: 'recharge',
      status: { not: 'pending' },  // 不显示未提交凭证的订单
    };

    if (statusFilter === 'pending_review') {
      where.status = 'processing';
    } else if (statusFilter === 'completed') {
      where.status = 'completed';
    } else if (statusFilter === 'failed') {
      where.status = 'failed';
    }
    // 'all' 保持 status: { not: 'pending' }

    // 并行查询：订单列表 + 总数 + 各状态计数
    const [orders, total, pendingCount] = await Promise.all([
      db.transaction.findMany({
        where,
        select: {
          id: true,
          userId: true,
          type: true,
          amount: true,
          status: true,
          paymentMethod: true,
          paymentNetwork: true,
          // 排除 paymentProof 和 txHash 大字段，仅返回是否存在
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, username: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      db.transaction.count({ where }),
      db.transaction.count({ where: { type: 'recharge', status: 'processing' } }),
    ]);

    // 单独查询哪些订单有凭证（只查布尔值，不拉内容）
    const orderIds = orders.map(o => o.id);
    const proofFlags = orderIds.length > 0
      ? await db.$queryRawUnsafe<Array<{ id: string; has_tx: boolean; has_proof: boolean }>>(
          `SELECT id, ("txHash" IS NOT NULL AND "txHash" != '') as has_tx, ("paymentProof" IS NOT NULL AND "paymentProof" != '') as has_proof FROM "Transaction" WHERE id IN (${orderIds.map((_, i) => `$${i + 1}`).join(',')})`,
          ...orderIds
        )
      : [];

    const proofMap = new Map(proofFlags.map(p => [p.id, { hasTxHash: !!p.has_tx, hasPaymentProof: !!p.has_proof }]));

    // 为每个订单添加人民币金额和凭证标记
    const ordersWithExtra = orders.map(order => ({
      ...order,
      cnyAmount: order.paymentMethod === 'usdt' 
        ? null
        : Math.ceil(order.amount * exchangeRate),
      exchangeRate,
      hasTxHash: proofMap.get(order.id)?.hasTxHash || false,
      hasPaymentProof: proofMap.get(order.id)?.hasPaymentProof || false,
    }));

    return NextResponse.json({
      orders: ordersWithExtra,
      exchangeRate,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      pendingCount,
    });
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
