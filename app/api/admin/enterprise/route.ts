export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/prisma';
import { verifyAdmin } from '../../../../src/lib/adminAuth';

// 获取所有企业申请
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: '无权限' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      where.status = status;
    }

    const applications = await prisma.enterpriseApplication.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, username: true, role: true, balance: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ applications });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 审核企业申请
export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: '无权限' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { applicationId, action, rejectReason } = body;

    if (!applicationId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    const application = await prisma.enterpriseApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return NextResponse.json({ error: '申请不存在' }, { status: 404 });
    }

    if (application.status !== 'pending') {
      return NextResponse.json({ error: '该申请已处理' }, { status: 400 });
    }

    if (action === 'approve') {
      // 批准：更新申请状态 + 升级用户角色
      await prisma.$transaction([
        prisma.enterpriseApplication.update({
          where: { id: applicationId },
          data: { status: 'approved', reviewedAt: new Date() },
        }),
        prisma.user.update({
          where: { id: application.userId },
          data: { role: 'enterprise' },
        }),
      ]);
    } else {
      // 拒绝
      if (!rejectReason?.trim()) {
        return NextResponse.json({ error: '请填写拒绝原因' }, { status: 400 });
      }
      await prisma.enterpriseApplication.update({
        where: { id: applicationId },
        data: {
          status: 'rejected',
          rejectReason: rejectReason.trim(),
          reviewedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
