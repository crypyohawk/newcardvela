/**
 * 用量同步核心逻辑 - 处理 new-api 日志并执行扣费
 * 被 webhook 和 cron 同步端点共用
 */
import { db } from './db';
import { updateNewApiToken, findNewApiTokenIdByName } from './newapi';

// 同步禁用 new-api 侧的 token
async function disableKeyOnNewApi(newApiTokenId: number | null) {
  if (!newApiTokenId) return;
  try {
    await updateNewApiToken(newApiTokenId, { status: 2 });
  } catch (e) {
    console.error(`[用量同步] 同步禁用 new-api token ${newApiTokenId} 失败:`, e);
  }
}

export interface UsageLog {
  id?: number;
  token_name: string;
  model_name: string;
  prompt_tokens: number;
  completion_tokens: number;
  channel?: number | string;
}

export interface SyncResult {
  synced: number;
  skipped: number;
  duplicated: number;
  totalCostDeducted: number;
}

/**
 * 处理一批用量日志，执行扣费流程
 */
export async function processUsageLogs(logs: UsageLog[]): Promise<SyncResult> {
  // 信用额度配置只查一次
  const creditConfig = await db.systemConfig.findUnique({ where: { key: 'ai_credit_limit' } });
  const creditLimit = creditConfig ? parseFloat(creditConfig.value) : 1;

  let synced = 0;
  let skipped = 0;
  let duplicated = 0;
  let totalCostDeducted = 0;

  for (const log of logs) {
    try {
      const { id: externalId, token_name, model_name, prompt_tokens, completion_tokens } = log;

      // 验证必要字段
      if (!token_name || !model_name) {
        skipped++;
        continue;
      }

      const inputTokens = Math.max(0, Number(prompt_tokens) || 0);
      const outputTokens = Math.max(0, Number(completion_tokens) || 0);
      if (inputTokens === 0 && outputTokens === 0) {
        skipped++;
        continue;
      }

      // 通过 token_name 匹配 AIKey（跳过已吊销的 Key）
      let aiKey: any = await db.aIKey.findFirst({
        where: { newApiTokenName: token_name, status: { not: 'revoked' } },
        include: { tier: true },
      });

      // 兼容旧数据：通过 new-api 数据库查 token ID 反查
      if (!aiKey) {
        const tokenId = await findNewApiTokenIdByName(token_name);
        if (tokenId) {
          aiKey = await db.aIKey.findFirst({
            where: { newApiTokenId: tokenId, status: { not: 'revoked' } },
            include: { tier: true },
          });
          // 回填 newApiTokenName 避免下次再查 SQLite
          if (aiKey) {
            await db.aIKey.update({
              where: { id: aiKey.id },
              data: { newApiTokenName: token_name },
            });
          }
        }
      }

      if (!aiKey) {
        console.warn(`[用量同步] 未找到匹配的 AIKey, token_name=${token_name}, externalId=${externalId}`);
        skipped++;
        continue;
      }

      // 月度懒重置：如果 Key 的 lastSyncAt 在上个月，重置 monthUsed
      const now = new Date();
      if (aiKey.lastSyncAt) {
        const lastMonth = aiKey.lastSyncAt.getMonth();
        const lastYear = aiKey.lastSyncAt.getFullYear();
        if (lastMonth !== now.getMonth() || lastYear !== now.getFullYear()) {
          await db.aIKey.update({
            where: { id: aiKey.id },
            data: { monthUsed: 0 },
          });
          aiKey.monthUsed = 0;
          console.log(`[用量同步] Key ${aiKey.id} 跨月重置 monthUsed`);
        }
      }

      // 计算费用
      const inputCost = (inputTokens / 1000000) * aiKey.tier.pricePerMillionInput;
      const outputCost = (outputTokens / 1000000) * aiKey.tier.pricePerMillionOutput;
      const cost = Math.round((inputCost + outputCost) * 10000) / 10000;

      // 检查月度预算（超限禁用Key，但不跳过计费——请求已完成必须收费）
      if (aiKey.monthlyLimit != null && aiKey.monthUsed + cost > aiKey.monthlyLimit) {
        await db.aIKey.update({
          where: { id: aiKey.id },
          data: { status: 'disabled' },
        });
        await disableKeyOnNewApi(aiKey.newApiTokenId);
        console.log(`[用量同步] Key ${aiKey.id} 超出月度预算 $${aiKey.monthlyLimit}，已自动禁用。此次调用仍正常扣费。`);
      }

      // 查当前AI余额
      const currentUser = await db.user.findUnique({
        where: { id: aiKey.userId },
        select: { aiBalance: true },
      });
      if (!currentUser) {
        skipped++;
        continue;
      }

      // 如果AI余额已经低于信用下限，禁用所有 Key 并跳过
      if (currentUser.aiBalance <= -creditLimit) {
        const activeKeys = await db.aIKey.findMany({
          where: { userId: aiKey.userId, status: 'active' },
          select: { id: true, newApiTokenId: true },
        });
        if (activeKeys.length > 0) {
          await db.aIKey.updateMany({
            where: { userId: aiKey.userId, status: 'active' },
            data: { status: 'disabled' },
          });
          for (const k of activeKeys) {
            await disableKeyOnNewApi(k.newApiTokenId);
          }
          console.log(`[用量同步] 用户 ${aiKey.userId} 已超出信用额度(AI余额$${currentUser.aiBalance.toFixed(4)}, 信用上限-$${creditLimit})，禁用所有Key`);
        }
        skipped++;
        continue;
      }

      // 事务性扣费（幂等性检查在事务内，防止并发双重扣费）
      const txResult = await db.$transaction(async (tx) => {
        // 幂等性检查必须在事务内，确保 check-then-write 原子性
        if (externalId) {
          const existing = await tx.aIUsageLog.findUnique({
            where: { externalLogId: Number(externalId) },
          });
          if (existing) return 'duplicate';
        }

        await tx.aIUsageLog.create({
          data: {
            userId: aiKey.userId,
            aiKeyId: aiKey.id,
            externalLogId: externalId ? Number(externalId) : null,
            model: model_name,
            inputTokens,
            outputTokens,
            cost,
            channel: log.channel ? String(log.channel) : null,
          },
        });
        await tx.aIKey.update({
          where: { id: aiKey.id },
          data: {
            monthUsed: { increment: cost },
            totalUsed: { increment: cost },
            lastUsedAt: new Date(),
            lastSyncAt: new Date(),
          },
        });
        await tx.user.update({
          where: { id: aiKey.userId },
          data: { aiBalance: { decrement: cost } },
        });

        // 写入 Transaction 记录，让用户交易历史可见 AI 消费
        if (cost > 0) {
          await tx.transaction.create({
            data: {
              userId: aiKey.userId,
              type: 'ai_usage',
              amount: -cost,
              status: 'completed',
            },
          });
        }

        return 'created';
      });

      if (txResult === 'duplicate') {
        duplicated++;
        continue;
      }

      totalCostDeducted += cost;
      synced++;

      // 追踪 Copilot 账号用量：通过 channel ID 匹配 CopilotAccount
      if (log.channel) {
        try {
          const channelId = Number(log.channel);
          if (!isNaN(channelId) && channelId > 0) {
            const copilotAccount = await db.copilotAccount.findFirst({
              where: { newApiChannelId: channelId },
            });
            if (copilotAccount) {
              await db.copilotAccount.update({
                where: { id: copilotAccount.id },
                data: {
                  quotaUsed: { increment: cost },
                  lastUsed: new Date(),
                },
              });
            }
          }
        } catch (copilotErr: any) {
          // Copilot 用量追踪失败不影响主流程
          console.warn(`[用量同步] Copilot账号用量追踪失败 (channel=${log.channel}):`, copilotErr.message);
        }
      }

      // 扣费后检查：AI余额低于信用下限则禁用所有 Key
      const updatedUser = await db.user.findUnique({
        where: { id: aiKey.userId },
        select: { aiBalance: true },
      });
      if (updatedUser && updatedUser.aiBalance <= -creditLimit) {
        const activeKeys = await db.aIKey.findMany({
          where: { userId: aiKey.userId, status: 'active' },
          select: { id: true, newApiTokenId: true },
        });
        await db.aIKey.updateMany({
          where: { userId: aiKey.userId, status: 'active' },
          data: { status: 'disabled' },
        });
        for (const k of activeKeys) {
          await disableKeyOnNewApi(k.newApiTokenId);
        }
        console.log(`[用量同步] 用户 ${aiKey.userId} 扣费后超出信用额度(AI余额$${updatedUser.aiBalance.toFixed(4)})，已禁用所有 Key`);
      }
    } catch (logError: any) {
      // 单条日志处理失败不应中断整个批次
      // P2002 = Prisma unique constraint violation（并发重复插入）
      if (logError.code === 'P2002') {
        duplicated++;
      } else {
        console.error(`[用量同步] 处理日志失败 (id=${log.id}, token=${log.token_name}):`, logError.message);
        skipped++;
      }
    }
  }

  return {
    synced,
    skipped,
    duplicated,
    totalCostDeducted: Math.round(totalCostDeducted * 10000) / 10000,
  };
}
