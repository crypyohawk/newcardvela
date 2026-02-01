import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/prisma';
import { verifyAdmin } from '../../../../src/lib/adminAuth';

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: '无权限' }, { status: 401 });
  }

  try {
    const example = await request.json();
    
    // 获取现有示例
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'billing_examples' }
    });
    
    const examples = config ? JSON.parse(config.value) : [];
    const newExample = {
      id: Date.now().toString(),
      ...example
    };
    examples.push(newExample);

    await prisma.systemConfig.upsert({
      where: { key: 'billing_examples' },
      update: { value: JSON.stringify(examples) },
      create: { key: 'billing_examples', value: JSON.stringify(examples) }
    });

    return NextResponse.json({ success: true, example: newExample });
  } catch (error) {
    console.error('添加示例失败:', error);
    return NextResponse.json({ error: '添加失败' }, { status: 500 });
  }
}
