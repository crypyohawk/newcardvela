export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../../src/lib/auth';
import { getAvailableTokenUsd } from '../../../../../../src/lib/aiKeyQuota';
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
  const tokenId = await ensureNewApiTokenId(aiKey);
  if (!tokenId) {
    throw new Error('该 Key 未关联到 new-api token，无法同步到网关');
  }

  try {
    await updateNewApiToken(tokenId, params);
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

    await updateNewApiToken(repairedTokenId, params);
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

  try {
    await updateNewApiToken(tokenId, { status: 2 });
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
    aiKey.newApiTokenId = repairedTokenId;
    await updateNewApiToken(repairedTokenId, { status: 2 });
  }

  await deleteNewApiToken(aiKey.newApiTokenId!);
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

      const isCopilotPool = aiKey.tier.channelGroup === 'copilot' || aiKey.tier.provider?.type === 'copilot-pool';

      // === 启用号池 Key：自动绑定空闲号池账号 ===
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

        // 清理旧版本遗留的禁用 key 绑定，避免账号看似被占用却无法重绑
        const staleConditions: any[] = [];
        if (aiKey.copilotAccountId) staleConditions.push({ id: aiKey.copilotAccountId });
        staleConditions.push({ boundAiKeyId: params.id });

        const staleBoundAccounts = await db.copilotAccount.findMany({
          where: { OR: staleConditions },
        });
        if (staleBoundAccounts.length > 0) {
          await db.$transaction([
            db.aIKey.update({
              where: { id: params.id },
              data: { copilotAccountId: null },
            }),
            ...staleBoundAccounts.map((acc) =>
              db.copilotAccount.update({
                where: { id: acc.id },
                data: { status: 'active', boundAiKeyId: null, boundUserId: null, boundAt: null },
              })
            ),
          ]);
        }

        // 查找空闲号池账号（用量最低优先）
        const idleAccount = await db.copilotAccount.findFirst({
          where: { status: 'active', boundAiKeyId: null },
          orderBy: { quotaUsed: 'asc' },
        });
        if (!idleAccount) {
          return NextResponse.json({ error: '号池暂无空闲账号，请稍后再试或联系管理员' }, { status: 400 });
        }

        // 事务绑定（防并发竞争）
        try {
          const txResult = await db.$transaction(async (tx) => {
            const account = await tx.copilotAccount.findUnique({
              where: { id: idleAccount.id },
            });
            if (!account || account.boundAiKeyId) {
              throw new Error('POOL_RACE_CONDITION');
            }

            const updatedKey = await tx.aIKey.update({
              where: { id: params.id },
              data: { status: 'active', copilotAccountId: idleAccount.id },
              include: { tier: { select: { name: true, displayName: true } } },
            });

            await tx.copilotAccount.update({
              where: { id: idleAccount.id },
              data: {
                status: 'bound',
                boundAiKeyId: params.id,
                boundUserId: payload.userId,
                boundAt: new Date(),
              },
            });

            return updatedKey;
          });

          // 同步启用 new-api token + 刷新配额 + 确保 group 正确
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
            await db.$transaction([
              db.aIKey.update({
                where: { id: params.id },
                data: { status: 'disabled', copilotAccountId: null },
              }),
              db.copilotAccount.update({
                where: { id: idleAccount.id },
                data: { status: 'active', boundAiKeyId: null, boundUserId: null, boundAt: null },
              }),
            ]);
            return NextResponse.json({
              error: '同步网关状态失败，请检查 new-api 管理认证配置',
              details: e.message,
            }, { status: 502 });
          }

          console.log(`[pool-rebind] Key ${params.id} 重新绑定号池账号 ${idleAccount.githubId}`);
          return NextResponse.json({ success: true, key: txResult });
        } catch (e: any) {
          if (e.message === 'POOL_RACE_CONDITION') {
            return NextResponse.json({ error: '号池账号已被其他请求抢占，请重试' }, { status: 409 });
          }
          throw e;
        }
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

    // 禁用 Key 时解绑号池账号，合并事务防止数据不一致
    if (body.status === 'disabled' && aiKey.copilotAccountId) {
      const [updated] = await db.$transaction([
        db.aIKey.update({
          where: { id: params.id },
          data: { ...updateData, copilotAccountId: null },
          include: { tier: { select: { name: true, displayName: true } } },
        }),
        db.copilotAccount.update({
          where: { id: aiKey.copilotAccountId },
          data: { status: 'active', boundAiKeyId: null, boundUserId: null, boundAt: null },
        }),
      ]);
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
    // 如果有绑定号池账号，解绑释放
    await db.$transaction(async (tx) => {
      await tx.aIKey.update({
        where: { id: params.id },
        data: { status: 'revoked', copilotAccountId: null },
      });
      if (aiKey.copilotAccountId) {
        await tx.copilotAccount.update({
          where: { id: aiKey.copilotAccountId },
          data: { status: 'active', boundAiKeyId: null, boundUserId: null, boundAt: null },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
