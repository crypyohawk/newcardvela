export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/prisma';
import { verifyAdmin } from '../../../../src/lib/adminAuth';

const KEY = 'platform_announcement';

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }
    const row = await prisma.systemConfig.findUnique({ where: { key: KEY } });
    if (!row) {
      return NextResponse.json({
        enabled: false,
        content: '亲爱的用户，欢迎使用 Cardvela 平台。\n\n1. 【一卡一用】虚拟卡仅供本人使用，严禁将卡片转借、出租或多人共享使用。\n\n2. 【禁止恶意交易】禁止使用卡片进行任何欺诈性消费、套现、洗钱或其他违规操作。\n\n3. 【订阅续费保障余额】若卡片绑定订阅服务，请确保卡内余额充足。余额不足导致续费失败累计超过 2 次，平台将自动注销该卡片且不退款。',
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
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }
    const body = await request.json();
    const { content, enabled } = body;
    if (typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: '公告内容不能为空' }, { status: 400 });
    }

    const existing = await prisma.systemConfig.findUnique({ where: { key: KEY } });
    const prevData = existing ? JSON.parse(existing.value) : { version: 0 };
    const prevContent = prevData.content || '';
    const version = prevContent.trim() !== content.trim() ? (prevData.version || 0) + 1 : (prevData.version || 1);

    const value = JSON.stringify({ content: content.trim(), enabled: !!enabled, version });
    await prisma.systemConfig.upsert({
      where: { key: KEY },
      update: { value },
      create: { key: KEY, value },
    });
    return NextResponse.json({ success: true, version });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
