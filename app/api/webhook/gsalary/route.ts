import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/prisma';
import { sendVerificationCodeForward } from '../../../../src/lib/email';

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
    return NextResponse.json({ success: true }); // 返回200避免重试
  }
}

// 处理验证码转发
async function handleOtpForward(businessType: string, data: any) {
  const { card_id, mask_card_number, otp, merchant_name, transaction_amount } = data;

  if (!card_id || !otp) {
    console.error('[OTP转发] 缺少card_id或otp');
    return;
  }

  // 通过 gsalaryCardId 查找用户
  const userCard = await prisma.userCard.findFirst({
    where: { gsalaryCardId: card_id },
    include: {
      user: {
        select: { id: true, email: true, username: true },
      },
    },
  });

  if (!userCard || !userCard.user) {
    console.error('[OTP转发] 未找到对应的用户卡片, card_id:', card_id);
    return;
  }

  const user = userCard.user;
  const typeName = OTP_TYPE_NAMES[businessType] || '验证码';

  // 构建交易金额信息
  let amountInfo = '';
  if (transaction_amount && transaction_amount.amount > 0) {
    amountInfo = `${transaction_amount.amount} ${transaction_amount.currency}`;
  }

  console.log(`[OTP转发] 转发${typeName}给用户 ${user.username}(${user.email}), 商户: ${merchant_name}, 卡号: ${mask_card_number}`);

  // 发送邮件给用户
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

// 处理卡交易通知（同步余额）
async function handleCardTransaction(data: any) {
  const { card_id, status, transaction_amount, accounting_amount } = data;

  if (!card_id) return;

  const userCard = await prisma.userCard.findFirst({
    where: { gsalaryCardId: card_id },
  });

  if (!userCard) {
    console.log('[卡交易] 未找到对应卡片, card_id:', card_id);
    return;
  }

  console.log(`[卡交易] 卡 ${userCard.id} 交易状态: ${status}, 金额:`, transaction_amount);
}

// 处理卡状态更新
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

  // 更新本地卡状态
  await prisma.userCard.update({
    where: { id: userCard.id },
    data: { status: status.toLowerCase() },
  });

  console.log(`[卡状态] 卡 ${userCard.id} 状态更新为: ${status}`);
}
