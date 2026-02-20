import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/prisma';
import { sendVerificationCodeForward } from '../../../../src/lib/email';
import { getCardDetail } from '../../../../src/lib/gsalary';

// 验证码类型
const OTP_BUSINESS_TYPES = [
  'THREE_DS_VERIFICATION_CODE',
  'CARD_TOKEN_OTP_CODE',
  'CARD_VERIFICATION_CODE',
];

// 验证码类型中文映射
const OTP_TYPE_NAMES: Record<string, string> = {
  'THREE_DS_VERIFICATION_CODE': '3DS交易验证码',
  'CARD_TOKEN_OTP_CODE': '绑卡验证码（Apple Pay/Google Pay）',
  'CARD_VERIFICATION_CODE': '卡交易验证码',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { business_type, data } = body;

    console.log('[GSalary Webhook] 收到事件:', business_type, JSON.stringify(data));

    // 处理验证码转发
    if (OTP_BUSINESS_TYPES.includes(business_type)) {
      await handleOtpForward(business_type, data);
      return NextResponse.json({ success: true });
    }

    // 处理卡交易通知
    if (business_type === 'CARD_TRANSACTION') {
      await handleCardTransaction(data);
      return NextResponse.json({ success: true });
    }

    // 处理卡状态更新
    if (business_type === 'CARD_STATUS_UPDATE') {
      await handleCardStatusUpdate(data);
      return NextResponse.json({ success: true });
    }

    console.log('[GSalary Webhook] 未处理的事件类型:', business_type);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[GSalary Webhook] 处理失败:', error);
    return NextResponse.json({ success: true }); // 返回200避免上游重试
  }
}

// ==================== 验证码转发 ====================
async function handleOtpForward(businessType: string, data: any) {
  const { card_id, mask_card_number, otp, merchant_name, transaction_amount } = data;

  if (!card_id || !otp) {
    console.error('[OTP转发] 缺少card_id或otp');
    return;
  }

  const userCard = await prisma.userCard.findFirst({
    where: { gsalaryCardId: card_id },
    include: {
      user: { select: { id: true, email: true, username: true } },
    },
  });

  if (!userCard || !userCard.user) {
    console.error('[OTP转发] 未找到对应的用户卡片, card_id:', card_id);
    return;
  }

  const user = userCard.user;
  const typeName = OTP_TYPE_NAMES[businessType] || '验证码';

  let amountInfo = '';
  if (transaction_amount && transaction_amount.amount > 0) {
    amountInfo = `${transaction_amount.amount} ${transaction_amount.currency}`;
  }

  console.log(`[OTP转发] 转发${typeName}给用户 ${user.username}(${user.email}), 商户: ${merchant_name}, 卡号: ${mask_card_number}`);

  await sendVerificationCodeForward({
    to: user.email,
    username: user.username,
    otp: otp,
    typeName: typeName,
    merchantName: merchant_name || '未知商户',
    maskedCardNumber: mask_card_number || `****${userCard.cardNoLast4}`,
    amount: amountInfo,
  });

  console.log(`[OTP转发] 成功转发${typeName}给 ${user.email}`);
}

// ==================== 卡交易通知 ====================
async function handleCardTransaction(data: any) {
  const { card_id, status, biz_type, transaction_amount, accounting_amount, merchant_name, mask_card_number } = data;

  if (!card_id) return;

  const userCard = await prisma.userCard.findFirst({
    where: { gsalaryCardId: card_id },
    include: {
      user: { select: { id: true, email: true, username: true, balance: true } },
      cardType: true,
    },
  });

  if (!userCard) {
    console.log('[卡交易] 未找到对应卡片, card_id:', card_id);
    return;
  }

  console.log(`[卡交易] 卡 ${userCard.id} 用户 ${userCard.user?.username} 交易: biz_type=${biz_type}, status=${status}, 商户=${merchant_name}`);

  // 1. 实时同步卡余额
  await syncCardBalance(userCard);

  // 2. 处理退款交易
  if (biz_type === 'REFUND' && (status === 'AUTHORIZED' || status === 'SETTLED')) {
    await handleRefundTransaction(userCard, data);
  }
}

// ==================== 同步卡余额 ====================
async function syncCardBalance(userCard: any) {
  try {
    const cardInfo = await getCardDetail(userCard.gsalaryCardId);
    const realBalance = cardInfo.available_balance ?? cardInfo.balance ?? 0;
    const oldBalance = userCard.balance;

    if (realBalance !== oldBalance) {
      await prisma.userCard.update({
        where: { id: userCard.id },
        data: { balance: realBalance },
      });
      console.log(`[余额同步] 卡 ${userCard.id}: ${oldBalance} -> ${realBalance}`);
    }
  } catch (err) {
    console.error(`[余额同步] 卡 ${userCard.id} 失败:`, err);
  }
}

// ==================== 退款处理 ====================
async function handleRefundTransaction(userCard: any, data: any) {
  const { transaction_amount, merchant_name } = data;
  const refundAmount = transaction_amount?.amount || 0;

  if (refundAmount <= 0) return;

  const user = userCard.user;
  const cardType = userCard.cardType as any;

  // 读取卡类型的退款费率配置
  const feeConfig = {
    smallRefundFee: cardType?.smallRefundFee || 3,
    largeRefundThreshold: cardType?.largeRefundThreshold || 20,
    refundFeePercent: cardType?.refundFeePercent || 5,
    refundFeeMin: cardType?.refundFeeMin || 3,
  };

  console.log(`[退款] 用户 ${user?.username} 收到退款 $${refundAmount}, 商户: ${merchant_name}`);

  // 检查是否已存在该退款记录（避免重复处理）
  const existingRefund = await prisma.transaction.findFirst({
    where: {
      userId: user?.id,
      type: 'refund_hold',
      amount: refundAmount,
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // 5分钟内
    },
  });

  if (existingRefund) {
    console.log(`[退款] 已存在退款记录 ${existingRefund.id}，跳过`);
    return;
  }

  if (refundAmount < feeConfig.largeRefundThreshold) {
    // ===== 小额退款：自动扣手续费 =====
    const fee = feeConfig.smallRefundFee;
    const netAmount = Math.max(refundAmount - fee, 0);

    console.log(`[退款] 小额退款 $${refundAmount} < $${feeConfig.largeRefundThreshold}，自动扣手续费 $${fee}，实际到账 $${netAmount}`);

    // 直接完成退款，记录为已完成
    await prisma.transaction.create({
      data: {
        userId: user!.id,
        type: 'refund_hold',
        amount: refundAmount,
        status: 'completed',
        txHash: JSON.stringify({
          userCardId: userCard.id,
          gsalaryCardId: userCard.gsalaryCardId,
          merchantName: merchant_name,
          autoProcessed: true,
          fee: fee,
          netAmount: netAmount,
        }),
        paymentProof: JSON.stringify({
          action: 'auto_deduct_fee',
          originalAmount: refundAmount,
          deductedFee: fee,
          netAmount: netAmount,
          processedAt: new Date().toISOString(),
        }),
      },
    });

    console.log(`[退款] 小额退款自动处理完成`);
  } else {
    // ===== 大额退款：创建待审核记录，等待管理员处理 =====
    const percentFee = refundAmount * (feeConfig.refundFeePercent / 100);
    const estimatedFee = Math.max(percentFee, feeConfig.refundFeeMin);

    console.log(`[退款] 大额退款 $${refundAmount} >= $${feeConfig.largeRefundThreshold}，等待管理员审核，预计手续费 $${estimatedFee.toFixed(2)}`);

    await prisma.transaction.create({
      data: {
        userId: user!.id,
        type: 'refund_hold',
        amount: refundAmount,
        status: 'pending',
        txHash: JSON.stringify({
          userCardId: userCard.id,
          gsalaryCardId: userCard.gsalaryCardId,
          merchantName: merchant_name,
          autoProcessed: false,
          estimatedFee: estimatedFee,
        }),
      },
    });

    console.log(`[退款] 大额退款待审核记录已创建`);
  }
}

// ==================== 卡状态更新 ====================
async function handleCardStatusUpdate(data: any) {
  const { card_id, status } = data;

  if (!card_id || !status) return;

  const userCard = await prisma.userCard.findFirst({
    where: { gsalaryCardId: card_id },
  });

  if (!userCard) {
    console.log('[卡状态] 未找到对应卡片, card_id:', card_id);
    return;
  }

  const newStatus = status === 'ACTIVE' ? 'active' : status.toLowerCase();

  await prisma.userCard.update({
    where: { id: userCard.id },
    data: { status: newStatus },
  });

  // 状态变更时也同步余额
  await syncCardBalance({ ...userCard, gsalaryCardId: card_id });

  console.log(`[卡状态] 卡 ${userCard.id} 状态更新为: ${newStatus}`);
}
