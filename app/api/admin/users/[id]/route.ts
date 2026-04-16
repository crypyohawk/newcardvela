export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../../../src/lib/prisma';
import { verifyAdmin, adminError } from '../../../../../src/lib/adminAuth';
import { getCardDetail } from '../../../../../src/lib/gsalary';

function mapUpstreamCardStatus(status?: string | null) {
  switch ((status || '').toUpperCase()) {
    case 'ACTIVE':
      return 'active';
    case 'FROZEN':
      return 'frozen';
    case 'CANCELLED':
    case 'CANCELED':
      return 'cancelled';
    case 'INACTIVE':
      return 'inactive';
    default:
      return 'pending';
  }
}

function extractCardLast4(upstreamCard: any) {
  const maskCardNumber = upstreamCard?.mask_card_number || upstreamCard?.card_no || '';
  const matched = String(maskCardNumber).match(/(\d{4})$/);
  return matched ? matched[1] : null;
}

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

    // 查询绑定的号池账号信息
    const copilotAccountIds = aiKeys.map(k => k.copilotAccountId).filter(Boolean) as string[];
    const copilotAccounts = copilotAccountIds.length > 0
      ? await prisma.copilotAccount.findMany({
          where: { id: { in: copilotAccountIds } },
          select: { id: true, githubId: true, newApiChannelId: true, port: true, status: true },
        })
      : [];
    const copilotAccountMap = new Map(copilotAccounts.map(a => [a.id, a]));

    const aiStats = {
      totalKeys: aiKeys.length,
      activeKeys: aiKeys.filter(k => k.status === 'active').length,
      totalAiCost: aiKeys.reduce((sum, k) => sum + k.totalUsed, 0),
      monthAiCost: aiKeys.reduce((sum, k) => sum + k.monthUsed, 0),
    };

    return NextResponse.json({ 
      user: { ...user, userCards: cardsWithRealBalance },
      stats,
      aiKeys: aiKeys.map(k => {
        const account = k.copilotAccountId ? copilotAccountMap.get(k.copilotAccountId) : null;
        return {
          id: k.id,
          keyName: k.keyName,
          apiKey: k.apiKey,
          tierName: k.tier.displayName || k.tier.name,
          status: k.status,
          monthUsed: k.monthUsed,
          totalUsed: k.totalUsed,
          monthlyLimit: k.monthlyLimit,
          lastUsedAt: k.lastUsedAt,
          createdAt: k.createdAt,
          copilotAccount: account ? {
            githubId: account.githubId,
            channelId: account.newApiChannelId,
            port: account.port,
            status: account.status,
          } : null,
        };
      }),
      aiStats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError('未授权');

  try {
    const body = await request.json();
    const { action, gsalaryCardId, cardTypeId } = body;

    // 管理员重置用户密码
    if (action === 'resetPassword') {
      const { newPassword } = body;
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return NextResponse.json({ error: '密码至少6位' }, { status: 400 });
      }
      const user = await prisma.user.findUnique({ where: { id: params.id } });
      if (!user) {
        return NextResponse.json({ error: '用户不存在' }, { status: 404 });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: params.id },
        data: { password: hashedPassword },
      });
      return NextResponse.json({ success: true, message: '密码已重置' });
    }

    if (action !== 'bindExistingCard') {
      return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }

    if (!gsalaryCardId || !cardTypeId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const trimmedCardId = String(gsalaryCardId).trim();
    if (!trimmedCardId || /[\/\\\.]{2}/.test(trimmedCardId)) {
      return NextResponse.json({ error: '卡 ID 格式无效' }, { status: 400 });
    }

    const [user, cardType, existedCard] = await Promise.all([
      prisma.user.findUnique({ where: { id: params.id } }),
      prisma.cardType.findUnique({ where: { id: cardTypeId } }),
      prisma.userCard.findFirst({
        where: { gsalaryCardId: trimmedCardId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    if (!cardType) {
      return NextResponse.json({ error: '卡类型不存在' }, { status: 404 });
    }

    if (existedCard) {
      return NextResponse.json({
        error: `该卡已绑定到用户 ${existedCard.user.username} (${existedCard.user.email})`,
      }, { status: 409 });
    }

    const upstreamCard = await getCardDetail(trimmedCardId);
    const cardNoLast4 = extractCardLast4(upstreamCard);
    const balance = Number(upstreamCard?.available_balance ?? upstreamCard?.balance ?? 0) || 0;
    const status = mapUpstreamCardStatus(upstreamCard?.status);

    const createdAt = upstreamCard?.create_time ? new Date(upstreamCard.create_time) : null;
    const bindData: any = {
      userId: user.id,
      cardTypeId: cardType.id,
      gsalaryCardId: trimmedCardId,
      cardNoLast4,
      balance,
      status,
      openFee: cardType.openFee,
    };

    if (createdAt && !Number.isNaN(createdAt.getTime())) {
      bindData.createdAt = createdAt;
    }

    const card = await prisma.userCard.create({
      data: bindData,
      include: {
        cardType: {
          select: {
            id: true,
            name: true,
            cardBin: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      card,
      upstreamCard: {
        cardId: trimmedCardId,
        status: upstreamCard?.status || null,
        balance,
        cardNoLast4,
        createTime: upstreamCard?.create_time || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}