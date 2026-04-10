import { NextRequest, NextResponse } from 'next/server';
import { getAvailableTokenUsd, isAiKeyQuotaExhausted } from '../../../../src/lib/aiKeyQuota';
import { findNewApiTokenIdByName, getAllNewApiLogs, getNewApiChannels, getNewApiTokenUsage, isNewApiRecordNotFoundError, repairAiKeyNewApiTokenId, updateNewApiToken, quotaToUSD, usdToQuota } from '../../../../src/lib/newapi';
import { db } from '../../../../src/lib/db';
import { isCopilotPoolTier } from '../../../../src/lib/copilotPool';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const STATS_SYNC_INTERVAL_SECONDS = 2 * 60 * 60;
const STATS_LAST_SYNC_KEY = 'ai_stats_last_sync_at';
const STATS_LAST_LOG_ID_KEY = 'ai_stats_last_log_id';

function getMonthStartTimestamp(date: Date) {
  return Math.floor(new Date(date.getFullYear(), date.getMonth(), 1).getTime() / 1000);
}

function startOfUtcDayFromTimestamp(timestamp: number) {
  const date = new Date(timestamp * 1000);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function setSystemConfigValue(key: string, value: string) {
  await db.systemConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

async function syncUsageStatsIfDue() {
  const now = new Date();
  const nowTimestamp = Math.floor(now.getTime() / 1000);
  const [lastSyncConfig, lastLogIdConfig] = await Promise.all([
    db.systemConfig.findUnique({ where: { key: STATS_LAST_SYNC_KEY } }),
    db.systemConfig.findUnique({ where: { key: STATS_LAST_LOG_ID_KEY } }),
  ]);

  const lastSyncTimestamp = Number(lastSyncConfig?.value || 0);
  const lastLogId = Number(lastLogIdConfig?.value || 0);
  const secondsSinceLastSync = lastSyncTimestamp > 0 ? nowTimestamp - lastSyncTimestamp : null;

  if (secondsSinceLastSync !== null && secondsSinceLastSync < STATS_SYNC_INTERVAL_SECONDS) {
    return {
      skipped: true,
      reason: 'interval-not-reached',
      lastSyncTimestamp,
      nextRunInSeconds: STATS_SYNC_INTERVAL_SECONDS - secondsSinceLastSync,
    };
  }

  if (lastSyncTimestamp > 0) {
    const lastSyncDate = new Date(lastSyncTimestamp * 1000);
    if (lastSyncDate.getFullYear() !== now.getFullYear() || lastSyncDate.getMonth() !== now.getMonth()) {
      await db.aIKey.updateMany({
        where: { status: { not: 'revoked' } },
        data: {
          monthRequestCount: 0,
          monthPromptTokens: 0,
          monthCompletionTokens: 0,
        },
      });
    }
  }

  const startTimestamp = lastSyncTimestamp || getMonthStartTimestamp(now);
  const allLogs = await getAllNewApiLogs({
    startTimestamp,
    maxPages: 20,
  });

  const logs = allLogs.logs
    .filter((log) => log.created_at > lastSyncTimestamp || (log.created_at === lastSyncTimestamp && log.id > lastLogId))
    .sort((left, right) => left.created_at - right.created_at || left.id - right.id);

  const keys = await db.aIKey.findMany({
    where: {
      status: { not: 'revoked' },
      newApiTokenName: { not: null },
    },
    select: {
      id: true,
      newApiTokenName: true,
    },
  });

  const keyByTokenName = new Map(keys.map((key) => [key.newApiTokenName!, key.id]));
  const keyAggregates = new Map<string, {
    requestCount: number;
    promptTokens: number;
    completionTokens: number;
    lastTimestamp: number;
  }>();
  const dailyAggregates = new Map<string, {
    aiKeyId: string;
    date: Date;
    requestCount: number;
    promptTokens: number;
    completionTokens: number;
    cost: number;
  }>();

  // 构建 channelId → CopilotAccount 映射，用于按实际渠道归因用量
  const copilotAccounts = await db.copilotAccount.findMany({
    where: { newApiChannelId: { not: null } },
    select: { id: true, newApiChannelId: true },
  });
  const channelToAccountId = new Map<number, string>();
  for (const acc of copilotAccounts) {
    if (acc.newApiChannelId) channelToAccountId.set(acc.newApiChannelId, acc.id);
  }
  const channelCostMap = new Map<string, { cost: number; lastUsed: number }>();

  let processedLogs = 0;
  let matchedLogs = 0;
  let unmatchedLogs = 0;
  let maxSeenTimestamp = lastSyncTimestamp;
  let maxSeenLogId = lastLogId;

  for (const log of logs) {
    processedLogs += 1;
    maxSeenTimestamp = log.created_at;
    maxSeenLogId = log.id;

    const aiKeyId = keyByTokenName.get(log.token_name || '');
    if (!aiKeyId) {
      unmatchedLogs += 1;
      continue;
    }

    matchedLogs += 1;
    const promptTokens = Math.max(0, Number(log.prompt_tokens) || 0);
    const completionTokens = Math.max(0, Number(log.completion_tokens) || 0);
    const cost = quotaToUSD(log.quota || 0);
    const day = startOfUtcDayFromTimestamp(log.created_at);

    // 按实际命中的渠道累计费用
    if (log.channel && cost > 0) {
      const accountId = channelToAccountId.get(log.channel);
      if (accountId) {
        const existing = channelCostMap.get(accountId) || { cost: 0, lastUsed: 0 };
        existing.cost += cost;
        existing.lastUsed = Math.max(existing.lastUsed, log.created_at);
        channelCostMap.set(accountId, existing);
      }
    }

    const keyAggregate = keyAggregates.get(aiKeyId) || {
      requestCount: 0,
      promptTokens: 0,
      completionTokens: 0,
      lastTimestamp: log.created_at,
    };
    keyAggregate.requestCount += 1;
    keyAggregate.promptTokens += promptTokens;
    keyAggregate.completionTokens += completionTokens;
    keyAggregate.lastTimestamp = Math.max(keyAggregate.lastTimestamp, log.created_at);
    keyAggregates.set(aiKeyId, keyAggregate);

    const dailyKey = `${aiKeyId}:${day.toISOString()}`;
    const dailyAggregate = dailyAggregates.get(dailyKey) || {
      aiKeyId,
      date: day,
      requestCount: 0,
      promptTokens: 0,
      completionTokens: 0,
      cost: 0,
    };
    dailyAggregate.requestCount += 1;
    dailyAggregate.promptTokens += promptTokens;
    dailyAggregate.completionTokens += completionTokens;
    dailyAggregate.cost += cost;
    dailyAggregates.set(dailyKey, dailyAggregate);
  }

  await db.$transaction(async (tx) => {
    for (const [aiKeyId, aggregate] of keyAggregates.entries()) {
      await tx.aIKey.update({
        where: { id: aiKeyId },
        data: {
          totalRequestCount: { increment: aggregate.requestCount },
          monthRequestCount: { increment: aggregate.requestCount },
          totalPromptTokens: { increment: aggregate.promptTokens },
          totalCompletionTokens: { increment: aggregate.completionTokens },
          monthPromptTokens: { increment: aggregate.promptTokens },
          monthCompletionTokens: { increment: aggregate.completionTokens },
          lastStatsSyncAt: new Date(aggregate.lastTimestamp * 1000),
        },
      });
    }

    for (const aggregate of dailyAggregates.values()) {
      await tx.aIKeyDailyStat.upsert({
        where: {
          aiKeyId_date: {
            aiKeyId: aggregate.aiKeyId,
            date: aggregate.date,
          },
        },
        update: {
          requestCount: { increment: aggregate.requestCount },
          promptTokens: { increment: aggregate.promptTokens },
          completionTokens: { increment: aggregate.completionTokens },
          cost: { increment: aggregate.cost },
        },
        create: aggregate,
      });
    }
  });

  // 按实际渠道回写号池账号用量（替代旧的按绑定账号归因）
  for (const [accountId, { cost, lastUsed }] of channelCostMap.entries()) {
    try {
      await db.copilotAccount.update({
        where: { id: accountId },
        data: {
          quotaUsed: { increment: Math.round(cost * 10000) / 10000 },
          lastUsed: new Date(lastUsed * 1000),
        },
      });
    } catch (e: any) {
      console.warn(`[cron] 按渠道回写号池账号用量失败: account=${accountId}, error=${e.message}`);
    }
  }

  await Promise.all([
    setSystemConfigValue(STATS_LAST_SYNC_KEY, String(processedLogs > 0 ? maxSeenTimestamp : nowTimestamp)),
    setSystemConfigValue(STATS_LAST_LOG_ID_KEY, String(processedLogs > 0 ? maxSeenLogId : lastLogId)),
  ]);

  return {
    skipped: false,
    startTimestamp,
    processedLogs,
    matchedLogs,
    unmatchedLogs,
    affectedKeys: keyAggregates.size,
    channelAttributions: channelCostMap.size,
    truncated: allLogs.truncated,
    lastSyncTimestamp: processedLogs > 0 ? maxSeenTimestamp : nowTimestamp,
    lastLogId: processedLogs > 0 ? maxSeenLogId : lastLogId,
  };
}

/**
 * 定时任务：按 new-api 用量同步本地扣费，并处理号池自动解绑
 * 由 crontab 定期调用（建议 5 分钟）
 *
 * new-api 负责真实用量统计；平台负责把用量同步成本地 aiBalance/聚合字段。
 *
 * GET /api/cron/sync-usage?secret=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET || process.env.NEW_API_WEBHOOK_SECRET;
    if (!cronSecret) {
      console.error('[cron] CRON_SECRET 未配置');
      return NextResponse.json({ error: '未配置' }, { status: 503 });
    }

    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    if (secret !== cronSecret) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    console.log('[cron] 开始同步 Key 用量与号池状态检查...');
    const syncResult = await syncKeyUsages();
    const statsSyncResult = await syncUsageStatsIfDue();
    const autoDisableResult = await autoDisableIdleCopilotKeys();
    const healthResult = await checkCopilotChannelHealth();
    console.log(`[cron] 完成: checked=${syncResult.checked}, synced=${syncResult.synced}, deducted=$${syncResult.totalDeducted}`);

    return NextResponse.json({
      success: true,
      ...syncResult,
      statsSync: statsSyncResult,
      autoDisable: autoDisableResult,
      channelHealth: healthResult,
    });
  } catch (error: any) {
    console.error('[cron] 失败:', error);
    return NextResponse.json({ error: '内部错误' }, { status: 500 });
  }
}

async function syncKeyUsages() {
  const creditConfig = await db.systemConfig.findUnique({ where: { key: 'ai_credit_limit' } });
  const creditLimit = creditConfig ? parseFloat(creditConfig.value) : 1;

  const missingTokenKeys = await db.aIKey.findMany({
    where: {
      newApiTokenId: null,
      newApiTokenName: { not: null },
      status: { in: ['active', 'disabled'] },
    },
    select: { id: true, newApiTokenName: true },
  });

  for (const key of missingTokenKeys) {
    if (!key.newApiTokenName) continue;
    try {
      const tokenId = await findNewApiTokenIdByName(key.newApiTokenName);
      if (tokenId) {
        await db.aIKey.update({
          where: { id: key.id },
          data: { newApiTokenId: tokenId },
        });
      }
    } catch (error: any) {
      console.warn(`[cron] restore token id failed for ${key.id}:`, error.message);
    }
  }

  const keys = await db.aIKey.findMany({
    where: {
      newApiTokenId: { not: null },
      status: { in: ['active', 'disabled'] },
    },
    select: {
      id: true,
      userId: true,
      newApiTokenId: true,
      newApiTokenName: true,
      monthlyLimit: true,
      status: true,
      lastSyncAt: true,
      totalUsed: true,
      monthUsed: true,
      lastRemoteUsedUsd: true,
      tier: { select: { channelGroup: true } },
    },
  });

  // 检测并记录重复 tokenId（数据完整性检查）
  // 如果多个 Key 指向同一 new-api token，则只允许 active 状态的 Key 计费，避免双重扣费
  const tokenIdToKeys = new Map<number, typeof keys>();
  for (const key of keys) {
    if (!key.newApiTokenId) continue;
    const group = tokenIdToKeys.get(key.newApiTokenId) || [];
    group.push(key);
    tokenIdToKeys.set(key.newApiTokenId, group);
  }
  const duplicateTokenIdSet = new Set<number>();
  for (const [tokenId, group] of tokenIdToKeys.entries()) {
    if (group.length > 1) {
      console.warn(`[cron] ⚠️ 重复 tokenId 检测: tokenId=${tokenId} 被 ${group.length} 个 Key 共享: ${group.map(k => `${k.id}(${k.status})`).join(', ')}`);
      duplicateTokenIdSet.add(tokenId);
    }
  }

  let synced = 0;
  let totalDeducted = 0;
  const errors: string[] = [];
  const diagnostics: Array<{
    keyId: string;
    tokenId: number | null;
    tokenName: string | null;
    remoteTokenName: string;
    usedQuota?: number;
    remoteUsedUSD?: number;
    localTotalUsed?: number;
    delta?: number;
    reason: string;
  }> = [];

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

  for (const key of keys) {
    try {
      // 若多个 Key 共享同一 tokenId，只由 active Key 计费（disabled 的跳过，避免双重扣费）
      if (key.newApiTokenId && duplicateTokenIdSet.has(key.newApiTokenId) && key.status !== 'active') {
        console.warn(`[cron] 跳过 disabled key ${key.id}（共享 tokenId=${key.newApiTokenId}，由 active key 计费）`);
        continue;
      }

      const usage = await getNewApiTokenUsageWithRepair(key);
      if (!usage) {
        diagnostics.push({
          keyId: key.id,
          tokenId: key.newApiTokenId,
          tokenName: key.newApiTokenName,
          remoteTokenName: '',
          reason: 'missing-token-id',
        });
        continue;
      }
      const usedUSD = Math.round(quotaToUSD(usage.usedQuota) * 10000) / 10000;
      let localTotalUsedBefore = key.totalUsed;

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

        if (!currentKey) return { delta: 0, skipped: true, reason: 'missing-key' };

        localTotalUsedBefore = currentKey.totalUsed;

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
              return { delta: 0, skipped: true, reason: 'race' };
            }
          }

          return { delta: 0, skipped: true, reason: baselineReason || 'no-new-usage' };
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
          return { delta: 0, skipped: true, reason: 'race' };
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
          delta,
          skipped: false,
          monthUsed: nextMonthUsed,
          monthlyLimit: currentKey.monthlyLimit,
          userId: currentKey.userId,
          status: currentKey.status,
        };
      });

      const user = await db.user.findUnique({
        where: { id: key.userId },
        select: { aiBalance: true },
      });

      if (user && key.newApiTokenId) {
        const freshKey = await db.aIKey.findUnique({
          where: { id: key.id },
          select: { status: true },
        });
        const keyIsActive = freshKey?.status === 'active';
        const monthUsed = txResult.monthUsed ?? key.monthUsed;
        const monthlyLimit = txResult.monthlyLimit ?? key.monthlyLimit;
        const availableUsd = getAvailableTokenUsd({
          aiBalance: user.aiBalance,
          creditLimit,
          monthUsed,
          monthlyLimit,
        });
        const newQuota = usdToQuota(availableUsd);
        // 始终带上 status，避免 new-api 的 PUT 覆盖已禁用状态
        const tokenStatus = (keyIsActive && newQuota > 0) ? 1 : 2;
        try {
          await updateNewApiTokenWithRepair(key, {
            status: tokenStatus,
            remainQuota: newQuota,
            name: !usage.tokenName && key.newApiTokenName ? key.newApiTokenName : undefined,
            group: key.tier.channelGroup || 'default',
          });
        } catch (_) {}
      }

      if (txResult.skipped) {
        diagnostics.push({
          keyId: key.id,
          tokenId: key.newApiTokenId,
          tokenName: key.newApiTokenName,
          remoteTokenName: usage.tokenName,
          usedQuota: usage.usedQuota,
          remoteUsedUSD: usedUSD,
          localTotalUsed: localTotalUsedBefore,
          delta: Math.round((usedUSD - localTotalUsedBefore) * 10000) / 10000,
          reason: txResult.reason || 'skipped',
        });
        console.log(
          `[cron] key=${key.id} token=${key.newApiTokenId} skipped=${txResult.reason || 'skipped'} local=$${localTotalUsedBefore} remote=$${usedUSD} quota=${usage.usedQuota} remoteName=${usage.tokenName || '(empty)'}`
        );
        continue;
      }

      // 号池账号用量现在由 syncUsageStatsIfDue() 按实际渠道归因，不再按绑定账号写入

      synced++;
      totalDeducted += txResult.delta;
      diagnostics.push({
        keyId: key.id,
        tokenId: key.newApiTokenId,
        tokenName: key.newApiTokenName,
        remoteTokenName: usage.tokenName,
        usedQuota: usage.usedQuota,
        remoteUsedUSD: usedUSD,
        localTotalUsed: localTotalUsedBefore,
        delta: txResult.delta,
        reason: 'synced',
      });
      console.log(
        `[cron] key=${key.id} token=${key.newApiTokenId} synced delta=$${txResult.delta} local=$${localTotalUsedBefore} remote=$${usedUSD} quota=${usage.usedQuota} remoteName=${usage.tokenName || '(empty)'}`
      );

      if (user && isAiKeyQuotaExhausted({
        aiBalance: user.aiBalance,
        creditLimit,
        monthUsed: txResult.monthUsed ?? key.monthUsed,
        monthlyLimit: txResult.monthlyLimit ?? key.monthlyLimit,
      })) {
        const activeKeys = await db.aIKey.findMany({
          where: { userId: key.userId, status: 'active' },
          select: {
            id: true,
            newApiTokenId: true,
            tier: { select: { channelGroup: true } },
          },
        });
        for (const activeKey of activeKeys) {
          await db.aIKey.update({ where: { id: activeKey.id }, data: { status: 'disabled' } });
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

      if (txResult.monthlyLimit && txResult.monthUsed >= txResult.monthlyLimit && key.status === 'active') {
        await db.aIKey.update({ where: { id: key.id }, data: { status: 'disabled' } });
        if (key.newApiTokenId) {
          try {
            await updateNewApiToken(key.newApiTokenId, {
              status: 2,
              name: key.newApiTokenName ?? undefined,
              group: key.tier.channelGroup || 'default',
            });
          } catch (_) {}
        }
      }
    } catch (e: any) {
      errors.push(`Key ${key.id}: ${e.message}`);
      diagnostics.push({
        keyId: key.id,
        tokenId: key.newApiTokenId,
        tokenName: key.newApiTokenName,
        remoteTokenName: '',
        reason: `error:${e.message}`,
      });
      console.error(`[cron] 同步 Key ${key.id} 失败:`, e.message);
    }
  }

  return {
    checked: keys.length,
    synced,
    totalDeducted: Math.round(totalDeducted * 10000) / 10000,
    diagnostics,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * 自动禁用空闲超过 2 小时的号池 Key
 *
 * 共享池容量模型：不再 1:1 绑定账号，只控制活跃 Key 总数。
 * 空闲 Key 禁用后释放容量给其他用户。用户需要时手动重新启用。
 */
async function autoDisableIdleCopilotKeys() {
  const IDLE_HOURS = 2;
  const cutoff = new Date(Date.now() - IDLE_HOURS * 60 * 60 * 1000);

  try {
    // 查找所有活跃的号池 Key，且最后使用超过 2h（或从未使用且创建超过 2h）
    const idleKeys = await db.aIKey.findMany({
      where: {
        status: 'active',
        tier: {
          OR: [
            { channelGroup: 'copilot' },
            { provider: { type: 'copilot-pool' } },
          ],
        },
        OR: [
          { lastUsedAt: null, createdAt: { lt: cutoff } },
          { lastUsedAt: { lt: cutoff } },
        ],
      },
      select: {
        id: true,
        newApiTokenId: true,
        newApiTokenName: true,
        tier: { select: { channelGroup: true } },
      },
    });

    if (idleKeys.length === 0) return { checked: 0, disabled: 0 };

    let disabledCount = 0;
    for (const key of idleKeys) {
      // 先禁用 new-api token
      if (key.newApiTokenId) {
        try {
          await updateNewApiToken(key.newApiTokenId, {
            status: 2,
            name: key.newApiTokenName ?? undefined,
            group: key.tier?.channelGroup || 'default',
          });
        } catch (error: any) {
          console.warn(`[auto-disable] 禁用 token 失败，跳过: key=${key.id}, error=${error.message}`);
          continue;
        }
      }

      await db.aIKey.update({
        where: { id: key.id },
        data: { status: 'disabled' },
      });

      console.log(`[auto-disable] 号池 Key ${key.id} 空闲超过 ${IDLE_HOURS}h，已自动禁用`);
      disabledCount++;
    }

    if (disabledCount > 0) {
      console.log(`[auto-disable] 共禁用 ${disabledCount} 个空闲号池 Key`);
    }

    return { checked: idleKeys.length, disabled: disabledCount };
  } catch (error: any) {
    console.error('[auto-disable] 自动禁用失败:', error);
    return { error: error.message };
  }
}

/**
 * 渠道健康检查：检测 copilot 渠道错误率，自动标记异常账号
 *
 * 通过 new-api 渠道列表的 status/response_time 判断渠道是否正常。
 * 异常渠道对应的 CopilotAccount 标记为 'error'，管理员可在后台看到。
 */
async function checkCopilotChannelHealth() {
  try {
    const channels = await getNewApiChannels();
    const copilotAccounts = await db.copilotAccount.findMany({
      where: { newApiChannelId: { not: null } },
      select: { id: true, githubId: true, newApiChannelId: true, status: true },
    });

    if (copilotAccounts.length === 0) return { checked: 0, errors: 0, recovered: 0 };

    const channelMap = new Map(channels.map(ch => [ch.id, ch]));
    let errorCount = 0;
    let recoveredCount = 0;

    for (const account of copilotAccounts) {
      const channel = channelMap.get(account.newApiChannelId!);

      // 渠道不存在或 status != 1（被 new-api 自动禁用/手动禁用）
      const isChannelDown = !channel || channel.status !== 1;

      if (isChannelDown && account.status !== 'error' && account.status !== 'inactive') {
        await db.copilotAccount.update({
          where: { id: account.id },
          data: { status: 'error' },
        });
        console.warn(`[health] 号池账号 ${account.githubId} 渠道异常 (channel=${account.newApiChannelId}, status=${channel?.status ?? 'missing'})，标记为 error`);
        errorCount++;
      } else if (!isChannelDown && account.status === 'error') {
        // 渠道恢复了，自动恢复账号状态
        await db.copilotAccount.update({
          where: { id: account.id },
          data: { status: 'active' },
        });
        console.log(`[health] 号池账号 ${account.githubId} 渠道恢复正常，状态恢复为 active`);
        recoveredCount++;
      }
    }

    return { checked: copilotAccounts.length, errors: errorCount, recovered: recoveredCount };
  } catch (error: any) {
    console.error('[health] 渠道健康检查失败:', error);
    return { error: error.message };
  }
}
