import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../src/lib/auth';
import { quickApplyCard, getCards, getCardDetail } from '../../../../src/lib/gsalary';
import { prisma } from '../../../../src/lib/prisma';

// 获取用户的卡片列表
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: '无效的令牌' }, { status: 401 });
    }

    const cards = await db.userCard.findMany({
      where: { userId: payload.userId },
      include: { cardType: true },
      orderBy: { createdAt: 'desc' },
    });

    // 同步上游余额（等待完成后再返回最新数据）
    try {
      await syncCardBalances(cards);
      // 重新查询更新后的数据
      const updatedCards = await db.userCard.findMany({
        where: { userId: payload.userId },
        include: { cardType: true },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ cards: updatedCards });
    } catch (syncErr: any) {
      console.error('同步余额失败，返回本地数据:', syncErr.message);
      return NextResponse.json({ cards });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 同步卡片余额和状态
async function syncCardBalances(cards: any[]) {
  for (const card of cards) {
    if (!card.gsalaryCardId) continue;
    
    try {
      const detail = await getCardDetail(card.gsalaryCardId);
      const upstreamBalance = detail.available_balance || 0;
      const upstreamStatus = detail.status === 'ACTIVE' ? 'active' : 'pending';
      
      // 提取卡号后四位
      const maskCardNumber = detail.mask_card_number || '';
      const cardNoLast4 = maskCardNumber.slice(-4) || card.cardNoLast4 || '';
      
      // 检查是否需要更新
      const needUpdate = 
        card.balance !== upstreamBalance || 
        card.status !== upstreamStatus ||
        card.cardNoLast4 !== cardNoLast4;
      
      if (needUpdate) {
        await db.userCard.update({
          where: { id: card.id },
          data: { 
            balance: upstreamBalance,
            status: upstreamStatus,
            cardNoLast4: cardNoLast4,
          },
        });
        console.log(`[同步] 卡 ${card.id} 状态: ${card.status} -> ${upstreamStatus}, 余额: ${card.balance} -> ${upstreamBalance}`);
      }
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.includes('Invalid ip') || msg.includes('Invalid IP') || msg.includes('403')) {
        throw new Error('Invalid ip');
      }
      console.error(`[同步] 卡 ${card.id} 失败:`, err);
    }
  }
}

// 申请开卡
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: '无效的令牌' }, { status: 401 });
    }

    const body = await request.json();
    const { cardTypeId, initialAmount = 0 } = body;

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const cardType = await db.cardType.findUnique({ where: { id: cardTypeId } });
    if (!cardType || !cardType.isActive) {
      return NextResponse.json({ error: '卡片类型不可用' }, { status: 400 });
    }

    // 计算费用
    const rechargeFee = initialAmount * (cardType.rechargeFeePercent / 100);
    const totalCost = cardType.openFee + initialAmount + rechargeFee;

    if (user.balance < totalCost) {
      return NextResponse.json({
        error: `余额不足，需要 $${totalCost.toFixed(2)}，当前余额 $${user.balance.toFixed(2)}`
      }, { status: 400 });
    }

    // 调用上游API开卡（使用默认持卡人）
    let applyResult;
    try {
      applyResult = await quickApplyCard({
        product_code: cardType.cardBin,
        init_balance: Math.round(initialAmount * 100),
      });
    } catch (err: any) {
      console.error('开卡调用失败:', err);
      return NextResponse.json({ error: `开卡失败: ${err.message}` }, { status: 502 });
    }

    console.log('开卡结果:', applyResult);

    // 提取卡号后四位
    const maskCardNumber = applyResult.mask_card_number || '';
    const cardNoLast4 = maskCardNumber.slice(-4) || '';
    
    // 确定卡片状态
    const cardStatus = applyResult.status === 'ACTIVE' ? 'active' : 'pending';

    // 扣除用户余额
    await db.user.update({
      where: { id: payload.userId },
      data: { balance: { decrement: totalCost } },
    });

    // 创建卡片记录
    const userCard = await db.userCard.create({
      data: {
        userId: payload.userId,
        cardTypeId: cardType.id,
        gsalaryCardId: applyResult.card_id || null,
        cardNoLast4: cardNoLast4,
        status: cardStatus,
        balance: initialAmount,
        openFee: cardType.openFee,
      },
      include: { cardType: true },
    });

    // 记录交易
    await db.transaction.create({
      data: {
        userId: payload.userId,
        type: 'purchase',
        amount: -totalCost,
        status: 'completed',
      },
    });

    // 轮询上游卡列表，尝试找到对应的 card_id
    let upstreamCard: any = null;
    const holderId = process.env.GSALARY_DEFAULT_CARD_HOLDER_ID || undefined;
    if (applyResult && applyResult.request_id && holderId) {
      const maxAttempts = 15;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          await new Promise(res => setTimeout(res, 1500));

          const cardsRes = await getCards({ page: 1, limit: 100, card_holder_id: holderId });
          
          // 打印完整的 API 响应结构
          console.log('[API原始响应]', JSON.stringify(cardsRes, null, 2));
          
          // 提取卡片数组（兼容多种响应格式）
          let upstreamCards: any[] = [];
          if (Array.isArray(cardsRes)) {
            upstreamCards = cardsRes;
          } else if (cardsRes?.cards && Array.isArray(cardsRes.cards)) {
            upstreamCards = cardsRes.cards;
          } else if (cardsRes?.list && Array.isArray(cardsRes.list)) {
            upstreamCards = cardsRes.list;
          } else if (cardsRes?.data && Array.isArray(cardsRes.data)) {
            upstreamCards = cardsRes.data;
          }

          console.log(`[轮询 ${attempt + 1}/${maxAttempts}] 获取到 ${upstreamCards.length} 张卡`);
          
          // 打印所有卡片的基本信息
          upstreamCards.forEach((c, idx) => {
            console.log(`[卡片${idx}]`, {
              card_id: c.card_id,
              id: c.id,
              request_id: c.request_id,
              card_no: c.card_no,
              pan: c.pan,
              create_time: c.create_time,
              status: c.status,
            });
          });
          
          // 打印第一张卡的完整结构
          if (attempt === 0 && upstreamCards.length > 0) {
            console.log('[完整卡片结构]', JSON.stringify(upstreamCards[0], null, 2));
          }

          // 寻找匹配的卡
          // 策略：按时间戳范围匹配（applyResult.create_time 应该是最新的卡的创建时间）
          upstreamCard = upstreamCards.find((c: any) => {
            if (!c) return false;
            
            // 策略 1: 按 card_id 直接判断（如果 applyResult 包含 card_id）
            if (applyResult.card_id && c.card_id === applyResult.card_id) {
              console.log('[匹配成功] 按 card_id 精确匹配');
              return true;
            }

            // 策略 2: 按创建时间匹配（applyResult.create_time 是 ISO 格式）
            // 由于上游返回的卡片没有 create_time，改用：找状态为 PENDING 的最新卡
            if (c.status === 'PENDING') {
              console.log('[匹配成功] 按 PENDING 状态匹配（新开的卡）');
              return true;
            }

            return false;
          });

          // 如果还是没找到，取第一张（最新的）
          if (!upstreamCard && upstreamCards.length > 0) {
            console.log('[启发式匹配] 找不到 PENDING 卡，使用最近的卡');
            upstreamCard = upstreamCards[0];
          }

          if (upstreamCard) {
            console.log('[匹配成功]', {
              card_id: upstreamCard.card_id,
              status: upstreamCard.status,
              mask_card_number: upstreamCard.mask_card_number,
            });
            break;
          }
        } catch (err: any) {
          console.warn(`[轮询失败 ${attempt + 1}/${maxAttempts}]`, err?.message || err);
        }
      }
    }

    // 如果找到了上游卡信息，更新本地记录
    if (upstreamCard && userCard) {
      try {
        // 注意：mask_card_number 是掩码卡号如 "456599******7671"
        // 需要直接用最后4位，而不是提取 card_id 的最后4位
        let last4 = null;
        
        if (upstreamCard.mask_card_number) {
          // 从掩码卡号提取最后4位：456599******7671 -> 7671
          const matches = upstreamCard.mask_card_number.match(/(\d{4})$/);
          last4 = matches ? matches[1] : null;
        }

        console.log('[同步] 提取卡号:', { 
          mask_card_number: upstreamCard.mask_card_number,
          last4 
        });

        // 获取卡的真实状态（PENDING 的卡需要等待激活）
        const cardStatus = upstreamCard.status?.toLowerCase() || 'pending';
        
        await db.userCard.update({
          where: { id: userCard.id },
          data: {
            gsalaryCardId: upstreamCard.card_id || null,
            cardNoLast4: last4, // 存储卡号后4位，不是 ID 后4位
            status: cardStatus === 'pending' ? 'pending' : 'active',
          },
        });

        console.log('[同步完成] 卡片状态:', cardStatus, '后四位:', last4);
      } catch (err: any) {
        console.error('[同步失败]', err);
      }
    } else {
      console.log('[同步] 未找到匹配的卡片或 upstreamCard 为空');
      console.log('[调试信息]', { 
        upstreamCard: !!upstreamCard, 
        userCard: !!userCard,
        applyResult,
      });
    }

    // 开卡成功后，检查并发放推荐奖励
    await checkAndGrantReferralReward(userCard.userId);

    return NextResponse.json({
      success: true,
      card: userCard,
      message: applyResult.status === 'SUCCESS' ? '开卡成功' : '开卡申请已提交，等待处理',
    });
  } catch (error: any) {
    console.error('开卡失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 开卡成功后，检查并发放推荐奖励
async function checkAndGrantReferralReward(userId: string) {
  try {
    // 获取推荐功能设置
    const enabledConfig = await prisma.systemConfig.findUnique({
      where: { key: 'referral_enabled' }
    });
    
    if (enabledConfig?.value !== 'true') return;

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        referredBy: true,
      }
    });

    if (!user?.referredBy) return;

    // 检查是否是首次开卡
    const userCardCount = await prisma.userCard.count({
      where: { userId }
    });

    // 只有首次开卡才发放奖励
    if (userCardCount !== 1) return;  // ← 这里：如果不是第1张卡，直接返回不发奖励

    // 获取奖励金额
    const rewardConfig = await prisma.systemConfig.findUnique({
      where: { key: 'referral_reward_amount' }
    });
    const rewardAmount = parseFloat(rewardConfig?.value || '5');

    // 发放奖励给推荐人
    await prisma.user.update({
      where: { id: user.referredBy },
      data: { balance: { increment: rewardAmount } }
    });
    
    console.log(`[推荐奖励] 用户 ${user.username} 首次开卡，推荐人 ${user.referredBy} 获得 $${rewardAmount}`);
  } catch (error) {
    console.error('发放推荐奖励失败:', error);
  }
}
