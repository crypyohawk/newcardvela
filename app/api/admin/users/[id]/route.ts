import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/prisma';
import { verifyAdmin, adminError } from '../../../../../src/lib/adminAuth';

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

    return NextResponse.json({ user, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}