import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyAdmin, adminError } from '../../../../src/lib/adminAuth';

// 获取所有用户
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError();

  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 用户操作
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, amount } = body;

    if (action === 'adjustBalance') {
      if (!userId || amount === undefined) {
        return NextResponse.json({ error: '参数不完整' }, { status: 400 });
      }

      const user = await db.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } },
      });

      // 记录交易
      await db.transaction.create({
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
