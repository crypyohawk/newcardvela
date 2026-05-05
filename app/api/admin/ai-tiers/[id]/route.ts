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
    if (body.models !== undefined) updateData.models = body.models ? JSON.stringify(body.models) : null;
    if (body.maxKeys !== undefined) updateData.maxKeys = parseInt(body.maxKeys) || 0;
    if (body.requiredRole !== undefined) updateData.requiredRole = body.requiredRole || null;
    if (body.minAiBalance !== undefined) updateData.minAiBalance = parseFloat(body.minAiBalance) || 0;
    if (body.groupRatio !== undefined) updateData.groupRatio = isNaN(parseFloat(body.groupRatio)) ? 1 : parseFloat(body.groupRatio);

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

// 删除套餐（软删除：标记为不可用，保留数据完整性）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });

  // 只统计有效 Key（排除已软删除/吊销的），已吊销的 Key 不阻止套餐下线
  const activeKeyCount = await db.aIKey.count({ where: { tierId: params.id, status: { not: 'revoked' } } });
  if (activeKeyCount > 0) {
    return NextResponse.json({ error: `该套餐下有 ${activeKeyCount} 个有效 Key，无法删除。请先下线套餐。` }, { status: 400 });
  }

  // 软删除：标记为不可用，保留关联数据（已吊销的 Key、审计日志等）
  await db.aIServiceTier.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
