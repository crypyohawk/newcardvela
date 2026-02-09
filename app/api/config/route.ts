import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../src/lib/prisma';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 获取用户角色（如果已登录）
    let userRole = 'user';
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        if (decoded?.userId) {
          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { role: true }
          });
          if (user?.role) {
            userRole = user.role;
          }
        }
      } catch (e) {
        // token 无效，使用默认角色
      }
    }

    // 根据用户角色过滤卡片类型
    // admin 可以看到所有，普通用户看 user，代理商看 agent
    const cardTypes = await prisma.cardType.findMany({
      where: { 
        isActive: true,
        targetRole: userRole === 'admin' ? undefined : userRole
      },
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
        description: true,
        targetRole: true,  // 新增
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
      withdrawConfig: {
        accountMinAmount: parseFloat(configMap['withdraw_min_amount'] || '10'),
        accountMaxAmount: parseFloat(configMap['withdraw_max_amount'] || '500'),
        accountFeePercent: parseFloat(configMap['withdraw_fee_percent'] || '5'),
        accountFeeMin: parseFloat(configMap['withdraw_fee_min'] || '2'),
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
