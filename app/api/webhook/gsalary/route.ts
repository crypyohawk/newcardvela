import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { withdrawFromCard } from '../../../../src/lib/gsalary';

// GSalary Webhook 接收端点
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Webhook] 收到 GSalary 通知:', JSON.stringify(body, null, 2));

    const eventType = body.event_type || body.type;
    const data = body.data || body;

    // 处理卡交易通知（包括退款）
    if (eventType === 'CARD_TRANSACTION' || data.transaction_type) {
      await handleCardTransaction(data);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Webhook] 处理失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 处理卡交易
async function handleCardTransaction(data: any) {
  const cardId = data.card_id;
  const amount = Math.abs(data.amount || 0);
  const transactionType = data.transaction_type; // REFUND, PURCHASE, etc.
  const transactionId = data.transaction_id || data.id;

  console.log('[Webhook] 卡交易:', { cardId, amount, transactionType, transactionId });

  // 只处理退款
  if (transactionType !== 'REFUND') {
    console.log('[Webhook] 非退款交易，跳过');
    return;
  }

  // 查找对应的用户卡片
  const userCard = await db.userCard.findFirst({
    where: { gsalaryCardId: cardId },
    include: { user: true },
  });

  if (!userCard) {
    console.log('[Webhook] 未找到对应卡片:', cardId);
    return;
  }

  // 检查是否已处理过
  const existingRecord = await db.transaction.findFirst({
    where: { 
      type: 'refund_hold',
      txHash: transactionId,
    },
  });

  if (existingRecord) {
    console.log('[Webhook] 该退款已处理过:', transactionId);
    return;
  }

  // 只处理 >= $20 的退款
  if (amount < 20) {
    console.log('[Webhook] 退款金额小于 $20，不处理:', amount);
    return;
  }

  console.log('[Webhook] 处理退款，金额:', amount, '用户:', userCard.user.username);

  // 自动从卡上扣除退款金额（真实扣款）
  try {
    await withdrawFromCard(cardId, amount);
    console.log('[Webhook] 已从卡上扣除退款金额:', amount);

    // 记录退款冻结记录
    await db.transaction.create({
      data: {
        userId: userCard.userId,
        type: 'refund_hold',
        amount: amount,
        status: 'pending', // 待用户申请返还
        txHash: transactionId,
        paymentMethod: 'card_refund',
      },
    });

    console.log('[Webhook] 退款冻结记录已创建');
  } catch (err: any) {
    console.error('[Webhook] 扣款失败:', err);
  }
}
