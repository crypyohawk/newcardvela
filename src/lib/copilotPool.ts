import { db } from './db';
import { getAvailableTokenUsd } from './aiKeyQuota';
import { isNewApiRecordNotFoundError, repairAiKeyNewApiTokenId, updateNewApiToken } from './newapi';

function isCopilotPoolKey(key: {
  tier: { channelGroup: string | null; provider: { type: string } | null } | null;
}) {
  return key.tier?.channelGroup === 'copilot' || key.tier?.provider?.type === 'copilot-pool';
}

function resolveTokenGroup(key: {
  tier: { channelGroup: string | null } | null;
}) {
  return key.tier?.channelGroup || 'default';
}

async function syncKeyTokenState(key: {
  id: string;
  newApiTokenId: number | null;
  newApiTokenName?: string | null;
}, params: Parameters<typeof updateNewApiToken>[1]) {
  const tokenId = await repairAiKeyNewApiTokenId(key, { forceValidate: true });
  if (!tokenId) {
    throw new Error('missing-new-api-token-id');
  }

  try {
    await updateNewApiToken(tokenId, params);
  } catch (error: any) {
    if (!isNewApiRecordNotFoundError(error)) {
      throw error;
    }

    const repairedTokenId = await repairAiKeyNewApiTokenId({
      ...key,
      newApiTokenId: null,
    });
    if (!repairedTokenId) {
      throw error;
    }

    key.newApiTokenId = repairedTokenId;
    await updateNewApiToken(repairedTokenId, params);
  }
}

export async function ensureCopilotPoolKeyLease(keyId: string) {
  const key = await db.aIKey.findUnique({
    where: { id: keyId },
    select: {
      id: true,
      userId: true,
      status: true,
      copilotAccountId: true,
      newApiTokenId: true,
      newApiTokenName: true,
      monthUsed: true,
      monthlyLimit: true,
      tier: {
        select: {
          channelGroup: true,
          provider: { select: { type: true } },
        },
      },
    },
  });

  if (!key || key.status !== 'active' || !isCopilotPoolKey(key)) {
    return { rebound: false, reason: 'skip', accountId: null as string | null };
  }

  const tokenGroup = resolveTokenGroup(key);
  const creditConfig = await db.systemConfig.findUnique({ where: { key: 'ai_credit_limit' } });
  const creditLimit = creditConfig ? parseFloat(creditConfig.value) : 1;
  const user = await db.user.findUnique({
    where: { id: key.userId },
    select: { aiBalance: true },
  });
  const availableUsd = getAvailableTokenUsd({
    aiBalance: user?.aiBalance || 0,
    creditLimit,
    monthUsed: key.monthUsed,
    monthlyLimit: key.monthlyLimit,
  });

  if (key.copilotAccountId) {
    const currentAccount = await db.copilotAccount.findUnique({
      where: { id: key.copilotAccountId },
      select: {
        id: true,
        status: true,
        boundAiKeyId: true,
        boundUserId: true,
        boundAt: true,
      },
    });

    if (currentAccount?.boundAiKeyId === key.id) {
      if (currentAccount.status !== 'bound' || currentAccount.boundUserId !== key.userId) {
        await db.copilotAccount.update({
          where: { id: currentAccount.id },
          data: {
            status: 'bound',
            boundUserId: key.userId,
            boundAt: currentAccount.boundAt || new Date(),
          },
        });
      }

      if (key.newApiTokenId) {
        try {
          await syncKeyTokenState(key, {
            status: availableUsd > 0 ? 1 : 2,
            remainQuota: Math.round(availableUsd * 500000),
            group: tokenGroup,
          });
        } catch (error: any) {
          console.warn(`[pool-lease] re-enable token failed for key ${key.id}:`, error.message);
        }
      }

      return { rebound: false, reason: 'already-bound', accountId: currentAccount.id };
    }

    await db.aIKey.update({
      where: { id: key.id },
      data: { copilotAccountId: null },
    });
  }

  const idleAccount = await db.copilotAccount.findFirst({
    where: { status: 'active', boundAiKeyId: null },
    orderBy: { quotaUsed: 'asc' },
    select: { id: true },
  });

  if (!idleAccount) {
    return { rebound: false, reason: 'no-idle-account', accountId: null as string | null };
  }

  try {
    const acquired = await db.$transaction(async (tx) => {
      const currentKey = await tx.aIKey.findUnique({
        where: { id: key.id },
        select: {
          id: true,
          userId: true,
          status: true,
          copilotAccountId: true,
        },
      });

      if (!currentKey || currentKey.status !== 'active') {
        return null;
      }

      if (currentKey.copilotAccountId) {
        return { accountId: currentKey.copilotAccountId, reused: true };
      }

      const account = await tx.copilotAccount.findUnique({
        where: { id: idleAccount.id },
        select: { id: true, boundAiKeyId: true, status: true },
      });

      if (!account || account.boundAiKeyId || account.status !== 'active') {
        throw new Error('POOL_RACE_CONDITION');
      }

      await tx.aIKey.update({
        where: { id: currentKey.id },
        data: { copilotAccountId: account.id },
      });

      await tx.copilotAccount.update({
        where: { id: account.id },
        data: {
          status: 'bound',
          boundAiKeyId: currentKey.id,
          boundUserId: currentKey.userId,
          boundAt: new Date(),
        },
      });

      return { accountId: account.id, reused: false };
    });

    if (!acquired) {
      return { rebound: false, reason: 'inactive-key', accountId: null as string | null };
    }

    if (key.newApiTokenId) {
      try {
        await syncKeyTokenState(key, {
          status: availableUsd > 0 ? 1 : 2,
          remainQuota: Math.round(availableUsd * 500000),
          group: tokenGroup,
        });
      } catch (error: any) {
        console.warn(`[pool-lease] enable token failed for key ${key.id}:`, error.message);
      }
    }

    return {
      rebound: !acquired.reused,
      reason: acquired.reused ? 'already-rebound' : 'rebound',
      accountId: acquired.accountId,
    };
  } catch (error: any) {
    if (error.message === 'POOL_RACE_CONDITION') {
      return { rebound: false, reason: 'race', accountId: null as string | null };
    }

    throw error;
  }
}