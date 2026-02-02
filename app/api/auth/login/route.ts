import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../../../src/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 防暴力破解：记录每个 IP 的登录失败次数
const loginAttempts = new Map<string, { count: number; resetTime: number }>();

function isLoginRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetTime) {
    loginAttempts.set(ip, { count: 0, resetTime: now + 3600000 }); // 1小时
    return false;
  }

  if (record.count >= 5) {
    return true; // 超过5次失败，拒绝登录
  }

  return false;
}

function incrementLoginAttempt(ip: string): void {
  const record = loginAttempts.get(ip);
  if (record) {
    record.count++;
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // 检查是否被限流
    if (isLoginRateLimited(ip)) {
      return NextResponse.json({ error: '登录尝试次数过多，请1小时后再试' }, { status: 429 });
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 });
    }

    // 查询用户
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      incrementLoginAttempt(ip);
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
    }

    // 比对密码
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      incrementLoginAttempt(ip);
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
    }

    // 密码正确，重置该 IP 的失败次数
    loginAttempts.delete(ip);

    // 生成 JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        balance: user.balance,
      },
    });

  } catch (error: any) {
    console.error('登录失败:', error);
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
