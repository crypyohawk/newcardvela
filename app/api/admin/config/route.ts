import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/prisma';

// 获取配置
export async function GET(request: NextRequest) {
  try {
    const configs = await prisma.systemConfig.findMany();
    const configMap: Record<string, string> = {};
    configs.forEach(c => { configMap[c.key] = c.value; });

    return NextResponse.json({
      supportEmail: configMap['support_email'] || '',
      // ...other configs...
    });
  } catch (error) {
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}

// 更新配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { support_email } = body;

    if (support_email !== undefined) {
      await prisma.systemConfig.upsert({
        where: { key: 'support_email' },
        update: { value: support_email },
        create: { key: 'support_email', value: support_email },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '保存配置失败' }, { status: 500 });
  }
}
