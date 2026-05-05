import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/prisma';
import { verifyAdmin, adminError } from '../../../../../src/lib/adminAuth';

// GET /api/admin/perplexity-accounts/[id] - 详情（含完整 cookie）
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError('未授权');

  try {
    const account = await prisma.perplexityAccount.findUnique({
      where: { id: params.id },
    });
    if (!account) return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    return NextResponse.json(account);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '查询失败' }, { status: 500 });
  }
}

// PUT /api/admin/perplexity-accounts/[id] - 更新（支持只更新 cookie）
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError('未授权');

  try {
    const body = await request.json();
    const data: any = {};
    const allowed = [
      'email', 'password', 'cookie', 'port', 'newApiChannelId', 'apiKey',
      'accountType', 'status', 'expiresAt', 'notes', 'lastError',
    ];
    for (const k of allowed) {
      if (body[k] !== undefined) {
        if (k === 'expiresAt') data[k] = body[k] ? new Date(body[k]) : null;
        else if (k === 'port' || k === 'newApiChannelId') data[k] = body[k] ? Number(body[k]) : null;
        else data[k] = body[k];
      }
    }
    const account = await prisma.perplexityAccount.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ ...account, cookie: undefined });
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    if (e.code === 'P2002') return NextResponse.json({ error: '邮箱或端口冲突' }, { status: 409 });
    console.error('Failed to update perplexity account:', e);
    return NextResponse.json({ error: e.message || '更新失败' }, { status: 500 });
  }
}

// DELETE /api/admin/perplexity-accounts/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError('未授权');

  try {
    await prisma.perplexityAccount.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    return NextResponse.json({ error: e.message || '删除失败' }, { status: 500 });
  }
}
