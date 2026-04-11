export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../../src/lib/auth';
import { getAvailableTokenUsd } from '../../../../../../src/lib/aiKeyQuota';
import { getCopilotPoolCapacity } from '../../../../../../src/lib/copilotPool';
import { deleteNewApiToken, isNewApiRecordNotFoundError, repairAiKeyNewApiTokenId, updateNewApiToken, usdToQuota } from '../../../../../../src/lib/newapi';

async function ensureNewApiTokenId(aiKey: {
  id: string;
  newApiTokenId: number | null;
  newApiTokenName: string | null;
}) {
  return repairAiKeyNewApiTokenId(aiKey, { forceValidate: true });
}

async function updateNewApiTokenWithRepair(aiKey: {
  id: string;
  newApiTokenId: number | null;
  newApiTokenName: string | null;
}, params: Parameters<typeof updateNewApiToken>[1]) {
  const syncedParams = {
    ...params,
    name: params.name ?? aiKey.newApiTokenName ?? undefined,
  };
  const tokenId = await ensureNewApiTokenId(aiKey);
  if (!tokenId) {
    throw new Error('该 Key 未关联到 new-api token，无法同步到网关');
  }

  try {
    await updateNewApiToken(tokenId, syncedParams);
    aiKey.newApiTokenId = tokenId;
    return tokenId;
  } catch (error: any) {
    if (!isNewApiRecordNotFoundError(error)) {
      throw error;
    }

    const repairedTokenId = await repairAiKeyNewApiTokenId({
      ...aiKey,
      newApiTokenId: null,
    });
    if (!repairedTokenId) {
      throw error;
    }

    await updateNewApiToken(repairedTokenId, syncedParams);
    aiKey.newApiTokenId = repairedTokenId;
    return repairedTokenId;
  }
}

async function disableAndDeleteNewApiTokenWithRepair(aiKey: {
  id: string;
  newApiTokenId: number | null;
  newApiTokenName: string | null;
}) {
  const tokenId = await ensureNewApiTokenId(aiKey);
  if (!tokenId) {
    return;
  }

  let resolvedTokenId = tokenId;
  try {
    await updateNewApiToken(resolvedTokenId, {
      status: 2,
      name: aiKey.newApiTokenName ?? undefined,
    });
  } catch (error: any) {
    if (!isNewApiRecordNotFoundError(error)) {
      throw error;
    }
    const repairedTokenId = await repairAiKeyNewApiTokenId({
      ...aiKey,
      newApiTokenId: null,
    });
    if (!repairedTokenId) {
      throw error;
    }
    resolvedTokenId = repairedTokenId;
    await updateNewApiToken(resolvedTokenId, {
      status: 2,
      name: aiKey.newApiTokenName ?? undefined,
    });
  }

  await deleteNewApiToken(resolvedTokenId);
}

// 获取单个 Key 详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const aiKey = await db.aIKey.findFirst({
      where: { id: params.id, userId: payload.userId },
      include: { tier: true },
    });

    if (!aiKey) return NextResponse.json({ error: 'Key 不存在' }, { status: 404 });

    return NextResponse.json({ key: aiKey });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 更新 Key（改名、设上限、启用/禁用）
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const aiKey = await db.aIKey.findFirst({
      where: { id: params.id, userId: payload.userId },
      include: {
        tier: {
          include: {
            provider: true,
          },
        },
      },
    });
    if (!aiKey) return NextResponse.json({ error: 'Key 不存在' }, { status: 404 });

    const body = await request.json();
    const updateData: any = {};

    if (body.keyName !== undefined) updateData.keyName = body.keyName.trim();
    if (body.label !== undefined) updateData.label = body.label?.trim() || null;
    if (body.monthlyLimit !== undefined) {
      updateData.monthlyLimit = (body.monthlyLimit === null || body.monthlyLimit === '' || body.monthlyLimit === 0) ? null : Number(body.monthlyLimit);
      if (updateData.monthlyLimit !== null && (isNaN(updateData.monthlyLimit) || updateData.monthlyLimit < 0)) {
        return NextResponse.json({ error: '月度限额不能为负数' }, { status: 400 });
      }
    }
    if (body.status !== undefined && ['active', 'disabled'].includes(body.status)) {
      const newApiTokenId = await ensureNewApiTokenId(aiKey);
      if (!newApiTokenId) {
        return NextResponse.json({ error: '该 Key 未关联到 new-api token，无法同步启用/禁用，请先修复 token 绑定' }, { status: 409 });
      }

      const isCopilotPool = aiKey.tier.channelGroup === 'cardvela' || aiKey.tier.provider?.type === 'copilot-pool';

      // === 启用号池 Key：检查容量 ===
      if (body.status === 'active' && isCopilotPool && aiKey.status === 'disabled') {
        const user = await db.user.findUnique({ where: { id: payload.userId }, select: { aiBalance: true } });
        if (!user || user.aiBalance <= 0) {
          return NextResponse.json({ error: 'AI 余额不足，无法启用 Key，请先从账户余额转入 AI 钱包' }, { status: 400 });
        }

        const creditConfig = await db.systemConfig.findUnique({ where: { key: 'ai_credit_limit' } });
        const creditLimit = creditConfig ? parseFloat(creditConfig.value) : 1;
        const availableUsd = getAvailableTokenUsd({
          aiBalance: user.aiBalance,
          creditLimit,
          monthUsed: aiKey.monthUsed,
          monthlyLimit: aiKey.monthlyLimit,
        });
        if (availableUsd <= 0) {
          return NextResponse.json({ error: '当前 Key 无可用额度，可能月度限额已耗尽，请充值或调整月限额后再启用' }, { status: 400 });
        }

        // 检查号池总容量
        const capacity = await getCopilotPoolCapacity();
        if (!capacity.available) {
          return NextResponse.json({ error: `号池容量已满（${capacity.activeKeys}/${capacity.maxKeys} 个 Key），请稍后再试` }, { status: 400 });
        }

        // 启用 Key + 同步 new-api token
        try {
          const freshQuota = usdToQuota(availableUsd);
          await updateNewApiTokenWithRepair(aiKey, {
            status: 1,
            remainQuota: freshQuota,
            group: aiKey.tier.channelGroup || 'default',
            expiredTime: -1,
          });
        } catch (e: any) {
          console.error('同步 new-api 启用失败:', e.message);
          return NextResponse.json({
            error: '同步网关状态失败，请检查 new-api 管理认证配置',
            details: e.message,
          }, { status: 502 });
        }

        const updated = await db.aIKey.update({
          where: { id: params.id },
          data: { status: 'active' },
          include: { tier: { select: { name: true, displayName: true } } },
        });
        return NextResponse.json({ success: true, key: updated });
      }

      // === 启用非号池 Key：普通余额检查 ===
      if (body.status === 'active') {
        const user = await db.user.findUnique({ where: { id: payload.userId }, select: { aiBalance: true } });
        if (!user || user.aiBalance <= 0) {
          return NextResponse.json({ error: 'AI 余额不足，无法启用 Key，请先从账户余额转入 AI 钱包' }, { status: 400 });
        }

        const creditConfig = await db.systemConfig.findUnique({ where: { key: 'ai_credit_limit' } });
        const creditLimit = creditConfig ? parseFloat(creditConfig.value) : 1;
        const availableUsd = getAvailableTokenUsd({
          aiBalance: user.aiBalance,
          creditLimit,
          monthUsed: aiKey.monthUsed,
          monthlyLimit: aiKey.monthlyLimit,
        });
        if (availableUsd <= 0) {
          return NextResponse.json({ error: '当前 Key 无可用额度，可能月度限额已耗尽，请充值或调整月限额后再启用' }, { status: 400 });
        }
      }
      updateData.status = body.status;

      // 同步到 new-api（启用时同时刷新额度，避免 quota=0 导致 new-api 仍显示耗尽）
      try {
        const tokenUpdate: any = {
          status: body.status === 'active' ? 1 : 2,
          group: aiKey.tier.channelGroup || 'default',
        };

        if (body.status === 'active') {
          const user = await db.user.findUnique({ where: { id: payload.userId }, select: { aiBalance: true } });
          const creditConfig = await db.systemConfig.findUnique({ where: { key: 'ai_credit_limit' } });
          const creditLimit = creditConfig ? parseFloat(creditConfig.value) : 1;
          const freshQuota = usdToQuota(getAvailableTokenUsd({
            aiBalance: user?.aiBalance || 0,
            creditLimit,
            monthUsed: aiKey.monthUsed,
            monthlyLimit: aiKey.monthlyLimit,
          }));
          if (freshQuota <= 0) {
            return NextResponse.json({ error: '当前 Key 无可用额度，可能月度限额已耗尽，请充值或调整月限额后再启用' }, { status: 400 });
          }
          tokenUpdate.remainQuota = freshQuota;
          tokenUpdate.status = 1;
        }

        await updateNewApiTokenWithRepair(aiKey, tokenUpdate);
      } catch (e: any) {
        console.error('同步 new-api 状态失败:', e.message);
        return NextResponse.json({
          error: '同步网关状态失败，请检查 new-api 管理认证配置',
          details: e.message,
        }, { status: 502 });
      }
    }

    // 禁用/启用 Key
    if (body.status === 'disabled' || body.status === 'active') {
      const updated = await db.aIKey.update({
        where: { id: params.id },
        data: updateData,
        include: { tier: { select: { name: true, displayName: true } } },
      });
      return NextResponse.json({ success: true, key: updated });
    }

    const updated = await db.aIKey.update({
      where: { id: params.id },
      data: updateData,
      include: { tier: { select: { name: true, displayName: true } } },
    });

    return NextResponse.json({ success: true, key: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 删除 Key（软删除：标记为 revoked + 禁用/删除 new-api 侧 token，防止用户保存 key 后继续调用）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const aiKey = await db.aIKey.findFirst({
      where: { id: params.id, userId: payload.userId },
    });
    if (!aiKey) return NextResponse.json({ error: 'Key 不存在' }, { status: 404 });

    // 先禁用再删除 new-api 侧 token，确保 key 立即失效
    if (aiKey.newApiTokenId || aiKey.newApiTokenName) {
      try {
        // 先禁用（立即生效，防止在删除过程中仍可调用）
        await disableAndDeleteNewApiTokenWithRepair(aiKey);
      } catch (e: any) {
        console.error('禁用 new-api token 失败:', e.message);
      }
    }

    // 软删除：标记为 revoked，保留记录用于审计
    await db.aIKey.update({
      where: { id: params.id },
      data: { status: 'revoked' },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
