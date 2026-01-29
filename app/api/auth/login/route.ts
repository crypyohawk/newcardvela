import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '../../../../src/lib/db';
import { generateToken } from '../../../../src/lib/auth';

// 登录失败限制
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

function checkLoginLimit(identifier: string): { allowed: boolean; waitTime?: number } {
  const now = Date.now();
  const record = loginAttempts.get(identifier);
  
  if (!record) return { allowed: true };
  
  if (record.lockedUntil > now) {
    return { 
      allowed: false, 
      waitTime: Math.ceil((record.lockedUntil - now) / 60000) 
    };
  }
  
  return { allowed: true };
}

function recordLoginFailure(identifier: string) {
  const now = Date.now();
  const record = loginAttempts.get(identifier) || { count: 0, lockedUntil: 0 };
  
  record.count++;
  
  // 5次失败后锁定15分钟
  if (record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000;
    record.count = 0;
  }
  
  loginAttempts.set(identifier, record);
}

function clearLoginAttempts(identifier: string) {
  loginAttempts.delete(identifier);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: '请填写邮箱和密码' }, { status: 400 });
    }

    const emailLower = email.toLowerCase();
    
    // 检查是否被锁定
    const limitCheck = checkLoginLimit(emailLower);
    if (!limitCheck.allowed) {
      return NextResponse.json({ 
        error: `登录失败次数过多，请${limitCheck.waitTime}分钟后再试` 
      }, { status: 429 });
    }

    const user = await db.user.findUnique({
      where: { email: emailLower },
    });

    if (!user) {
      recordLoginFailure(emailLower);
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      recordLoginFailure(emailLower);
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
    }

    // 登录成功，清除失败记录
    clearLoginAttempts(emailLower);

    const token = generateToken({ userId: user.id });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance,
      },
    });

  } catch (error: any) {
    console.error('登录失败:', error);
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
