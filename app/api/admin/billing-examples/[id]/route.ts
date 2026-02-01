import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/prisma';
import { verifyAdmin } from '../../../../../src/lib/adminAuth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: '无权限' }, { status: 401 });
  }

  try {
    const { id } = params;
    
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'billing_examples' }
    });
    
    if (!config) {
      return NextResponse.json({ error: '未找到数据' }, { status: 404 });
    }
    
    const examples = JSON.parse(config.value);
    const filteredExamples = examples.filter((e: any) => e.id !== id);
    
    await prisma.systemConfig.update({
      where: { key: 'billing_examples' },
      data: { value: JSON.stringify(filteredExamples) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除示例失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
