import { prisma } from '@/lib/prisma';

export const VPN_SESSION_PRICE_USD = 1;
export const VPN_DAILY_LIMIT = 5;
export const VPN_SESSION_DURATION_MINUTES = 60;
export const VPN_SESSION_DURATION_MS = VPN_SESSION_DURATION_MINUTES * 60 * 1000;
export const VPN_TIME_ZONE = 'Asia/Shanghai';

const VPN_CONFIG_KEYS = [
  'vpn_temp_name',
  'vpn_temp_region',
  'vpn_temp_protocol',
  'vpn_temp_link',
  'vpn_temp_host',
  'vpn_temp_port',
  'vpn_temp_sni',
  'vpn_temp_public_key',
  'vpn_temp_short_id',
  'vpn_temp_notice',
  'vpn_temp_support_platforms',
  'vpn_temp_purchase_tip',
];

export class VpnApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'VpnApiError';
    this.status = status;
  }
}

type VpnSessionRecord = {
  id: string;
  userId: string;
  dateKey: string;
  status: string;
  chargeAmount: number;
  isFree: boolean;
  hasCardBenefit: boolean;
  startedAt: Date | null;
  expiresAt: Date | null;
  disconnectedAt: Date | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function formatDatePart(date: Date, type: 'year' | 'month' | 'day') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VPN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  return parts.find((part) => part.type === type)?.value || '';
}

export function getVpnDateKey(date = new Date()) {
  return `${formatDatePart(date, 'year')}-${formatDatePart(date, 'month')}-${formatDatePart(date, 'day')}`;
}

function normalizeConfigMap(configs: Array<{ key: string; value: string }>) {
  return configs.reduce<Record<string, string>>((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {});
}

function getVpnNodeFromConfig(configMap: Record<string, string>) {
  const supportPlatforms = (configMap.vpn_temp_support_platforms || 'Claude, ChatGPT, Cursor, GitHub Copilot, Google, 海淘支付')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    configured: Boolean(configMap.vpn_temp_link || configMap.vpn_temp_host),
    name: configMap.vpn_temp_name || '临时订阅线路',
    region: configMap.vpn_temp_region || 'US',
    protocol: configMap.vpn_temp_protocol || 'VLESS',
    link: configMap.vpn_temp_link || '',
    host: configMap.vpn_temp_host || '',
    port: configMap.vpn_temp_port || '',
    sni: configMap.vpn_temp_sni || '',
    publicKey: configMap.vpn_temp_public_key || '',
    shortId: configMap.vpn_temp_short_id || '',
    notice: configMap.vpn_temp_notice || '本线路仅提供给用户用于海�?AI 订阅、Google/Gmail 登录、海淘支付等短时场景�?,
    supportPlatforms,
    purchaseTip: configMap.vpn_temp_purchase_tip || '连接成功后再点击开始计时，系统�?1 小时会话管理，到时自动失效�?,
  };
}

function getRemainingSeconds(expiresAt?: Date | null) {
  if (!expiresAt) return 0;
  return Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
}

function serializeSession(session: VpnSessionRecord | null) {
  if (!session) return null;

  return {
    id: session.id,
    status: session.status,
    chargeAmount: session.chargeAmount,
    isFree: session.isFree,
    hasCardBenefit: session.hasCardBenefit,
    createdAt: session.createdAt,
    startedAt: session.startedAt,
    expiresAt: session.expiresAt,
    disconnectedAt: session.disconnectedAt,
    remainingSeconds: getRemainingSeconds(session.expiresAt),
  };
}

async function getVpnConfigMap() {
  const configs = await prisma.systemConfig.findMany({
    where: { key: { in: VPN_CONFIG_KEYS } },
  });

  return normalizeConfigMap(configs);
}

export async function expireVpnSessionIfNeeded(session: VpnSessionRecord | null) {
  if (!session) return null;

  if (session.status === 'active' && session.expiresAt && session.expiresAt.getTime() <= Date.now()) {
    return prisma.vpnSession.update({
      where: { id: session.id },
      data: {
        status: 'expired',
        disconnectedAt: session.expiresAt,
      },
    });
  }

  return session;
}

export async function getUserVpnState(userId: string) {
  const todayKey = getVpnDateKey();
  const [user, activeSessionRaw, freeBenefitUsedCount, todayUsedCount, configMap, recentSessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        balance: true,
        _count: { select: { userCards: true } },
      },
    }),
    prisma.vpnSession.findFirst({
      where: { userId, status: { in: ['pending_activation', 'active'] } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.vpnSession.count({ where: { userId, hasCardBenefit: true } }),
    prisma.vpnSession.count({ where: { userId, dateKey: todayKey } }),
    getVpnConfigMap(),
    prisma.vpnSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  if (!user) {
    throw new VpnApiError('用户不存�?, 404);
  }

  const activeSession = await expireVpnSessionIfNeeded(activeSessionRaw);
  const cardsCount = user._count.userCards;
  const freeEligible = cardsCount >= 1 && freeBenefitUsedCount === 0;
  const node = getVpnNodeFromConfig(configMap);
  const hasOngoingSession = Boolean(activeSession && ['pending_activation', 'active'].includes(activeSession.status));

  return {
    balance: user.balance,
    cardsCount,
    pricing: {
      currency: 'USD',
      price: VPN_SESSION_PRICE_USD,
      freeEligible,
      freeUsed: freeBenefitUsedCount > 0,
      freeRule: '已开卡用户可免费领取 1 �?1 小时体验，之后每�?1 美元�?,
    },
    limits: {
      dailyLimit: VPN_DAILY_LIMIT,
      todayUsed: todayUsedCount,
      remainingToday: Math.max(0, VPN_DAILY_LIMIT - todayUsedCount),
      durationMinutes: VPN_SESSION_DURATION_MINUTES,
    },
    node,
    purchaseUrl: '/dashboard',
    rechargeUrl: '/dashboard',
    policy: {
      title: '临时订阅 VPN 使用说明',
      usageScope: '仅限海外 AI 订阅、Google/Gmail 登录、海淘支付等短时使用场景，不提供长期科学上网服务�?,
      compliance: '禁止用于任何违法违规活动。若发现异常用途，平台有权立即停用服务，并保留追究责任的权利�?,
      actionNotice: '请在确认已阅读说明并手动连接成功后，再点击开始计时�?,
    },
    activeSession: serializeSession(activeSession),
    recentSessions: recentSessions.map(serializeSession),
    canStartNewSession:
      node.configured &&
      !hasOngoingSession &&
      todayUsedCount < VPN_DAILY_LIMIT &&
      (freeEligible || user.balance >= VPN_SESSION_PRICE_USD),
    requiresRecharge: !freeEligible && user.balance < VPN_SESSION_PRICE_USD,
  };
}

export async function startVpnSession(userId: string) {
  const configMap = await getVpnConfigMap();
  const node = getVpnNodeFromConfig(configMap);

  if (!node.configured) {
    throw new VpnApiError('VPN 节点尚未配置，请联系客服处理', 503);
  }

  const todayKey = getVpnDateKey();
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const [user, activeSessionRaw, todayUsedCount, freeBenefitUsedCount] = await Promise.all([
      tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          balance: true,
          _count: { select: { userCards: true } },
        },
      }),
      tx.vpnSession.findFirst({
        where: { userId, status: { in: ['pending_activation', 'active'] } },
        orderBy: { createdAt: 'desc' },
      }),
      tx.vpnSession.count({ where: { userId, dateKey: todayKey } }),
      tx.vpnSession.count({ where: { userId, hasCardBenefit: true } }),
    ]);

    if (!user) {
      throw new VpnApiError('用户不存�?, 404);
    }

    if (activeSessionRaw?.status === 'active' && activeSessionRaw.expiresAt && activeSessionRaw.expiresAt.getTime() <= now.getTime()) {
      await tx.vpnSession.update({
        where: { id: activeSessionRaw.id },
        data: {
          status: 'expired',
          disconnectedAt: activeSessionRaw.expiresAt,
        },
      });
    } else if (activeSessionRaw) {
      throw new VpnApiError('当前已有未结束的 VPN 会话，请先完成或等待倒计时结�?, 409);
    }

    if (todayUsedCount >= VPN_DAILY_LIMIT) {
      throw new VpnApiError('今日可用次数已达上限，请明天再试', 400);
    }

    const hasCardBenefit = user._count.userCards >= 1;
    const shouldUseFreeBenefit = hasCardBenefit && freeBenefitUsedCount === 0;
    const chargeAmount = shouldUseFreeBenefit ? 0 : VPN_SESSION_PRICE_USD;

    if (chargeAmount > 0 && user.balance < chargeAmount) {
      throw new VpnApiError('账号余额不足请先充�?, 400);
    }

    if (chargeAmount > 0) {
      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: chargeAmount } },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'vpn_session',
          amount: -chargeAmount,
          status: 'completed',
          paymentMethod: 'balance',
          txHash: JSON.stringify({
            scene: 'temporary_vpn',
            durationMinutes: VPN_SESSION_DURATION_MINUTES,
            dateKey: todayKey,
          }),
        },
      });
    }

    const session = await tx.vpnSession.create({
      data: {
        userId,
        dateKey: todayKey,
        status: 'pending_activation',
        chargeAmount,
        isFree: shouldUseFreeBenefit,
        hasCardBenefit: shouldUseFreeBenefit,
        note: shouldUseFreeBenefit
          ? '已开卡用户首小时免费体验'
          : '临时订阅 VPN 会话，待用户连接成功后开始计�?,
      },
    });

    return serializeSession(session);
  });
}

export async function activateVpnSession(userId: string, sessionId: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + VPN_SESSION_DURATION_MS);

  return prisma.$transaction(async (tx) => {
    const session = await tx.vpnSession.findUnique({ where: { id: sessionId } });

    if (!session || session.userId !== userId) {
      throw new VpnApiError('VPN 会话不存�?, 404);
    }

    if (session.status === 'active' && session.expiresAt && session.expiresAt.getTime() > now.getTime()) {
      return serializeSession(session);
    }

    if (session.status !== 'pending_activation') {
      throw new VpnApiError('当前会话无法开始计�?, 400);
    }

    const updated = await tx.vpnSession.update({
      where: { id: sessionId },
      data: {
        status: 'active',
        startedAt: now,
        expiresAt,
      },
    });

    return serializeSession(updated);
  });
}

export async function disconnectVpnSession(userId: string, sessionId: string) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const session = await tx.vpnSession.findUnique({ where: { id: sessionId } });

    if (!session || session.userId !== userId) {
      throw new VpnApiError('VPN 会话不存�?, 404);
    }

    if (!['pending_activation', 'active'].includes(session.status)) {
      return serializeSession(session);
    }

    const updated = await tx.vpnSession.update({
      where: { id: sessionId },
      data: {
        status: 'expired',
        disconnectedAt: now,
        expiresAt: session.status === 'active' ? now : session.expiresAt,
      },
    });

    return serializeSession(updated);
  });
}

export function getVpnSummaryFromState(state: Awaited<ReturnType<typeof getUserVpnState>>) {
  if (state.activeSession?.status === 'active') {
    return {
      enabled: true,
      status: 'active',
      expireAt: state.activeSession.expiresAt,
      actionText: '查看倒计�?,
      actionUrl: '/vpn',
    };
  }

  if (state.activeSession?.status === 'pending_activation') {
    return {
      enabled: true,
      status: 'pending_activation',
      expireAt: null,
      actionText: '继续连接',
      actionUrl: '/vpn',
    };
  }

  if (state.limits.remainingToday <= 0) {
    return {
      enabled: false,
      status: 'daily_limit_reached',
      expireAt: null,
      actionText: '今日已达上限',
      actionUrl: '/vpn',
    };
  }

  return {
    enabled: state.canStartNewSession,
    status: state.pricing.freeEligible ? 'free_available' : state.requiresRecharge ? 'insufficient_balance' : 'available',
    expireAt: null,
    actionText: state.pricing.freeEligible ? '免费�?1 小时' : state.requiresRecharge ? '余额不足去充�? : '立即使用',
    actionUrl: state.requiresRecharge ? state.rechargeUrl : '/vpn',
  };
}
