import { NextRequest, NextResponse } from 'next/server';
import { getAvailableTokenUsd, isAiKeyQuotaExhausted } from '../../../../src/lib/aiKeyQuota';
import { findNewApiTokenIdByName, getAllNewApiLogs, getNewApiTokenUsage, isNewApiRecordNotFoundError, repairAiKeyNewApiTokenId, updateNewApiToken, quotaToUSD, usdToQuota } from '../../../../src/lib/newapi';
import { db } from '../../../../src/lib/db';

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

    console.log('[cron] 开始同步 Key 用量与号池解绑检查...');
    const syncResult = await syncKeyUsages();
    const statsSyncResult = await syncUsageStatsIfDue();
    const autoUnbindResult = await autoUnbindIdleAccounts();
    console.log(`[cron] 完成: checked=${syncResult.checked}, synced=${syncResult.synced}, deducted=$${syncResult.totalDeducted}`);

    return NextResponse.json({
      success: true,
      ...syncResult,
      statsSync: statsSyncResult,
      autoUnbind: autoUnbindResult,
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
      copilotAccountId: true,
      tier: { select: { channelGroup: true } },
    },
  });

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
    if (!key.newApiTokenId) {
      return;
    }

    try {
      await updateNewApiToken(key.newApiTokenId, params);
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
      await updateNewApiToken(repairedTokenId, params);
    }
  }

  for (const key of keys) {
    try {
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

      // 回写绑定的号池账号用量
      if (key.copilotAccountId && txResult.delta > 0) {
        try {
          await db.copilotAccount.update({
            where: { id: key.copilotAccountId },
            data: {
              quotaUsed: { increment: txResult.delta },
              lastUsed: new Date(),
            },
          });
        } catch (e: any) {
          console.warn(`[cron] 回写号池账号用量失败: account=${key.copilotAccountId}, error=${e.message}`);
        }
      }

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

      if (txResult.monthlyLimit && txResult.monthUsed >= txResult.monthlyLimit && key.status === 'active') {
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
            await updateNewApiToken(key.newApiTokenId, {
              status: 2,
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
 * 自动解绑空闲超过 2 小时的号池账号
 * 
 * 共享池租约模型：释放号池账号绑定关系前，先禁用对应的 new-api token。
 * 这样可以避免 Key 在本地已释放租约时，仍通过 group 路由继续占用共享池账号。
 * 
 * - 条件1：绑定时间超过 2 小时
 * - 条件2：绑定的 Key 最后使用时间超过 2 小时（或从未使用）
 */
async function autoUnbindIdleAccounts() {
  const IDLE_HOURS = 2;
  const cutoff = new Date(Date.now() - IDLE_HOURS * 60 * 60 * 1000);

  try {
    // 查找所有已绑定且绑定超过 2h 的号池账号
    const boundAccounts = await db.copilotAccount.findMany({
      where: {
        boundAiKeyId: { not: null },
        boundAt: { lt: cutoff },
      },
    });

    if (boundAccounts.length === 0) return { checked: 0, unbound: 0 };

    const keyIds = boundAccounts.map(a => a.boundAiKeyId!);
    const keys = await db.aIKey.findMany({
      where: { id: { in: keyIds } },
      select: {
        id: true,
        lastUsedAt: true,
        status: true,
        newApiTokenId: true,
        tier: { select: { channelGroup: true } },
      },
    });
    const keyMap = Object.fromEntries(keys.map(k => [k.id, k]));

    let unboundCount = 0;
    for (const account of boundAccounts) {
      const key = keyMap[account.boundAiKeyId!];
      // 解绑条件：Key 不存在/已吊销，或最后使用时间超过阈值
      const keyIdle = !key || key.status === 'revoked' ||
        !key.lastUsedAt || key.lastUsedAt < cutoff;

      if (keyIdle) {
        if (key?.newApiTokenId) {
          try {
            await updateNewApiToken(key.newApiTokenId, {
              status: 2,
              group: key.tier?.channelGroup || 'default',
            });
          } catch (error: any) {
            console.warn(`[auto-unbind] 禁用 key token 失败，跳过释放: key=${key.id}, token=${key.newApiTokenId}, error=${error.message}`);
            continue;
          }
        }

        // 释放号池账号绑定，Key 本身保持 active，等待后续重新获取租约
        await db.$transaction([
          db.copilotAccount.update({
            where: { id: account.id },
            data: {
              status: 'active',
              boundAiKeyId: null,
              boundUserId: null,
              boundAt: null,
            },
          }),
          // 清除 Key 上的 copilotAccountId（不改 status，不动 token）
          ...(key && key.status !== 'revoked' ? [
            db.aIKey.update({
              where: { id: account.boundAiKeyId! },
              data: { copilotAccountId: null },
            }),
          ] : []),
        ]);

        console.log(`[auto-unbind] 释放号池: account=${account.githubId}, key=${account.boundAiKeyId} (token 已禁用，等待重新获取租约)`);
        unboundCount++;
      }
    }

    if (unboundCount > 0) {
      console.log(`[auto-unbind] 共释放 ${unboundCount} 个空闲号池账号`);
    }

    return { checked: boundAccounts.length, unbound: unboundCount };
  } catch (error: any) {
    console.error('[auto-unbind] 自动解绑失败:', error);
    return { error: error.message };
  }
}
