import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: '无效的令牌' }, { status: 401 });
    }

    const body = await request.json();
    const { txHash, paymentProof } = body;

    console.log('[提交支付凭证]', { orderId: params.id, txHash: !!txHash, paymentProof: !!paymentProof });

    // 必须上传付款截图
    if (!paymentProof) {
      return NextResponse.json({ error: '请上传付款截图后再提交' }, { status: 400 });
    }

    // 微信/支付宝必须上传截图，USDT可以提交哈希或截图
    if (!paymentProof && !txHash) {
      return NextResponse.json({ error: '请上传付款截图或填写交易哈希' }, { status: 400 });
    }

    const order = await db.transaction.findFirst({
      where: { 
        id: params.id, 
        userId: payload.userId,
        type: 'recharge',
        status: 'pending',
      },
    });

    if (!order) {
      return NextResponse.json({ error: '订单不存在或已处理' }, { status: 404 });
    }

    // 更新订单
    await db.transaction.update({
      where: { id: params.id },
      data: { 
        status: 'processing',
        txHash: txHash || undefined,
        paymentProof: paymentProof,
      },
    });

    console.log('[订单状态更新成功]', params.id, 'txHash已保存:', !!txHash);

    return NextResponse.json({
      success: true,
      message: '提交成功，请等待管理员审核',
    });

  } catch (error: any) {
    console.error('提交充值凭证失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
