import { NextResponse } from 'next/server';
import { prisma } from '../../../src/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 获取启用的卡片类型
    const cardTypes = await prisma.cardType.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
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

    return NextResponse.json({
      cardTypes,
      notices: notices.map(n => n.content),
      billingExamples: Array.isArray(billingExamples) ? billingExamples : [],
      referral: {
        enabled: configMap['referral_enabled'] === 'true',
        promptText: configMap['referral_prompt_text'] || '邀请好友注册并开卡，双方各得奖励！',
        rewardAmount: parseFloat(configMap['referral_reward_amount'] || '5'),
      },
      // 添加客服邮箱
      supportEmail: configMap['support_email'] || '',
      withdrawConfig: {
        // 账户提现配置 - 使用固定值，不从数据库读取
        accountMinAmount: 10,  // 最低 10 USD
        accountMaxAmount: 500,
        accountFeePercent: 5,
        accountFeeMin: 2,
        // 卡片提现配置 - 使用固定值
        cardFeePercent: 2,  // 2%
        cardFeeMin: 1,
      },
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    return NextResponse.json({ 
      cardTypes: [], 
      notices: [], 
      referral: { enabled: false, promptText: '', rewardAmount: 5 },
      billingExamples: [],
      withdrawConfig: {
        accountMinAmount: 10,
        accountMaxAmount: 500,
        accountFeePercent: 5,
        accountFeeMin: 2,
        cardFeePercent: 2,
        cardFeeMin: 1,
      },
    });
  }
}
