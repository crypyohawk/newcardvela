export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';

// GET: 查看自己的扩容申请
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const requests = await db.poolExpansionRequest.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({ requests });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 手动提交扩容申请
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const body = await request.json();
    const { message } = body;

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { aiTier: true, role: true },
    });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    const userRole = user.role?.toLowerCase();
    if (userRole !== 'enterprise' && userRole !== 'admin') {
      return NextResponse.json({ error: '号池扩容申请仅限企业用户' }, { status: 403 });
    }

    // 检查是否有待处理的申请
    const pending = await db.poolExpansionRequest.findFirst({
      where: { userId: payload.userId, status: 'pending' },
    });
    if (pending) {
      return NextResponse.json({ error: '您已有一个待处理的扩容申请' }, { status: 400 });
    }

    const aiTierLimits: Record<string, number> = { basic: 3, pro: 10, premium: 20 };
    const currentTier = user.aiTier || 'basic';
    const maxKeys = aiTierLimits[currentTier] || 3;

    const poolKeyCount = await db.aIKey.count({
      where: { userId: payload.userId, copilotAccountId: { not: null }, status: 'active' },
    });

    const request_ = await db.poolExpansionRequest.create({
      data: {
        userId: payload.userId,
        currentTier,
        keyCount: poolKeyCount,
        maxKeys,
        message: message?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, request: request_ });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
