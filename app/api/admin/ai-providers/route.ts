import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyAdmin } from '../../../../src/lib/adminAuth';

// 获取所有上游服务商
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });

  const providers = await db.aIProvider.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { tiers: true } } },
  });

  return NextResponse.json({ providers });
}

// 创建上游服务商
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });

  try {
    const body = await request.json();
    const { name, displayName, type, baseUrl, masterKey, config, sortOrder } = body;

    if (!name?.trim() || !displayName?.trim()) {
      return NextResponse.json({ error: '名称不能为空' }, { status: 400 });
    }

    if (type !== 'proxy') {
      return NextResponse.json({ error: '类型必须为 proxy' }, { status: 400 });
    }

    const provider = await db.aIProvider.create({
      data: {
        name: name.trim().toLowerCase(),
        displayName: displayName.trim(),
        type,
        baseUrl: baseUrl || null,
        masterKey: masterKey || null,
        config: config ? JSON.stringify(config) : null,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json({ success: true, provider });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: '服务商名称已存在' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
