export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyAdmin } from '../../../../src/lib/adminAuth';

// 获取所有套餐（管理员）
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });

  const tiers = await db.aIServiceTier.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      // 只统计有效 Key（排除已吊销/删除的）
      _count: { select: { aiKeys: { where: { status: { not: 'revoked' } } } } },
      provider: { select: { id: true, name: true, displayName: true, type: true } },
    },
  });

  return NextResponse.json({ tiers });
}

// 创建套餐
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });

  try {
    const body = await request.json();
    const { name, displayName, description, pricePerMillionInput, pricePerMillionOutput, features, sortOrder } = body;

    if (!name?.trim() || !displayName?.trim()) {
      return NextResponse.json({ error: '名称不能为空' }, { status: 400 });
    }

    const { providerId, modelGroup, channelGroup, models, maxKeys, requiredRole, minAiBalance, groupRatio } = body;

    const tier = await db.aIServiceTier.create({
      data: {
        name: name.trim(),
        displayName: displayName.trim(),
        description: description || null,
        pricePerMillionInput: pricePerMillionInput || 3,
        pricePerMillionOutput: pricePerMillionOutput || 15,
        features: features ? JSON.stringify(features) : null,
        models: models ? JSON.stringify(models) : null,
        maxKeys: maxKeys ? parseInt(maxKeys) : 0,
        requiredRole: requiredRole || null,
        minAiBalance: minAiBalance ? parseFloat(minAiBalance) : 0,
        sortOrder: sortOrder || 0,
        providerId: providerId || null,
        modelGroup: modelGroup || 'claude',
        channelGroup: channelGroup || null,
        groupRatio: groupRatio != null && !isNaN(parseFloat(groupRatio)) ? parseFloat(groupRatio) : 1,
      },
      include: {
        provider: { select: { id: true, name: true, displayName: true, type: true } },
      },
    });

    return NextResponse.json({ success: true, tier });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: '套餐名称已存在' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
