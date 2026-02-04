import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 验证管理员
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || (user.role !== 'admin' && user.role !== 'ADMIN')) return null;
    return user;
  } catch {
    return null;
  }
}

// GET - 获取配置
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const configs = await prisma.systemConfig.findMany();
    const configMap: Record<string, string> = {};
    configs.forEach(c => { configMap[c.key] = c.value; });

    return NextResponse.json({
      support_email: configMap['support_email'] || '',
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// POST - 保存配置
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // 保存每个配置项
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        await prisma.systemConfig.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('保存配置失败:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}
