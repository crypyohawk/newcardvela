import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/prisma';
import { verifyAdmin } from '../../../../src/lib/adminAuth';

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: '无权限' }, { status: 401 });
  }

  try {
    const notices = await prisma.openCardNotice.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    // 获取持卡人信息示例
    const billingConfig = await prisma.systemConfig.findUnique({
      where: { key: 'billing_examples' }
    });

    return NextResponse.json({
      notices,
      billingExamples: billingConfig ? JSON.parse(billingConfig.value) : []
    });
  } catch (error) {
    console.error('获取开卡须知失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '无权限' }, { status: 401 });

  try {
    const { content } = await request.json();
    
    const maxOrder = await prisma.openCardNotice.aggregate({
      _max: { sortOrder: true }
    });

    const notice = await prisma.openCardNotice.create({
      data: {
        content,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
        isActive: true
      }
    });

    return NextResponse.json({ notice });
  } catch (error) {
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
