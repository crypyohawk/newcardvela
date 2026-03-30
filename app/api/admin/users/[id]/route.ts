export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/prisma';
import { verifyAdmin, adminError } from '../../../../../src/lib/adminAuth';
import { getCardDetail } from '../../../../../src/lib/gsalary';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError('未授权');

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        userCards: {
          include: {
            cardType: {
              select: {
                id: true,
                name: true,
                cardBin: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        _count: {
          select: { userCards: true, transactions: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 实时同步上游卡余额
    const cardsWithRealBalance = await Promise.all(
      user.userCards.map(async (card) => {
        if (card.gsalaryCardId) {
          try {
            const cardInfo = await getCardDetail(card.gsalaryCardId);
            const realBalance = cardInfo.available_balance ?? cardInfo.balance ?? 0; // 优先用 available_balance
            // 同步更新本地数据库
            if (realBalance !== card.balance) {
              await prisma.userCard.update({
                where: { id: card.id },
                data: { balance: realBalance },
              });
            }
            return { ...card, balance: realBalance };
          } catch (err) {
            console.error(`同步卡 ${card.id} 余额失败:`, err);
            return card;
          }
        }
        return card;
      })
    );

    // 统计数据
    const stats = {
      totalCards: user._count.userCards,
      totalTransactions: user._count.transactions,
      totalRecharge: user.transactions
        .filter(t => t.type === 'recharge' && t.status === 'completed')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
      totalWithdraw: user.transactions
        .filter(t => t.type === 'withdraw' && t.status === 'completed')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    };

    // AI 服务用量统计
    const aiKeys = await prisma.aIKey.findMany({
      where: { userId: params.id },
      include: { tier: { select: { displayName: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const aiStats = {
      totalKeys: aiKeys.length,
      activeKeys: aiKeys.filter(k => k.status === 'active').length,
      totalAiCost: aiKeys.reduce((sum, k) => sum + k.totalUsed, 0),
      monthAiCost: aiKeys.reduce((sum, k) => sum + k.monthUsed, 0),
    };

    return NextResponse.json({ 
      user: { ...user, userCards: cardsWithRealBalance },
      stats,
      aiKeys: aiKeys.map(k => ({
        id: k.id,
        keyName: k.keyName,
        tierName: k.tier.displayName || k.tier.name,
        status: k.status,
        monthUsed: k.monthUsed,
        totalUsed: k.totalUsed,
        monthlyLimit: k.monthlyLimit,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      })),
      aiStats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}