import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';

// 获取可用套餐列表（公开接口）
export async function GET(request: NextRequest) {
  try {
    const tiers = await db.aIServiceTier.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        pricePerMillionInput: true,
        pricePerMillionOutput: true,
        features: true,
        sortOrder: true,
        modelGroup: true,
        channelGroup: true,
        provider: { select: { id: true, name: true, displayName: true, type: true, baseUrl: true } },
      },
    });

    const result = tiers.map(t => ({
      ...t,
      features: t.features ? JSON.parse(t.features) : [],
    }));

    return NextResponse.json({ tiers: result });
  } catch (error: any) {
    console.error('获取套餐失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
