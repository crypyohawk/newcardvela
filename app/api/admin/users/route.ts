import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/prisma';
import { verifyAdmin } from '../../../../src/lib/adminAuth';

// 获取所有用户
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: '无权限' }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { userCards: true },
        },
      },
    });

    // 统计数据
    const totalUsers = users.length;
    const totalBalance = users.reduce((sum, u) => sum + u.balance, 0);
    const totalCards = users.reduce((sum, u) => sum + u._count.userCards, 0);

    return NextResponse.json({ 
      users,
      stats: {
        totalUsers,
        totalBalance,
        totalCards,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 更新用户角色
export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: '无权限' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    if (!['user', 'agent'].includes(role)) {
      return NextResponse.json({ error: '无效的角色' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 用户操作（余额调整）
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: '无权限' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, userId, amount } = body;

    if (action === 'adjustBalance') {
      if (!userId || amount === undefined) {
        return NextResponse.json({ error: '参数不完整' }, { status: 400 });
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } },
      });

      // 记录交易
      await prisma.transaction.create({
        data: {
          userId,
          type: amount > 0 ? 'deposit' : 'withdraw',
          amount,
          status: 'completed',
        },
      });

      return NextResponse.json({ success: true, user });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
