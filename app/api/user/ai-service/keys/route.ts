export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';
import { getAvailableTokenUsd, isAiKeyQuotaExhausted } from '../../../../../src/lib/aiKeyQuota';
import { ensureCopilotPoolKeyLease } from '../../../../../src/lib/copilotPool';
import { createNewApiToken, deleteNewApiToken, findNewApiTokenIdByName, getNewApiTokenPlaintextKeyByName, getNewApiTokenUsage, isNewApiRecordNotFoundError, mapWithConcurrencyLimit, quotaToUSD, repairAiKeyNewApiTokenId, updateNewApiToken, usdToQuota } from '../../../../../src/lib/newapi';

/** 生成混淆名称，防止上游识别客户身份 */
function obfuscateKeyName(userId: string, keyName: string): string {
  const hash = crypto.createHash('sha256').update(`${userId}-${keyName}-${Date.now()}`).digest('hex').slice(0, 8);
  return `proj-${hash}`;
}

async function repairMissingNewApiTokenIdsForUser(userId: string) {
  const missingKeys = await db.aIKey.findMany({
    where: {
      userId,
      newApiTokenId: null,
      newApiTokenName: { not: null },
      status: { in: ['active', 'disabled'] },
    },
    select: { id: true, newApiTokenName: true },
  });

  await mapWithConcurrencyLimit(missingKeys, 4, async (key) => {
    if (!key.newApiTokenName) return;
    try {
      const tokenId = await findNewApiTokenIdByName(key.newApiTokenName);
      if (tokenId) {
        await db.aIKey.update({
          where: { id: key.id },
          data: { newApiTokenId: tokenId },
        });
      }
    } catch (error: any) {
      console.warn(`[key-repair] restore token id failed for ${key.id}:`, error.message);
    }
  });
}

async function getNewApiTokenUsageWithRepair(key: {
  id: string;
  newApiTokenId: number | null;
  newApiTokenName?: string | null;
}) {
  if (!key.newApiTokenId) {
    return null;
  }

  try {
    return await getNewApiTokenUsage(key.newApiTokenId);
  } catch (error: any) {
    if (!isNewApiRecordNotFoundError(error)) {
      throw error;
    }

    const repairedTokenId = await repairAiKeyNewApiTokenId({
      id: key.id,
      newApiTokenId: null,
      newApiTokenName: key.newApiTokenName,
    });
    if (!repairedTokenId) {
      throw error;
    }

    key.newApiTokenId = repairedTokenId;
    return await getNewApiTokenUsage(repairedTokenId);
  }
}

async function updateNewApiTokenWithRepair(
  key: { id: string; newApiTokenId: number | null; newApiTokenName?: string | null },
  params: Parameters<typeof updateNewApiToken>[1]
) {
  const syncedParams = {
    ...params,
    name: params.name ?? key.newApiTokenName ?? undefined,
  };
  if (!key.newApiTokenId) {
    return;
  }

  try {
    await updateNewApiToken(key.newApiTokenId, syncedParams);
  } catch (error: any) {
    if (!isNewApiRecordNotFoundError(error)) {
      throw error;
    }

    const repairedTokenId = await repairAiKeyNewApiTokenId({
      id: key.id,
      newApiTokenId: null,
      newApiTokenName: key.newApiTokenName,
    });
    if (!repairedTokenId) {
      throw error;
    }

    key.newApiTokenId = repairedTokenId;
    await updateNewApiToken(repairedTokenId, syncedParams);
  }
}

async function syncCurrentUserKeyUsage(userId: string) {
  const creditConfig = await db.systemConfig.findUnique({ where: { key: 'ai_credit_limit' } });
  const creditLimit = creditConfig ? parseFloat(creditConfig.value) : 1;

  const keys = await db.aIKey.findMany({
    where: {
      userId,
      newApiTokenId: { not: null },
      status: { in: ['active', 'disabled'] },
    },
    select: {
      id: true,
      userId: true,
      newApiTokenId: true,
      newApiTokenName: true,
      status: true,
      totalUsed: true,
      monthUsed: true,
      lastRemoteUsedUsd: true,
      monthlyLimit: true,
      lastSyncAt: true,
      copilotAccountId: true,
      tier: { select: { channelGroup: true } },
    },
  });

  await mapWithConcurrencyLimit(keys, 4, async (key) => {
    try {
      const usage = await getNewApiTokenUsageWithRepair(key);
      if (!usage) return;
      const usedUSD = Math.round(quotaToUSD(usage.usedQuota) * 10000) / 10000;

      const txResult = await db.$transaction(async (tx) => {
        const currentKey = await tx.aIKey.findUnique({
          where: { id: key.id },
          select: {
            id: true,
            userId: true,
            status: true,
            totalUsed: true,
            monthUsed: true,
            lastRemoteUsedUsd: true,
            monthlyLimit: true,
            lastSyncAt: true,
          },
        });

        if (!currentKey) return { skipped: true, delta: 0, monthUsed: 0, monthlyLimit: null };

        const now = new Date();
        let remoteBaseline = currentKey.lastRemoteUsedUsd;
        let baselineReason: string | null = null;

        if (remoteBaseline == null) {
          remoteBaseline = currentKey.totalUsed > 0 && usedUSD < currentKey.totalUsed
            ? usedUSD
            : currentKey.totalUsed;
          baselineReason = currentKey.totalUsed > 0 && usedUSD < currentKey.totalUsed
            ? 'bootstrap-remote-reset'
            : 'bootstrap';
        } else if (usedUSD < remoteBaseline) {
          remoteBaseline = usedUSD;
          baselineReason = 'remote-counter-reset';
        }

        const delta = Math.round((usedUSD - remoteBaseline) * 10000) / 10000;
        if (delta <= 0) {
          if (baselineReason) {
            const updated = await tx.aIKey.updateMany({
              where: {
                id: currentKey.id,
                totalUsed: currentKey.totalUsed,
                lastRemoteUsedUsd: currentKey.lastRemoteUsedUsd,
              },
              data: {
                lastRemoteUsedUsd: usedUSD,
                lastSyncAt: now,
              },
            });

            if (updated.count === 0) {
              return { skipped: true, delta: 0, monthUsed: currentKey.monthUsed, monthlyLimit: currentKey.monthlyLimit };
            }
          }

          return { skipped: true, delta: 0, monthUsed: currentKey.monthUsed, monthlyLimit: currentKey.monthlyLimit };
        }

        let nextMonthUsed = currentKey.monthUsed;
        if (
          currentKey.lastSyncAt &&
          (currentKey.lastSyncAt.getMonth() !== now.getMonth() || currentKey.lastSyncAt.getFullYear() !== now.getFullYear())
        ) {
          nextMonthUsed = 0;
        }
        nextMonthUsed += delta;

        const updated = await tx.aIKey.updateMany({
          where: {
            id: currentKey.id,
            totalUsed: currentKey.totalUsed,
            lastRemoteUsedUsd: currentKey.lastRemoteUsedUsd,
          },
          data: {
            totalUsed: { increment: delta },
            monthUsed: nextMonthUsed,
            lastRemoteUsedUsd: usedUSD,
            lastUsedAt: now,
            lastSyncAt: now,
          },
        });

        if (updated.count === 0) {
          return { skipped: true, delta: 0, monthUsed: currentKey.monthUsed, monthlyLimit: currentKey.monthlyLimit };
        }

        await tx.user.update({
          where: { id: currentKey.userId },
          data: { aiBalance: { decrement: delta } },
        });

        if (delta >= 0.01) {
          await tx.transaction.create({
            data: {
              userId: currentKey.userId,
              type: 'ai_usage',
              amount: -delta,
              status: 'completed',
            },
          });
        }

        return {
          skipped: false,
          delta,
          monthUsed: nextMonthUsed,
          monthlyLimit: currentKey.monthlyLimit,
        };
      });

      // 回写绑定的号池账号用量
      if (key.copilotAccountId && !txResult.skipped && txResult.delta > 0) {
        try {
          await db.copilotAccount.update({
            where: { id: key.copilotAccountId },
            data: {
              quotaUsed: { increment: txResult.delta },
              lastUsed: new Date(),
            },
          });
        } catch (_) {}
      }

      const user = await db.user.findUnique({ where: { id: userId }, select: { aiBalance: true } });
      if (user && key.newApiTokenId) {
        // 重新读取 key 最新状态，防止并行处理时另一个 handler 已经禁用了这个 key
        const freshKey = await db.aIKey.findUnique({
          where: { id: key.id },
          select: { status: true },
        });
        const keyIsActive = freshKey?.status === 'active';
        const availableUsd = getAvailableTokenUsd({
          aiBalance: user.aiBalance,
          creditLimit,
          monthUsed: txResult.monthUsed,
          monthlyLimit: txResult.monthlyLimit,
        });
        const newQuota = usdToQuota(availableUsd);
        // 始终带上 status，避免并行更新把已禁用的 token 改回启用
        const tokenStatus = (keyIsActive && newQuota > 0) ? 1 : 2;
        try {
          await updateNewApiTokenWithRepair(key, {
            status: tokenStatus,
            remainQuota: newQuota,
            name: !usage.tokenName && key.newApiTokenName ? key.newApiTokenName : undefined,
            group: key.tier.channelGroup || 'default',
          });
        } catch (_) {}

        if (isAiKeyQuotaExhausted({
          aiBalance: user.aiBalance,
          creditLimit,
          monthUsed: txResult.monthUsed,
          monthlyLimit: txResult.monthlyLimit,
        })) {
          const activeKeys = await db.aIKey.findMany({
            where: { userId, status: 'active' },
            select: {
              id: true,
              newApiTokenId: true,
              copilotAccountId: true,
              tier: { select: { channelGroup: true } },
            },
          });
          for (const activeKey of activeKeys) {
            if (activeKey.copilotAccountId) {
              await db.$transaction([
                db.aIKey.update({
                  where: { id: activeKey.id },
                  data: { status: 'disabled', copilotAccountId: null },
                }),
                db.copilotAccount.update({
                  where: { id: activeKey.copilotAccountId },
                  data: { status: 'active', boundAiKeyId: null, boundUserId: null, boundAt: null },
                }),
              ]);
            } else {
              await db.aIKey.update({ where: { id: activeKey.id }, data: { status: 'disabled' } });
            }
            if (activeKey.newApiTokenId) {
              try {
                await updateNewApiTokenWithRepair(activeKey, {
                  status: 2,
                  group: activeKey.tier.channelGroup || 'default',
                });
              } catch (_) {}
            }
          }
        }
      }

      if (!txResult.skipped && txResult.monthlyLimit && txResult.monthUsed >= txResult.monthlyLimit && key.status === 'active') {
        if (key.copilotAccountId) {
          await db.$transaction([
            db.aIKey.update({
              where: { id: key.id },
              data: { status: 'disabled', copilotAccountId: null },
            }),
            db.copilotAccount.update({
              where: { id: key.copilotAccountId },
              data: { status: 'active', boundAiKeyId: null, boundUserId: null, boundAt: null },
            }),
          ]);
        } else {
          await db.aIKey.update({ where: { id: key.id }, data: { status: 'disabled' } });
        }
        if (key.newApiTokenId) {
          try {
            await updateNewApiTokenWithRepair(key, {
              status: 2,
              group: key.tier.channelGroup || 'default',
            });
          } catch (_) {}
        }
      }
    } catch (error: any) {
      console.warn(`[key-sync] sync failed for ${key.id}:`, error.message);
    }
  });
}

// 获取用户的所有 Key
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    await repairMissingNewApiTokenIdsForUser(payload.userId);

    let keys = await db.aIKey.findMany({
      where: { userId: payload.userId, status: { not: 'revoked' } },
      include: {
        tier: {
          select: {
            name: true,
            displayName: true,
            modelGroup: true,
            channelGroup: true,
            provider: { select: { type: true, displayName: true, baseUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const releasedPoolKeys = keys.filter((key) => {
      const isCopilotPool = key.tier?.channelGroup === 'copilot' || key.tier?.provider?.type === 'copilot-pool';
      return key.status === 'active' && isCopilotPool && !key.copilotAccountId;
    });

    if (releasedPoolKeys.length > 0) {
      await Promise.all(releasedPoolKeys.map(async (key) => {
        try {
          await ensureCopilotPoolKeyLease(key.id);
        } catch (error: any) {
          console.warn(`[pool-lease] ensure failed for key ${key.id}:`, error.message);
        }
      }));

      keys = await db.aIKey.findMany({
        where: { userId: payload.userId, status: { not: 'revoked' } },
        include: {
          tier: {
            select: {
              name: true,
              displayName: true,
              modelGroup: true,
              channelGroup: true,
              provider: { select: { type: true, displayName: true, baseUrl: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const repairedKeys = await Promise.all(keys.map(async (key) => {
      if (!key.apiKey.includes('*') || !key.newApiTokenName) {
        return key;
      }

      try {
        const plaintextKey = await getNewApiTokenPlaintextKeyByName(key.newApiTokenName);
        if (!plaintextKey) return key;

        await db.aIKey.update({
          where: { id: key.id },
          data: { apiKey: plaintextKey },
        });

        return { ...key, apiKey: plaintextKey };
      } catch (repairError: any) {
        console.warn(`[key-repair] restore apiKey failed for ${key.id}:`, repairError.message);
        return key;
      }
    }));

    return NextResponse.json({ keys: repairedKeys });
  } catch (error: any) {
    console.error('获取 Key 失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 创建新 Key
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const body = await request.json();
    const { keyName, tierId, monthlyLimit, label } = body;

    if (!keyName?.trim() || !tierId) {
      return NextResponse.json({ error: '请填写 Key 名称并选择套餐' }, { status: 400 });
    }
    if (monthlyLimit !== undefined && monthlyLimit !== null && (isNaN(Number(monthlyLimit)) || Number(monthlyLimit) < 0)) {
      return NextResponse.json({ error: '月度限额不能为负数' }, { status: 400 });
    }

    // 验证套餐存在，并获取 provider 信息
    const tier = await db.aIServiceTier.findUnique({
      where: { id: tierId },
      include: { provider: true },
    });
    if (!tier || !tier.isActive) {
      return NextResponse.json({ error: '套餐不存在或已下线' }, { status: 400 });
    }

    const providerType = tier.provider?.type || 'proxy';
    const isCopilotPool = tier.channelGroup === 'copilot' || providerType === 'copilot-pool';

    // 验证用户
    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    // 检查角色权限
    if (tier.requiredRole) {
      const userRole = user.role?.toLowerCase();
      const required = tier.requiredRole.toLowerCase();
      const hasAccess = required === 'enterprise'
        ? (userRole === 'enterprise' || userRole === 'admin')
        : userRole === required;
      if (!hasAccess) {
        return NextResponse.json({ error: `该套餐仅限${tier.requiredRole === 'enterprise' ? '企业用户' : '管理员'}使用` }, { status: 403 });
      }
    }

    // === 号池套餐额外校验 ===
    let boundCopilotAccount: any = null;
    if (isCopilotPool) {
      // 号池套餐必须是企业用户
      const userRole = user.role?.toLowerCase();
      if (userRole !== 'enterprise' && userRole !== 'admin') {
        return NextResponse.json({ error: '号池套餐仅限企业用户，请先申请企业认证' }, { status: 403 });
      }

      // AI 等级对应的 Key 上限
      const aiTierLimits: Record<string, { maxKeys: number; minBalance: number }> = {
        basic:   { maxKeys: 3,  minBalance: 50 },
        pro:     { maxKeys: 10, minBalance: 500 },
        premium: { maxKeys: 20, minBalance: 1000 },
      };
      const tierConfig = aiTierLimits[user.aiTier || 'basic'] || aiTierLimits.basic;

      // 检查 AI 余额门槛
      if (user.aiBalance < tierConfig.minBalance) {
        return NextResponse.json({
          error: `当前 AI 等级(${user.aiTier || 'basic'})要求 AI 余额 ≥ $${tierConfig.minBalance}，当前 $${user.aiBalance.toFixed(2)}`,
        }, { status: 400 });
      }

      // 检查号池 Key 数量上限
      const poolKeyCount = await db.aIKey.count({
        where: { userId: payload.userId, copilotAccountId: { not: null }, status: 'active' },
      });
      if (poolKeyCount >= tierConfig.maxKeys) {
        return NextResponse.json({
          error: `当前 AI 等级(${user.aiTier || 'basic'})最多创建 ${tierConfig.maxKeys} 个号池 Key，已有 ${poolKeyCount} 个。升级等级可创建更多`,
        }, { status: 400 });
      }

      // 查找空闲号池账号
      boundCopilotAccount = await db.copilotAccount.findFirst({
        where: { status: 'active', boundAiKeyId: null },
        orderBy: { quotaUsed: 'asc' },
      });
      if (!boundCopilotAccount) {
        // 自动提交扩容申请
        const pendingRequest = await db.poolExpansionRequest.findFirst({
          where: { userId: payload.userId, status: 'pending' },
        });
        if (!pendingRequest) {
          await db.poolExpansionRequest.create({
            data: {
              userId: payload.userId,
              currentTier: user.aiTier || 'basic',
              keyCount: poolKeyCount,
              maxKeys: tierConfig.maxKeys,
              message: '创建 Key 时号池无空闲账号，自动提交',
            },
          });
        }
        return NextResponse.json({
          error: '号池暂无空闲账号，已为您提交扩容申请，请等待管理员处理',
        }, { status: 400 });
      }
    }

    // 检查 AI 专用余额
    if (user.aiBalance <= 0) {
      return NextResponse.json({ error: 'AI 余额不足，请先从账户余额转入 AI 钱包' }, { status: 400 });
    }
    if (tier.minAiBalance > 0 && user.aiBalance < tier.minAiBalance) {
      return NextResponse.json({ error: `该套餐要求 AI 余额不低于 $${tier.minAiBalance}，当前 AI 余额 $${user.aiBalance.toFixed(2)}` }, { status: 400 });
    }

    // 限制 Key 数量（非号池套餐的通用限制）
    if (!isCopilotPool) {
      const isEnterprise = user.role === 'enterprise' || user.role === 'admin' || user.role === 'ADMIN';
      const maxKeys = isEnterprise ? 50 : 10;
      const existingCount = await db.aIKey.count({ where: { userId: payload.userId, status: { not: 'revoked' } } });
      if (existingCount >= maxKeys) {
        return NextResponse.json({ error: `最多创建 ${maxKeys} 个 Key` }, { status: 400 });
      }
    }

    // 限制套餐总 Key 数量（所有用户共享）
    if (tier.maxKeys > 0) {
      const tierTotalKeys = await db.aIKey.count({ where: { tierId, status: 'active' } });
      if (tierTotalKeys >= tier.maxKeys) {
        return NextResponse.json({ error: `该套餐已达上限（${tier.maxKeys} 个 Key），暂无名额` }, { status: 400 });
      }
    }

    // 在 new-api 创建 token，获取 new-api 实际生成的 key
    // 配额 = 用户 AI 余额 + 信用额度（cron 会每 5 分钟刷新，确保余额变动后同步）
    let newApiTokenId: number | null = null;
    let apiKey: string = '';
    const tokenName = obfuscateKeyName(payload.userId, keyName.trim());
    try {
      const creditConfig = await db.systemConfig.findUnique({ where: { key: 'ai_credit_limit' } });
      const creditLimit = creditConfig ? parseFloat(creditConfig.value) : 1;
      const maxQuotaUSD = getAvailableTokenUsd({
        aiBalance: user.aiBalance,
        creditLimit,
        monthUsed: 0,
        monthlyLimit: monthlyLimit == null || monthlyLimit === '' ? null : Number(monthlyLimit),
      });
      const quotaAmount = usdToQuota(maxQuotaUSD);
      const result = await createNewApiToken({
        name: tokenName,
        remainQuota: quotaAmount,
        group: tier.channelGroup || 'default',
      });
      newApiTokenId = result.id;
      apiKey = result.key;  // 使用 new-api 实际返回的 key
      try {
        await updateNewApiToken(result.id, {
          name: tokenName,
          remainQuota: quotaAmount,
          group: tier.channelGroup || 'default',
        });
      } catch (repairError: any) {
        console.warn(`[key-create] token name repair failed for ${result.id}:`, repairError.message);
      }
      console.log(`[key-create] success: id=${result.id}, key=${apiKey.slice(0,8)}...${apiKey.slice(-4)}, quota=$${maxQuotaUSD.toFixed(2)}`);
    } catch (e: any) {
      console.error('new-api 创建 token 失败:', e.message, e.stack);
      return NextResponse.json({
        error: `AI 网关同步失败: ${e.message?.slice(0, 120) || '未知错误'}`,
        details: e.message,
      }, { status: 502 });
    }

    // 存入数据库（号池套餐需要在事务内绑定账号）
    const createData: any = {
      userId: payload.userId,
      tierId,
      keyName: keyName.trim(),
      label: label?.trim() || null,
      apiKey: apiKey,
      newApiTokenId,
      newApiTokenName: tokenName,
      status: 'active',
      monthlyLimit: monthlyLimit || null,
      copilotAccountId: boundCopilotAccount?.id || null,
    };

    let aiKey: any;
    try {
      if (boundCopilotAccount) {
        // 事务：创建 Key + 绑定号池账号（防并发）
        const txResult = await db.$transaction(async (tx) => {
          // 二次检查账号仍然空闲（防并发竞争）
          const account = await tx.copilotAccount.findUnique({
            where: { id: boundCopilotAccount.id },
          });
          if (!account || account.boundAiKeyId) {
            throw new Error('POOL_RACE_CONDITION');
          }

          const key = await tx.aIKey.create({
            data: createData,
            include: { tier: { select: { name: true, displayName: true } } },
          });

          await tx.copilotAccount.update({
            where: { id: boundCopilotAccount.id },
            data: {
              status: 'bound',
              boundAiKeyId: key.id,
              boundUserId: payload.userId,
              boundAt: new Date(),
            },
          });

          return key;
        });
        aiKey = txResult;
      } else {
        aiKey = await db.aIKey.create({
          data: createData,
          include: { tier: { select: { name: true, displayName: true } } },
        });
      }
    } catch (dbError: any) {
      // DB 失败时清理已创建的 new-api token，防止孤立
      if (newApiTokenId) {
        try { await deleteNewApiToken(newApiTokenId); } catch (_) {}
      }
      if (dbError.message === 'POOL_RACE_CONDITION') {
        return NextResponse.json({ error: '号池账号已被其他请求抢占，请重试' }, { status: 409 });
      }
      throw dbError;
    }

    // 获取平台 API 域名配置
    const platformUrlConfig = await db.systemConfig.findUnique({ where: { key: 'ai_api_base_url' } });
    const platformBaseUrl = platformUrlConfig?.value || process.env.AI_API_BASE_URL || 'https://api.cardvela.com';

    return NextResponse.json({
      success: true,
      key: aiKey,
      configGuide: {
        baseUrl: platformBaseUrl,
        apiKey: aiKey.apiKey,
        modelGroup: tier.modelGroup,
        providerType,
        envSetup: {
          claudeCode: {
            ANTHROPIC_API_KEY: aiKey.apiKey,
            ANTHROPIC_BASE_URL: platformBaseUrl,
            CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: '1',
            note: 'Claude Code 用户必须设置 CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1，否则会因 beta 头不兼容导致调用失败',
          },
          cline: {
            apiKey: aiKey.apiKey,
            baseUrl: platformBaseUrl,
            note: 'Cline 插件在设置中填入 API Key 和 Base URL 即可',
          },
        },
      },
    });
  } catch (error: any) {
    console.error('创建 Key 失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
