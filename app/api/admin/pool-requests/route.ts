export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyAdmin } from '../../../../src/lib/adminAuth';

// GET: 获取所有扩容申请
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const requests = await db.poolExpansionRequest.findMany({
      where: status === 'all' ? {} : { status },
      include: {
        user: { select: { id: true, username: true, email: true, aiTier: true, aiBalance: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // 号池统计
    const poolStats = await db.copilotAccount.groupBy({
      by: ['status'],
      _count: true,
    });
    const idleCount = await db.copilotAccount.count({
      where: { status: 'active', boundAiKeyId: null },
    });
    const boundCount = await db.copilotAccount.count({
      where: { boundAiKeyId: { not: null } },
    });
    const totalCount = await db.copilotAccount.count();

    return NextResponse.json({
      requests,
      poolStats: { total: totalCount, idle: idleCount, bound: boundCount },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: 审批扩容申请
export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });

  try {
    const body = await request.json();
    const { requestId, action, adminNote } = body;

    if (!requestId || !['approved', 'rejected'].includes(action)) {
      return NextResponse.json({ error: '参数无效' }, { status: 400 });
    }

    const existing = await db.poolExpansionRequest.findUnique({ where: { id: requestId } });
    if (!existing) return NextResponse.json({ error: '申请不存在' }, { status: 404 });
    if (existing.status !== 'pending') {
      return NextResponse.json({ error: '该申请已处理' }, { status: 400 });
    }

    await db.poolExpansionRequest.update({
      where: { id: requestId },
      data: {
        status: action,
        adminNote: adminNote?.trim() || null,
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
