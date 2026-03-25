import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyAdmin } from '../../../../src/lib/adminAuth';

// 获取所有用户的 Key（管理员）
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { keyName: { contains: search, mode: 'insensitive' } },
        { apiKey: { contains: search, mode: 'insensitive' } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [keys, total] = await Promise.all([
      db.aIKey.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, email: true, balance: true } },
          tier: { select: { name: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.aIKey.count({ where }),
    ]);

    return NextResponse.json({
      keys,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 管理员操作 Key（禁用/启用）
export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });

  try {
    const body = await request.json();
    const { keyId, status } = body;

    if (!keyId || !['active', 'disabled'].includes(status)) {
      return NextResponse.json({ error: '参数无效' }, { status: 400 });
    }

    const updated = await db.aIKey.update({
      where: { id: keyId },
      data: { status },
    });

    return NextResponse.json({ success: true, key: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
