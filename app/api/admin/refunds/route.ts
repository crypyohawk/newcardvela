import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyAdmin, adminError } from '../../../../src/lib/adminAuth';
import { rechargeCard } from '../../../../src/lib/gsalary';

// 获取所有退款记录
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError();

  try {
    const refunds = await db.transaction.findMany({
      where: { type: 'refund_hold' },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ refunds });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 处理退款（返还给用户）
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError();

  try {
    const body = await request.json();
    const { refundId, action, returnAmount } = body;

    const refund = await db.transaction.findUnique({
      where: { id: refundId },
      include: { user: true },
    });

    if (!refund) {
      return NextResponse.json({ error: '退款记录不存在' }, { status: 404 });
    }

    if (refund.status !== 'pending') {
      return NextResponse.json({ error: '该退款已处理' }, { status: 400 });
    }

    if (action === 'return') {
      // 返还给用户卡片
      const userCard = await db.userCard.findFirst({
        where: { userId: refund.userId },
        orderBy: { createdAt: 'desc' },
      });

      if (!userCard || !userCard.gsalaryCardId) {
        return NextResponse.json({ error: '未找到用户卡片' }, { status: 400 });
      }

      const amountToReturn = returnAmount || refund.amount;

      // 调用上游充值卡片
      await rechargeCard(userCard.gsalaryCardId, amountToReturn);

      // 更新记录状态
      await db.transaction.update({
        where: { id: refundId },
        data: { 
          status: 'completed',
          paymentProof: `返还金额: $${amountToReturn}`,
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: `已返还 $${amountToReturn} 到用户卡片` 
      });
    }

    if (action === 'reject') {
      // 拒绝返还（钱留在商户）
      await db.transaction.update({
        where: { id: refundId },
        data: { status: 'failed' },
      });

      return NextResponse.json({ success: true, message: '已拒绝返还' });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error: any) {
    console.error('处理退款失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
