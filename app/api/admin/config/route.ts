import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyAdmin, adminError } from '../../../../src/lib/adminAuth';

// 获取配置
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError();

  try {
    const configs = await db.systemConfig.findMany();
    const configMap: Record<string, string> = {};
    configs.forEach((c: { key: string; value: string }) => { 
      configMap[c.key] = c.value; 
    });

    return NextResponse.json({ configs: configMap });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 更新配置
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return adminError();

  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: 'key 不能为空' }, { status: 400 });
    }

    await db.systemConfig.upsert({
      where: { key },
      update: { value: value || '' },
      create: { key, value: value || '' },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
