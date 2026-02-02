import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { setCode } from '../../../../src/lib/verificationCodes';
import { sendVerificationCode } from '../../../../src/lib/email';

// 发送限流
const sendAttempts = new Map<string, { count: number; lastSend: number }>();

function canSendCode(email: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const record = sendAttempts.get(email);
  
  if (!record) return { allowed: true };
  
  const timePassed = now - record.lastSend;
  if (timePassed < 60000) {
    return { allowed: false, waitSeconds: Math.ceil((60000 - timePassed) / 1000) };
  }
  
  if (now - record.lastSend > 3600000) {
    sendAttempts.set(email, { count: 1, lastSend: now });
    return { allowed: true };
  }
  
  if (record.count >= 5) {
    return { allowed: false, waitSeconds: 3600 };
  }
  
  return { allowed: true };
}

function recordSend(email: string) {
  const now = Date.now();
  const record = sendAttempts.get(email) || { count: 0, lastSend: 0 };
  record.count++;
  record.lastSend = now;
  sendAttempts.set(email, record);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, type } = body;

    if (!email) {
      return NextResponse.json({ error: '请填写邮箱' }, { status: 400 });
    }

    // 邮箱格式验证（加强版）
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });
    }

    // 禁止一次性邮箱域名（可选）
    const disposableDomains = ['tempmail.com', 'guerrillamail.com', '10minutemail.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    if (disposableDomains.includes(domain)) {
      return NextResponse.json({ error: '不支持临时邮箱' }, { status: 400 });
    }

    const emailLower = email.toLowerCase();

    const sendCheck = canSendCode(emailLower);
    if (!sendCheck.allowed) {
      return NextResponse.json({ 
        error: `请${sendCheck.waitSeconds}秒后再试` 
      }, { status: 429 });
    }

    if (type === 'register') {
      const existingUser = await db.user.findUnique({
        where: { email: emailLower },
      });
      if (existingUser) {
        return NextResponse.json({ error: '该邮箱已注册' }, { status: 400 });
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 使用共享存储
    setCode(emailLower, code);
    recordSend(emailLower);

    // 使用统一的邮件发送函数
    await sendVerificationCode(emailLower, code);

    return NextResponse.json({ success: true, message: '验证码已发送' });

  } catch (error: any) {
    console.error('发送验证码失败:', error);
    return NextResponse.json({ error: '发送失败，请稍后再试' }, { status: 500 });
  }
}
