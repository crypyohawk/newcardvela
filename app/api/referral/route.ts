import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '../../../src/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    // 获取用户信息
    let user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        referralCode: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 如果用户没有推荐码，自动生成一个
    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      await prisma.user.update({
        where: { id: user.id },
        data: { referralCode }
      });
    }

    // 获取被推荐的用户列表
    const referrals = await prisma.user.findMany({
      where: { referredBy: user.id },
      select: {
        id: true,
        username: true,
        createdAt: true,
        userCards: {
          where: { status: 'active' },
          select: { id: true }
        }
      }
    });

    // 获取推荐功能设置
    const settings = await prisma.systemConfig.findMany({
      where: {
        key: { in: ['referral_enabled', 'referral_reward_amount', 'referral_prompt_text'] }
      }
    });

    const configMap: Record<string, string> = {};
    settings.forEach(s => { configMap[s.key] = s.value; });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return NextResponse.json({
      referralCode,
      referralLink: `${appUrl}/register?ref=${referralCode}`,
      referrals: referrals.map(r => ({
        id: r.id,
        username: r.username,
        createdAt: r.createdAt,
        hasOpenedCard: r.userCards.length > 0
      })),
      settings: {
        enabled: configMap['referral_enabled'] === 'true',
        rewardAmount: parseFloat(configMap['referral_reward_amount'] || '5'),
        promptText: configMap['referral_prompt_text'] || '推荐好友注册开卡，即可获得奖励！'
      }
    });
  } catch (error) {
    console.error('获取推荐信息失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
