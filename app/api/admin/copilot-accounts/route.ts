import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin, adminError } from '@/lib/adminAuth';

// GET /api/admin/copilot-accounts - 获取所有账号
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return adminError('未授权');
  }

  try {
    const accounts = await prisma.copilotAccount.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Failed to fetch copilot accounts:', error);
    return NextResponse.json({ error: '获取账号失败' }, { status: 500 });
  }
}

// POST /api/admin/copilot-accounts - 添加新账号
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return adminError('未授权');
  }

  try {
    const body = await request.json();

    // 批量重置所有账号月度用量
    if (body.action === 'resetAllQuota') {
      const result = await prisma.copilotAccount.updateMany({
        data: { quotaUsed: 0 },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    const { githubId, token, quotaLimit = 10 } = body;

    if (!githubId || !token) {
      return NextResponse.json({ error: 'GitHub ID和token必填' }, { status: 400 });
    }

    const account = await prisma.copilotAccount.create({
      data: {
        githubId,
        token,
        quotaLimit: parseFloat(quotaLimit)
      }
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error('Failed to create copilot account:', error);
    return NextResponse.json({ error: '创建账号失败' }, { status: 500 });
  }
}