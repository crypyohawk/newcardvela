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
    const systemConfigs = await prisma.systemConfig.findMany({
      where: {
        key: { in: ['referral_enabled', 'referral_prompt_text', 'referral_reward_amount', 'billing_examples'] }
      }
    });

    const configMap: Record<string, string> = {};
    systemConfigs.forEach(s => { configMap[s.key] = s.value; });

    return NextResponse.json({
      cardTypes,
      notices: notices.map(n => n.content),
      referral: {
        enabled: configMap['referral_enabled'] === 'true',
        promptText: configMap['referral_prompt_text'] || '',
        rewardAmount: parseFloat(configMap['referral_reward_amount'] || '5')
      },
      billingExamples: configMap['billing_examples'] ? JSON.parse(configMap['billing_examples']) : []
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    return NextResponse.json({ 
      cardTypes: [], 
      notices: [], 
      referral: { enabled: false, promptText: '', rewardAmount: 5 },
      billingExamples: []
    });
  }
}
