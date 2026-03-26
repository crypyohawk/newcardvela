export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/prisma';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';

// 提交企业账户申请
export async function POST(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return NextResponse.json({ error: '登录已过期' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    if (user.role === 'enterprise') {
      return NextResponse.json({ error: '您已是企业账户' }, { status: 400 });
    }

    // 检查是否有待审核的申请
    const pending = await prisma.enterpriseApplication.findFirst({
      where: { userId: user.id, status: 'pending' },
    });
    if (pending) {
      return NextResponse.json({ error: '您已有待审核的申请，请耐心等待' }, { status: 400 });
    }

    const body = await request.json();
    const { companyName, contactName, contactPhone, useCase, estimatedUsage, businessLicense } = body;

    if (!companyName?.trim() || !contactName?.trim() || !contactPhone?.trim()) {
      return NextResponse.json({ error: '公司名称、联系人和联系电话为必填项' }, { status: 400 });
    }

    const application = await prisma.enterpriseApplication.create({
      data: {
        userId: user.id,
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        useCase: useCase?.trim() || null,
        estimatedUsage: estimatedUsage?.trim() || null,
        businessLicense: businessLicense || null,
      },
    });

    return NextResponse.json({ success: true, application });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 获取当前用户的申请状态
export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return NextResponse.json({ error: '登录已过期' }, { status: 401 });
  }

  try {
    const applications = await prisma.enterpriseApplication.findMany({
      where: { userId: decoded.userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ applications });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
