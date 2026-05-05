import { db } from './db';

/**
 * 号池容量检查（替代旧的 1:1 绑定模型）
 *
 * 旧模型：每个 Key 独占绑定一个 CopilotAccount，导致"占而不用"。
 * 新模型：所有 copilot Key 共享整个号池，只检查总容量。
 *         路由完全交给 new-api 在 copilot 组内负载均衡。
 *         计费按 token name → AIKey 映射，跟渠道无关。
 *
 * 默认倍率 2.0，即 10 个账号最多服务 20 个活跃 Key。
 * 管理员可通过 SystemConfig `copilot_pool_multiplier` 调整。
 */

const DEFAULT_POOL_MULTIPLIER = 2.0;

export async function getCopilotPoolCapacity(poolType?: string): Promise<{
  totalAccounts: number;
  healthyAccounts: number;
  multiplier: number;
  maxKeys: number;
  activeKeys: number;
  available: boolean;
}> {
  const typeFilter = poolType ? { poolType } : {};
  const [totalAccounts, healthyAccounts, activeKeys, multiplierConfig] = await Promise.all([
    db.copilotAccount.count({ where: typeFilter }),
    db.copilotAccount.count({ where: { ...typeFilter, status: { in: ['active', 'bound'] } } }),
    db.aIKey.count({
      where: {
        status: 'active',
        tier: {
          OR: [
            { channelGroup: 'cardvela' },
            { provider: { type: 'copilot-pool' } },
          ],
        },
      },
    }),
    db.systemConfig.findUnique({ where: { key: 'copilot_pool_multiplier' } }),
  ]);

  const multiplier = multiplierConfig ? parseFloat(multiplierConfig.value) || DEFAULT_POOL_MULTIPLIER : DEFAULT_POOL_MULTIPLIER;
  const maxKeys = Math.floor(healthyAccounts * multiplier);

  return {
    totalAccounts,
    healthyAccounts,
    multiplier,
    maxKeys,
    activeKeys,
    available: activeKeys < maxKeys && healthyAccounts > 0,
  };
}

export function isCopilotPoolTier(tier: {
  channelGroup: string | null;
  provider?: { type: string } | null;
}) {
  return tier.channelGroup === 'cardvela' || tier.provider?.type === 'copilot-pool';
}