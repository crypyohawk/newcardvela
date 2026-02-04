import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyAdmin } from '../../../../src/lib/adminAuth';
import { withdrawFromCard } from '../../../../src/lib/gsalary';

// 获取所有退款记录
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const refunds = await db.transaction.findMany({
      where: { type: 'refund_hold' },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 为每条退款记录计算应扣手续费
    const refundsWithFee = await Promise.all(refunds.map(async (refund) => {
      // 尝试获取卡片类型的退款费率配置
      let feeConfig = {
        smallRefundFee: 3,      // 小额退款费 $3
        largeRefundThreshold: 20, // 大额退款阈值 $20
        refundFeePercent: 5,    // 退款费 5%
        refundFeeMin: 3,        // 最低退款费 $3
      };

      // 从 txHash 解析卡片信息
      let cardInfo: any = null;
      try {
        if (refund.txHash) {
          cardInfo = JSON.parse(refund.txHash);
        }
      } catch (e) {}

      // 如果有 userCardId，获取卡片类型配置
      if (cardInfo?.userCardId) {
        const userCard = await db.userCard.findUnique({
          where: { id: cardInfo.userCardId },
          include: { cardType: true },
        });
        if (userCard?.cardType) {
          const ct = userCard.cardType as any;
          feeConfig = {
            smallRefundFee: ct.smallRefundFee || 3,
            largeRefundThreshold: ct.largeRefundThreshold || 20,
            refundFeePercent: ct.refundFeePercent || 5,
            refundFeeMin: ct.refundFeeMin || 3,
          };
        }
      }

      // 计算应扣手续费
      let ourFee = 0;
      if (refund.amount < feeConfig.largeRefundThreshold) {
        // 小额退款：固定费用
        ourFee = feeConfig.smallRefundFee;
      } else {
        // 大额退款：百分比，最低值
        const percentFee = refund.amount * (feeConfig.refundFeePercent / 100);
        ourFee = Math.max(percentFee, feeConfig.refundFeeMin);
      }

      return {
        ...refund,
        cardInfo,
        feeConfig,
        calculatedFee: ourFee,
        netAmount: refund.amount - ourFee,
      };
    }));

    return NextResponse.json({ refunds: refundsWithFee });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 处理退款（扣除手续费）
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { refundId, action, deductFee } = body;

    const refund = await db.transaction.findUnique({
      where: { id: refundId },
      include: { user: true },
    });

    if (!refund) {
      return NextResponse.json({ error: '退款记录不存在' }, { status: 404 });
    }

    if (refund.status !== 'pending') {
      return NextResponse.json({ error: '该退款已处理' }, { status: 400 });
    }

    // 解析卡片信息
    let cardInfo: any = null;
    try {
      if (refund.txHash) {
        cardInfo = JSON.parse(refund.txHash);
      }
    } catch (e) {}

    if (action === 'deduct') {
      // 扣除手续费操作
      if (!deductFee || deductFee <= 0) {
        return NextResponse.json({ error: '请输入有效的手续费金额' }, { status: 400 });
      }

      if (!cardInfo?.gsalaryCardId) {
        return NextResponse.json({ error: '无法获取卡片ID，请手动处理' }, { status: 400 });
      }

      try {
        // 调用 GSalary API 扣除手续费
        await withdrawFromCard(cardInfo.gsalaryCardId, deductFee);

        // 更新退款记录状态
        await db.transaction.update({
          where: { id: refundId },
          data: {
            status: 'completed',
            paymentProof: JSON.stringify({
              action: 'deduct_fee',
              originalAmount: refund.amount,
              deductedFee: deductFee,
              netAmount: refund.amount - deductFee,
              processedAt: new Date().toISOString(),
            }),
          },
        });

        return NextResponse.json({
          success: true,
          message: `已从卡片扣除手续费 $${deductFee}，用户实际到账 $${(refund.amount - deductFee).toFixed(2)}`,
        });
      } catch (apiError: any) {
        console.error('扣除手续费失败:', apiError);
        return NextResponse.json({
          error: `扣除手续费失败: ${apiError.message}`,
        }, { status: 500 });
      }
    }

    if (action === 'approve') {
      // 直接通过（不扣手续费，适用于小额退款已扣费的情况）
      await db.transaction.update({
        where: { id: refundId },
        data: {
          status: 'completed',
          paymentProof: JSON.stringify({
            action: 'approved_no_deduct',
            originalAmount: refund.amount,
            processedAt: new Date().toISOString(),
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: '退款已标记为完成',
      });
    }

    if (action === 'reject') {
      // 拒绝（标记为异常，需要人工处理）
      await db.transaction.update({
        where: { id: refundId },
        data: { status: 'failed' },
      });

      return NextResponse.json({ success: true, message: '已标记为异常' });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error: any) {
    console.error('处理退款失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
