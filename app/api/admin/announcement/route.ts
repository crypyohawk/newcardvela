export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../src/lib/auth';

const KEY = 'platform_announcement';

function isAdmin(token: string | null) {
  if (!token) return false;
  const payload = verifyToken(token);
  if (!payload) return false;
  return (payload as any).role === 'admin' || (payload as any).role === 'ADMIN';
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!isAdmin(token)) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }
    const row = await db.systemConfig.findUnique({ where: { key: KEY } });
    if (!row) {
      return NextResponse.json({
        enabled: false,
        content: '亲爱的用户，欢迎使用 Cardvela 平台。请认真阅读以下使用规范：\n\n1. 【一卡一用】虚拟卡仅供本人使用，严禁将卡片转借、出租或多人共享使用。\n\n2. 【禁止恶意交易】禁止使用卡片进行任何欺诈性消费、套现、洗钱或其他违规操作，一经发现立即冻结账户，追究法律责任。\n\n3. 【订阅续费保障余额】若您使用卡片绑定了任何订阅服务（如 Netflix、Spotify、ChatGPT Plus 等），请务必确保卡内余额充足，以保证下月续费顺利扣款。\n   - 若因余额不足导致续费扣款失败，累计失败次数超过 2 次，平台将自动注销该卡片。\n   - 注销后卡内剩余资金将不予退还，请提前做好充值安排。\n\n4. 【合规使用】请在法律法规允许的范围内使用本平台服务，任何违规行为将导致账户封禁且不予退款。\n\n点击"我已阅读并同意"即表示您已知悉并接受上述规范，如有疑问请联系客服。',
        version: 1,
      });
    }
    const data = JSON.parse(row.value);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!isAdmin(token)) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }
    const body = await request.json();
    const { content, enabled } = body;
    if (typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: '公告内容不能为空' }, { status: 400 });
    }

    // 每次保存内容变更时 version +1，强制所有用户重新阅读
    const existing = await db.systemConfig.findUnique({ where: { key: KEY } });
    const prevData = existing ? JSON.parse(existing.value) : { version: 0 };
    const prevContent = prevData.content || '';
    const version = prevContent.trim() !== content.trim() ? (prevData.version || 0) + 1 : (prevData.version || 1);

    const value = JSON.stringify({ content: content.trim(), enabled: !!enabled, version });
    await db.systemConfig.upsert({
      where: { key: KEY },
      update: { value },
      create: { key: KEY, value },
    });
    return NextResponse.json({ success: true, version });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
