import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/prisma';
import { verifyAdmin, adminError } from '../../../../src/lib/adminAuth';

// GET /api/admin/perplexity-accounts - 列表
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError('未授权');

  try {
    const accounts = await prisma.perplexityAccount.findMany({
      orderBy: { port: 'asc' },
    });
    // Cookie 太长，列表只返回长度提示
    const sanitized = accounts.map((a) => ({
      ...a,
      cookieLength: a.cookie?.length || 0,
      cookiePreview: a.cookie ? a.cookie.slice(0, 60) + '...' : '',
      cookie: undefined, // 列表不返回完整 cookie
    }));
    return NextResponse.json(sanitized);
  } catch (e: any) {
    console.error('Failed to fetch perplexity accounts:', e);
    return NextResponse.json({ error: e.message || '加载失败' }, { status: 500 });
  }
}

// POST /api/admin/perplexity-accounts - 新建
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError('未授权');

  try {
    const body = await request.json();
    const { email, password, cookie, port, newApiChannelId, apiKey, accountType, expiresAt, notes } = body;

    if (!email || !cookie || !port) {
      return NextResponse.json({ error: 'email, cookie, port 必填' }, { status: 400 });
    }

    const account = await prisma.perplexityAccount.create({
      data: {
        email,
        password: password || null,
        cookie,
        port: Number(port),
        newApiChannelId: newApiChannelId ? Number(newApiChannelId) : null,
        apiKey: apiKey || null,
        accountType: accountType || 'pro',
        status: 'active',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        notes: notes || null,
      },
    });
    return NextResponse.json({ ...account, cookie: undefined });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: '邮箱或端口已存在' }, { status: 409 });
    }
    console.error('Failed to create perplexity account:', e);
    return NextResponse.json({ error: e.message || '创建失败' }, { status: 500 });
  }
}
