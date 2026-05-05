import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../src/lib/prisma';
import { verifyAdmin, adminError } from '../../../../src/lib/adminAuth';

// GET /api/admin/copilot-accounts - 获取所有账号
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return adminError('未授权');
  }

  try {
    // 支持按 poolType 过滤
    const { searchParams } = new URL(request.url);
    const poolTypeFilter = searchParams.get('poolType');
    const whereFilter = (poolTypeFilter ? { poolType: poolTypeFilter } : {}) as any;

    // 第一遍：取出账号做一致性修复
    const rawAccounts = await prisma.copilotAccount.findMany({
      where: whereFilter,
      orderBy: { githubId: 'asc' },
    });

    // 查询所有绑定的 Key 信息（用于检测失效绑定）
    const boundKeyIds = rawAccounts.map((a) => a.boundAiKeyId).filter(Boolean) as string[];
    const boundKeys = boundKeyIds.length > 0
      ? await prisma.aIKey.findMany({
          where: { id: { in: boundKeyIds } },
          select: { id: true, keyName: true, lastUsedAt: true, status: true },
        })
      : [];
    const keyMap = Object.fromEntries(boundKeys.map((key) => [key.id, key]));

    // 查询反向：有 Key 指向这些账号但账号可能未标记绑定
    const allBoundKeys = await prisma.aIKey.findMany({
      where: { copilotAccountId: { in: rawAccounts.map(a => a.id) }, status: 'active' },
      select: { id: true, copilotAccountId: true, keyName: true, lastUsedAt: true, status: true, userId: true, createdAt: true },
    });
    const keyByAccountId = Object.fromEntries(allBoundKeys.map(k => [k.copilotAccountId!, k]));

    // 一致性修复（事务保护，原子操作）
    let repaired = false;
    const repairOps: any[] = [];

    for (const account of rawAccounts) {
      if (account.boundAiKeyId) {
        const boundKey = keyMap[account.boundAiKeyId];
        // 账号标记绑定，但 Key 已不存在/已禁用/已吊销 → 释放
        if (!boundKey || boundKey.status !== 'active') {
          repairOps.push(
            prisma.copilotAccount.update({
              where: { id: account.id },
              data: { status: 'active', boundAiKeyId: null, boundUserId: null, boundAt: null },
            })
          );
          repaired = true;
        }
      } else if (!account.boundAiKeyId && account.status !== 'inactive') {
        // 账号未标记绑定，但有活跃 Key 指向此账号 → 修复绑定
        const orphanKey = keyByAccountId[account.id];
        if (orphanKey) {
          repairOps.push(
            prisma.copilotAccount.update({
              where: { id: account.id },
              data: {
                status: 'bound',
                boundAiKeyId: orphanKey.id,
                boundUserId: orphanKey.userId,
                // 用 Key 的创建时间作为近似绑定时间（不覆盖为 now，保持时间线合理）
                boundAt: orphanKey.createdAt,
              },
            })
          );
          repaired = true;
        }
      }
    }

    if (repairOps.length > 0) {
      await prisma.$transaction(repairOps);
    }

    // 修复后重新查询，确保数据一致
    const accounts = repaired
      ? await prisma.copilotAccount.findMany({ where: whereFilter, orderBy: { githubId: 'asc' } })
      : rawAccounts;

    // 构建用户和 Key 映射（基于修复后的数据）
    const finalBoundUserIds = accounts.map((a) => a.boundUserId).filter(Boolean) as string[];
    const finalBoundUsers = finalBoundUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: finalBoundUserIds } },
          select: { id: true, email: true },
        })
      : [];
    const userMap = Object.fromEntries(finalBoundUsers.map((user) => [user.id, user]));

    const finalBoundKeyIds = accounts.map((a) => a.boundAiKeyId).filter(Boolean) as string[];
    const finalBoundKeys = finalBoundKeyIds.length > 0
      ? await prisma.aIKey.findMany({
          where: { id: { in: finalBoundKeyIds } },
          select: { id: true, keyName: true, lastUsedAt: true, status: true },
        })
      : [];
    const finalKeyMap = Object.fromEntries(finalBoundKeys.map((key) => [key.id, key]));

    const result = accounts.map((account) => ({
      ...account,
      boundUser: account.boundUserId ? userMap[account.boundUserId] || null : null,
      boundKey: account.boundAiKeyId ? finalKeyMap[account.boundAiKeyId] || null : null,
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
    const poolType: string = body.poolType ?? 'copilot';

    if (!githubId || !token) {
      return NextResponse.json({ error: '账号 ID 和 token 必填' }, { status: 400 });
    }

    const account = await prisma.copilotAccount.create({
      data: {
        poolType,
        githubId,
        token,
        quotaLimit: parseFloat(quotaLimit)
      } as any
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error('Failed to create copilot account:', error);
    return NextResponse.json({ error: '创建账号失败' }, { status: 500 });
  }
}