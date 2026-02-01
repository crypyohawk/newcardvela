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

    await prisma.openCardNotice.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除开卡须知失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
