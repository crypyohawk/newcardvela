import { NextResponse } from 'next/server';
import { prisma } from '../../../src/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 获取启用的卡片类型
    const cardTypes = await prisma.cardType.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        cardBin: true,
        issuer: true,
        displayOpenFee: true,
        displayMonthlyFee: true,
        displayRechargeFee: true,
        displayTransactionFee: true,
        displayRefundFee: true,
        displayAuthFee: true,
        openFee: true,
        monthlyFee: true,
        rechargeFeePercent: true,
        rechargeFeeMin: true,
        description: true,  // 添加这行
      }
    });

    // 获取开卡须知
    const notices = await prisma.openCardNotice.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    // 获取所有系统配置
    const systemConfigs = await prisma.systemConfig.findMany();

    const configMap: Record<string, string> = {};
    systemConfigs.forEach(s => { configMap[s.key] = s.value; });

    // 解析 billingExamples
    let billingExamples: any[] = [];
    try {
      if (configMap['billing_examples']) {
        billingExamples = JSON.parse(configMap['billing_examples']);
      }
    } catch (e) {
      billingExamples = [];
    }

    // 获取客服邮箱
    const supportEmailConfig = await prisma.systemConfig.findUnique({
      where: { key: 'support_email' }
    });

    return NextResponse.json({
      cardTypes,
      notices: notices.map(n => n.content),
      billingExamples: Array.isArray(billingExamples) ? billingExamples : [],
      referral: {
        enabled: configMap['referral_enabled'] === 'true',
        promptText: configMap['referral_prompt_text'] || '邀请好友注册并开卡，双方各得奖励！',
        rewardAmount: parseFloat(configMap['referral_reward_amount'] || '5'),
      },
      // 统一使用 withdraw_ 前缀，与后端提现API和管理后台一致
      withdrawConfig: {
        accountMinAmount: parseFloat(configMap['withdraw_min_amount'] || '10'),
        accountMaxAmount: parseFloat(configMap['withdraw_max_amount'] || '500'),
        accountFeePercent: parseFloat(configMap['withdraw_fee_percent'] || '5'),  // 5%
        accountFeeMin: parseFloat(configMap['withdraw_fee_min'] || '2'),           // 最低$2
        cardFeePercent: parseFloat(configMap['card_withdraw_fee_percent'] || '1'),
        cardFeeMin: parseFloat(configMap['card_withdraw_fee'] || '1.5'),
      },
      supportEmail: supportEmailConfig?.value || '',
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    return NextResponse.json({ 
      cardTypes: [], 
      notices: [], 
      referral: { enabled: false, promptText: '', rewardAmount: 5 },
      billingExamples: [],
      supportEmail: '',
      withdrawConfig: {
        accountMinAmount: 10,
        accountMaxAmount: 500,
        accountFeePercent: 5,
        accountFeeMin: 2,
        cardFeePercent: 1,
        cardFeeMin: 1.5,
      },
    });
  }
}
