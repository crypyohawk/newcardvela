import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyAdmin } from '../../../../src/lib/adminAuth';
import { withdrawFromCard } from '../../../../src/lib/gsalary';

// 月费扣除接口 - 由外部 cron 或管理员手动触发
// 逻辑：优先从卡余额扣差额（displayMonthlyFee - monthlyFee），卡余额不足则从账户余额扣
export async function POST(request: NextRequest) {
  // 支持两种认证方式：管理员 token 或 cron secret
  const cronSecret = request.headers.get('x-cron-secret');
  const validCronSecret = process.env.CRON_SECRET;

  if (cronSecret && validCronSecret && cronSecret === validCronSecret) {
    // cron 认证通过
  } else {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
  }

  try {
    // 获取所有正常状态的用户卡片
    const activeCards = await db.userCard.findMany({
      where: { status: 'NORMAL' },
      include: {
        cardType: true,
        user: { select: { id: true, username: true, email: true, balance: true } },
      },
    });

    const results: any[] = [];
    let totalCollected = 0;
    let successCount = 0;
    let failCount = 0;

    for (const card of activeCards) {
      const cardType = card.cardType as any;
      const displayFee = cardType.displayMonthlyFee || 0;
      const actualFee = cardType.monthlyFee || 0;
      const profitFee = Math.round((displayFee - actualFee) * 100) / 100;

      // 如果没有利润差额，跳过
      if (profitFee <= 0) {
        results.push({
          cardId: card.id,
          userId: card.user?.id,
          username: card.user?.username,
          status: 'skipped',
          reason: '无月费差额',
          displayFee,
          actualFee,
          profitFee,
        });
        continue;
      }

      let method = '';
      let success = false;
      let errorMsg = '';

      // 优先尝试从卡余额扣除（通过GSalary API）
      try {
        if (card.gsalaryCardId) {
          await withdrawFromCard(card.gsalaryCardId, profitFee);
          method = 'card_balance';
          success = true;
        }
      } catch (cardError: any) {
        console.log(`[月费] 卡 ${card.id} 余额扣除失败: ${cardError.message}，尝试账户余额`);
      }

      // 卡余额不足，从账户余额扣除
      if (!success && card.user) {
        if (card.user.balance >= profitFee) {
          await db.user.update({
            where: { id: card.user.id },
            data: { balance: { decrement: profitFee } },
          });
          method = 'account_balance';
          success = true;
        } else {
          method = 'failed';
          errorMsg = `卡余额不足且账户余额不足（账户余额: $${card.user.balance.toFixed(2)}）`;
        }
      }

      if (success) {
        // 记录月费扣款交易
        await db.transaction.create({
          data: {
            userId: card.user!.id,
            type: 'monthly_fee',
            amount: profitFee,
            status: 'completed',
            txHash: JSON.stringify({
              userCardId: card.id,
              gsalaryCardId: card.gsalaryCardId,
              cardTypeName: cardType.name,
              displayFee,
              actualFee,
              profitFee,
              method,
              processedAt: new Date().toISOString(),
            }),
          },
        });
        totalCollected += profitFee;
        successCount++;
      } else {
        // 记录失败记录
        await db.transaction.create({
          data: {
            userId: card.user!.id,
            type: 'monthly_fee',
            amount: profitFee,
            status: 'failed',
            txHash: JSON.stringify({
              userCardId: card.id,
              gsalaryCardId: card.gsalaryCardId,
              cardTypeName: cardType.name,
              displayFee,
              actualFee,
              profitFee,
              error: errorMsg,
              processedAt: new Date().toISOString(),
            }),
          },
        });
        failCount++;
      }

      results.push({
        cardId: card.id,
        userId: card.user?.id,
        username: card.user?.username,
        cardType: cardType.name,
        displayFee,
        actualFee,
        profitFee,
        method,
        success,
        error: errorMsg || undefined,
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalCards: activeCards.length,
        successCount,
        failCount,
        skippedCount: activeCards.length - successCount - failCount,
        totalCollected: Math.round(totalCollected * 100) / 100,
      },
      details: results,
    });
  } catch (error: any) {
    console.error('[月费] 执行失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: 预览月费扣款（不实际执行）
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const activeCards = await db.userCard.findMany({
      where: { status: 'NORMAL' },
      include: {
        cardType: true,
        user: { select: { id: true, username: true, balance: true } },
      },
    });

    let totalEstimated = 0;
    const preview = activeCards.map((card) => {
      const cardType = card.cardType as any;
      const displayFee = cardType.displayMonthlyFee || 0;
      const actualFee = cardType.monthlyFee || 0;
      const profitFee = Math.round((displayFee - actualFee) * 100) / 100;
      if (profitFee > 0) totalEstimated += profitFee;

      return {
        cardId: card.id,
        userId: card.user?.id,
        username: card.user?.username,
        cardType: cardType.name,
        displayFee,
        actualFee,
        profitFee,
        userBalance: card.user?.balance,
      };
    });

    // 查询上次执行时间
    const lastExecution = await db.transaction.findFirst({
      where: { type: 'monthly_fee' },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      totalCards: activeCards.length,
      totalEstimatedRevenue: Math.round(totalEstimated * 100) / 100,
      lastExecutionTime: lastExecution?.createdAt || null,
      cards: preview,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
