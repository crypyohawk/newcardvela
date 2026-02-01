import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/prisma';
import { verifyAdmin } from '../../../../src/lib/adminAuth';

// 获取推荐设置
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '无权限' }, { status: 401 });

  try {
    const settings = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: ['referral_enabled', 'referral_reward_amount', 'referral_prompt_text']
        }
      }
    });

    const configMap: Record<string, string> = {};
    settings.forEach(s => { configMap[s.key] = s.value; });

    return NextResponse.json({
      settings: {
        enabled: configMap['referral_enabled'] === 'true',
        rewardAmount: configMap['referral_reward_amount'] || '5',
        promptText: configMap['referral_prompt_text'] || '推荐好友注册开卡，即可获得 $5 奖励！'
      }
    });
  } catch (error) {
    console.error('获取推荐设置失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// 更新推荐设置
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '无权限' }, { status: 401 });

  try {
    const body = await request.json();
    const { enabled, rewardAmount, promptText } = body;

    await prisma.systemConfig.upsert({
      where: { key: 'referral_enabled' },
      update: { value: enabled ? 'true' : 'false' },
      create: { key: 'referral_enabled', value: enabled ? 'true' : 'false' }
    });

    await prisma.systemConfig.upsert({
      where: { key: 'referral_reward_amount' },
      update: { value: String(rewardAmount) },
      create: { key: 'referral_reward_amount', value: String(rewardAmount) }
    });

    await prisma.systemConfig.upsert({
      where: { key: 'referral_prompt_text' },
      update: { value: promptText },
      create: { key: 'referral_prompt_text', value: promptText }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('保存推荐设置失败:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}
