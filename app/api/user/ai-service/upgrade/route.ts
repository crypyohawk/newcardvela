export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';

const AI_TIER_CONFIG: Record<string, { maxKeys: number; minBalance: number; locked: boolean }> = {
  basic:   { maxKeys: 3,  minBalance: 50,   locked: false },
  pro:     { maxKeys: 10, minBalance: 500,  locked: true },
  premium: { maxKeys: 20, minBalance: 1000, locked: true },
};

const TIER_ORDER = ['basic', 'pro', 'premium'];

// GET: 获取当前 AI 等级信息
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { aiTier: true, aiBalance: true, aiBalanceLocked: true, aiTierUpgradedAt: true, role: true },
    });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    const currentTier = user.aiTier || 'basic';
    const currentConfig = AI_TIER_CONFIG[currentTier] || AI_TIER_CONFIG.basic;

    // 号池 Key 数量（共享池模型，按套餐类型统计）
    const poolKeyCount = await db.aIKey.count({
      where: {
        userId: payload.userId,
        status: 'active',
        tier: { OR: [{ channelGroup: 'cardvela' }, { provider: { type: 'copilot-pool' } }] },
      },
    });

    // 可升级的等级列表
    const currentIndex = TIER_ORDER.indexOf(currentTier);
    const availableUpgrades = TIER_ORDER.slice(currentIndex + 1).map(tier => ({
      tier,
      ...AI_TIER_CONFIG[tier],
      canUpgrade: user.aiBalance >= AI_TIER_CONFIG[tier].minBalance,
    }));

    return NextResponse.json({
      currentTier,
      maxKeys: currentConfig.maxKeys,
      usedKeys: poolKeyCount,
      aiBalance: user.aiBalance,
      aiBalanceLocked: user.aiBalanceLocked,
      upgradedAt: user.aiTierUpgradedAt,
      availableUpgrades,
      tiers: AI_TIER_CONFIG,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 升级 AI 等级
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const body = await request.json();
    const { targetTier, agreed } = body;

    if (!targetTier || !AI_TIER_CONFIG[targetTier]) {
      return NextResponse.json({ error: '无效的目标等级' }, { status: 400 });
    }
    if (!agreed) {
      return NextResponse.json({ error: '请先阅读并同意升级协议' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    // 企业用户才能升级
    const userRole = user.role?.toLowerCase();
    if (userRole !== 'enterprise' && userRole !== 'admin') {
      return NextResponse.json({ error: '仅企业用户可升级 AI 等级' }, { status: 403 });
    }

    // 检查是否已经是目标等级或更高
    const currentIndex = TIER_ORDER.indexOf(user.aiTier || 'basic');
    const targetIndex = TIER_ORDER.indexOf(targetTier);
    if (targetIndex <= currentIndex) {
      return NextResponse.json({ error: '已经是该等级或更高等级，无需升级' }, { status: 400 });
    }

    // 检查余额要求
    const targetConfig = AI_TIER_CONFIG[targetTier];
    if (user.aiBalance < targetConfig.minBalance) {
      return NextResponse.json({
        error: `升级到 ${targetTier} 需要 AI 余额 ≥ $${targetConfig.minBalance}，当前 $${user.aiBalance.toFixed(2)}`,
      }, { status: 400 });
    }

    // 执行升级（锁定余额）
    await db.$transaction([
      db.user.update({
        where: { id: payload.userId },
        data: {
          aiTier: targetTier,
          aiBalanceLocked: targetConfig.locked,
          aiTierUpgradedAt: new Date(),
        },
      }),
      db.transaction.create({
        data: {
          userId: payload.userId,
          type: 'ai_tier_upgrade',
          amount: 0,
          status: 'completed',
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      newTier: targetTier,
      maxKeys: targetConfig.maxKeys,
      balanceLocked: targetConfig.locked,
    });
  } catch (error: any) {
    console.error('AI 等级升级失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
