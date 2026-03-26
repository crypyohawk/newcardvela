export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';
import { verifyAdmin } from '../../../../../src/lib/adminAuth';

// 更新套餐
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
    if (body.description !== undefined) updateData.description = body.description;
    if (body.pricePerMillionInput !== undefined) updateData.pricePerMillionInput = body.pricePerMillionInput;
    if (body.pricePerMillionOutput !== undefined) updateData.pricePerMillionOutput = body.pricePerMillionOutput;
    if (body.features !== undefined) updateData.features = JSON.stringify(body.features);
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
    if (body.providerId !== undefined) updateData.providerId = body.providerId || null;
    if (body.modelGroup !== undefined) updateData.modelGroup = body.modelGroup;
    if (body.channelGroup !== undefined) updateData.channelGroup = body.channelGroup || null;

    const tier = await db.aIServiceTier.update({
      where: { id: params.id },
      data: updateData,
      include: {
        provider: { select: { id: true, name: true, displayName: true, type: true } },
      },
    });

    return NextResponse.json({ success: true, tier });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 删除套餐（仅无关联 Key 时）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });

  const keyCount = await db.aIKey.count({ where: { tierId: params.id } });
  if (keyCount > 0) {
    return NextResponse.json({ error: `该套餐下有 ${keyCount} 个 Key，无法删除。请先下线套餐。` }, { status: 400 });
  }

  await db.aIServiceTier.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
