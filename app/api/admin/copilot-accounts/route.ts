import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/prisma';
import { verifyAdmin, adminError } from '../../../../src/lib/adminAuth';

// GET /api/admin/copilot-accounts - 获取所有账号
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return adminError('未授权');
  }

  try {
    const accounts = await prisma.copilotAccount.findMany({
      orderBy: { githubId: 'asc' },
    });

    // 查询绑定用户信息
    const boundUserIds = accounts.map((account) => account.boundUserId).filter(Boolean) as string[];
    const boundUsers = boundUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: boundUserIds } },
          select: { id: true, email: true },
        })
      : [];
    const userMap = Object.fromEntries(boundUsers.map((user) => [user.id, user]));

    // 查询绑定的 AIKey 信息
    const boundKeyIds = accounts.map((account) => account.boundAiKeyId).filter(Boolean) as string[];
    const boundKeys = boundKeyIds.length > 0
      ? await prisma.aIKey.findMany({
          where: { id: { in: boundKeyIds } },
          select: { id: true, keyName: true, lastUsedAt: true, status: true },
        })
      : [];
    const keyMap = Object.fromEntries(boundKeys.map((key) => [key.id, key]));

    const result = accounts.map((account) => ({
      ...account,
      boundUser: account.boundUserId ? userMap[account.boundUserId] || null : null,
      boundKey: account.boundAiKeyId ? keyMap[account.boundAiKeyId] || null : null,
    }));

    return NextResponse.json(result);
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