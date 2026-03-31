export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';

// POST: 从主余额转入 AI 钱包
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const body = await request.json();
    const { amount, direction } = body;
    const transferAmount = parseFloat(amount);

    if (!transferAmount || transferAmount <= 0) {
      return NextResponse.json({ error: '转账金额必须大于 0' }, { status: 400 });
    }
    if (transferAmount < 1) {
      return NextResponse.json({ error: '最低转账金额为 $1' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    if (direction === 'ai_to_main') {
      // AI 等级升级后余额锁定，不可转出
      if (user.aiBalanceLocked) {
        return NextResponse.json({
          error: '您的 AI 等级已升级，余额已锁定，仅可用于 API 消费，不可转回账户',
        }, { status: 400 });
      }

      // AI 钱包 → 主余额：必须没有任何活跃 Key 才允许转出
      const activeKeyCount = await db.aIKey.count({
        where: { userId: payload.userId, status: 'active' },
      });
      if (activeKeyCount > 0) {
        return NextResponse.json({ 
          error: `您当前有 ${activeKeyCount} 个活跃 Key，请先删除或禁用所有 Key 后才能将 AI 余额转回账户` 
        }, { status: 400 });
      }

      if (user.aiBalance < transferAmount) {
        return NextResponse.json({ error: `AI 余额不足，当前 $${user.aiBalance.toFixed(2)}` }, { status: 400 });
      }

      await db.$transaction([
        db.user.update({
          where: { id: payload.userId },
          data: {
            aiBalance: { decrement: transferAmount },
            balance: { increment: transferAmount },
          },
        }),
        db.transaction.create({
          data: {
            userId: payload.userId,
            type: 'ai_transfer',
            amount: transferAmount,
            status: 'completed',
          },
        }),
      ]);
    } else {
      // 主余额 → AI 钱包（默认）
      if (user.balance < transferAmount) {
        return NextResponse.json({ error: `账户余额不足，当前 $${user.balance.toFixed(2)}` }, { status: 400 });
      }

      await db.$transaction([
        db.user.update({
          where: { id: payload.userId },
          data: {
            balance: { decrement: transferAmount },
            aiBalance: { increment: transferAmount },
          },
        }),
        db.transaction.create({
          data: {
            userId: payload.userId,
            type: 'ai_transfer',
            amount: -transferAmount,
            status: 'completed',
          },
        }),
      ]);
    }

    // 返回更新后的余额
    const updated = await db.user.findUnique({
      where: { id: payload.userId },
      select: { balance: true, aiBalance: true },
    });

    return NextResponse.json({
      success: true,
      balance: updated?.balance ?? 0,
      aiBalance: updated?.aiBalance ?? 0,
    });
  } catch (error: any) {
    console.error('余额转账失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
