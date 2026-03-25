import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';
import { verifyAdmin } from '../../../../../src/lib/adminAuth';

// 更新上游服务商
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });

  try {
    const body = await request.json();
    const updateData: any = {};

    if (body.displayName !== undefined) updateData.displayName = body.displayName;
    if (body.type !== undefined) {
      if (body.type !== 'proxy') {
        return NextResponse.json({ error: '类型必须为 proxy' }, { status: 400 });
      }
      updateData.type = body.type;
    }
    if (body.baseUrl !== undefined) updateData.baseUrl = body.baseUrl || null;
    if (body.masterKey !== undefined) updateData.masterKey = body.masterKey || null;
    if (body.config !== undefined) updateData.config = body.config ? JSON.stringify(body.config) : null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

    const provider = await db.aIProvider.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, provider });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 删除上游服务商（仅无关联套餐时）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });

  const tierCount = await db.aIServiceTier.count({ where: { providerId: params.id } });
  if (tierCount > 0) {
    return NextResponse.json({ error: `该服务商下有 ${tierCount} 个套餐，无法删除。请先移除关联套餐。` }, { status: 400 });
  }

  await db.aIProvider.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
