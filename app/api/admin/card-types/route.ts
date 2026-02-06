import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/prisma';
import { verifyAdmin } from '../../../../src/lib/adminAuth';

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: '无权限' }, { status: 401 });
  }

  try {
    const cardTypes = await prisma.cardType.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ cardTypes });
  } catch (error: any) {
    console.error('获取卡片类型失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: '无权限' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const cardType = await prisma.cardType.create({
      data: {
        name: body.name,
        cardBin: body.cardBin,
        issuer: body.issuer || '美国',
        // 用户端显示
        displayOpenFee: body.displayOpenFee ?? body.openFee,
        displayMonthlyFee: body.displayMonthlyFee,
        displayRechargeFee: body.displayRechargeFee,
        displayTransactionFee: body.displayTransactionFee,
        displayRefundFee: body.displayRefundFee,
        displayAuthFee: body.displayAuthFee,
        // 产品说明
        description: body.description || null,
        // 实际运行
        openFee: body.openFee || 2,
        monthlyFee: body.monthlyFee || 0.1,
        rechargeFeePercent: body.rechargeFeePercent || 2,
        rechargeFeeMin: body.rechargeFeeMin || 0,
        transactionFeePercent: body.transactionFeePercent || 1,
        transactionFeeMin: body.transactionFeeMin || 0,
        authFee: body.authFee || 0.2,
        authFeePercent: body.authFeePercent || 0,
        authFeeMin: body.authFeeMin || 0,
        authFailFee: body.authFailFee || 0.5,
        refundFeePercent: body.refundFeePercent || 1,
        refundFeeMin: body.refundFeeMin || 0.5,
        smallRefundFee: body.smallRefundFee || 3,
        largeRefundThreshold: body.largeRefundThreshold || 20,
        crossBorderFeePercent: body.crossBorderFeePercent || 1,
        crossBorderFeeMin: body.crossBorderFeeMin || 0,
        chargebackFee: body.chargebackFee || 15,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    });

    return NextResponse.json({ cardType });
  } catch (error: any) {
    console.error('创建卡片类型失败:', error);
    return NextResponse.json({ error: error.message || '创建失败' }, { status: 500 });
  }
}
