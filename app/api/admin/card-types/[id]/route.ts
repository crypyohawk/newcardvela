import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/prisma';
import { verifyAdmin } from '../../../../../src/lib/adminAuth';

// 更新卡片类型
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: '无权限' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id } = params;

    const cardType = await prisma.cardType.update({
      where: { id },
      data: {
        name: body.name,
        cardBin: body.cardBin,
        issuer: body.issuer,
        // 用户端显示
        displayOpenFee: body.displayOpenFee,
        displayMonthlyFee: body.displayMonthlyFee,
        displayRechargeFee: body.displayRechargeFee,
        displayTransactionFee: body.displayTransactionFee,
        displayRefundFee: body.displayRefundFee,
        displayAuthFee: body.displayAuthFee,
        // 产品说明
        description: body.description || null,
        // 适用对象
        targetRole: body.targetRole || 'user',  // 新增这一行
        // 实际运行
        openFee: body.openFee,
        monthlyFee: body.monthlyFee,
        rechargeFeePercent: body.rechargeFeePercent,
        rechargeFeeMin: body.rechargeFeeMin,
        transactionFeePercent: body.transactionFeePercent,
        transactionFeeMin: body.transactionFeeMin,
        authFee: body.authFee,
        authFeePercent: body.authFeePercent,
        authFeeMin: body.authFeeMin,
        authFailFee: body.authFailFee,
        refundFeePercent: body.refundFeePercent,
        refundFeeMin: body.refundFeeMin,
        smallRefundFee: body.smallRefundFee,
        largeRefundThreshold: body.largeRefundThreshold,
        crossBorderFeePercent: body.crossBorderFeePercent,
        crossBorderFeeMin: body.crossBorderFeeMin,
        chargebackFee: body.chargebackFee,
        isActive: body.isActive,
      },
    });

    return NextResponse.json({ cardType });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 删除卡片类型
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: '无权限' }, { status: 401 });
  }

  try {
    await prisma.cardType.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
