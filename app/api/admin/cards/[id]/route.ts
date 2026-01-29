import { NextRequest, NextResponse } from 'next/server';
import { getCardDetail, rechargeCard, freezeCard, unfreezeCard, cancelCard } from '../../../../../src/lib/gsalary';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';

export async function GET(
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

    const result = await getCardDetail(params.id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('获取卡片详情失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
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
    const { action, amount } = body;

    let result;
    switch (action) {
      case 'recharge':
        if (!amount || amount <= 0) {
          return NextResponse.json({ error: '充值金额无效' }, { status: 400 });
        }
        result = await rechargeCard(params.id, amount);
        break;
      case 'freeze':
        result = await freezeCard(params.id);
        break;
      case 'unfreeze':
        result = await unfreezeCard(params.id);
        break;
      case 'cancel':
        result = await cancelCard(params.id);
        break;
      default:
        return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('卡片操作失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
