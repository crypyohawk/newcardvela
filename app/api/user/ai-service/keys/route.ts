export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';
import { createNewApiToken, getNewApiTokenDetail, deleteNewApiToken, usdToQuota } from '../../../../../src/lib/newapi';

/** 生成混淆名称，防止上游识别客户身份 */
function obfuscateKeyName(userId: string, keyName: string): string {
  const hash = crypto.createHash('sha256').update(`${userId}-${keyName}-${Date.now()}`).digest('hex').slice(0, 8);
  return `proj-${hash}`;
}

// 获取用户的所有 Key
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const keys = await db.aIKey.findMany({
      where: { userId: payload.userId },
      include: {
        tier: {
          select: {
            name: true,
            displayName: true,
            modelGroup: true,
            provider: { select: { type: true, displayName: true, baseUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ keys });
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
    const { keyName, tierId, monthlyLimit } = body;

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

    // 验证用户余额
    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    if (user.balance <= 0) {
      return NextResponse.json({ error: '账户余额不足，请先充值' }, { status: 400 });
    }

    // 限制每个用户最多 10 个 Key
    const existingCount = await db.aIKey.count({ where: { userId: payload.userId } });
    if (existingCount >= 10) {
      return NextResponse.json({ error: '每个用户最多创建 10 个 Key' }, { status: 400 });
    }

    // 在 new-api 创建 token，获取 new-api 实际生成的 key
    let newApiTokenId: number | null = null;
    let apiKey: string = '';
    const tokenName = obfuscateKeyName(payload.userId, keyName.trim());
    try {
      const maxQuota = monthlyLimit ? Math.min(monthlyLimit, user.balance * 2) : Math.min(user.balance * 2, 100);
      const quotaAmount = usdToQuota(maxQuota);
      const result = await createNewApiToken({
        name: tokenName,
        remainQuota: quotaAmount,
        group: tier.channelGroup || 'default',
      });
      newApiTokenId = result.id;
      apiKey = result.key;  // 使用 new-api 实际返回的 key
      console.log(`[key-create] success: id=${result.id}, key=${apiKey.slice(0,8)}...${apiKey.slice(-4)}`);
    } catch (e: any) {
      console.error('new-api 创建 token 失败:', e.message);
      return NextResponse.json({
        error: 'AI Key 同步到网关失败，请检查 new-api 管理认证配置',
        details: e.message,
      }, { status: 502 });
    }

    // 存入数据库
    const createData: any = {
      userId: payload.userId,
      tierId,
      keyName: keyName.trim(),
      apiKey: apiKey,
      newApiTokenId,
      newApiTokenName: tokenName,
      status: 'active',
      monthlyLimit: monthlyLimit || null,
    };
    const aiKey = await db.aIKey.create({
      data: createData,
      include: { tier: { select: { name: true, displayName: true } } },
    });

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
      },
    });
  } catch (error: any) {
    console.error('创建 Key 失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
