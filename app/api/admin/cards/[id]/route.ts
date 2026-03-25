export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCardDetail, rechargeCard } from '../../../../../src/lib/gsalary';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';
import { db } from '../../../../../src/lib/db';

async function requireAdmin(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await db.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.role !== 'admin') return null;
  return user;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: '无管理员权限' }, { status: 403 });
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
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: '无管理员权限' }, { status: 403 });
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
      case 'unfreeze':
      case 'cancel':
        return NextResponse.json({ error: '该功能暂未实现' }, { status: 400 });
      default:
        return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('卡片操作失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
