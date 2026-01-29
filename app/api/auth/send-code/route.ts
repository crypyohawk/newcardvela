import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { setCode } from '../../../../src/lib/verificationCodes';

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

    // 生产环境使用 Resend 发送
    if (process.env.NODE_ENV === 'production' && process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'CardVela <noreply@CardVela.com>',
        to: emailLower,
        subject: 'CardVela 验证码',
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>CardVela 验证码</h2>
            <p>您的验证码是：</p>
            <div style="font-size: 32px; font-weight: bold; color: #3b82f6; padding: 20px; background: #f1f5f9; border-radius: 8px; text-align: center;">
              ${code}
            </div>
            <p style="color: #666; margin-top: 20px;">验证码5分钟内有效，请勿泄露给他人。</p>
          </div>
        `,
      });
    } else {
      // 开发环境显示在终端
      console.log('\n==================================================');
      console.log(`[验证码] 发送至: ${emailLower}`);
      console.log(`验证码: ${code}`);
      console.log('==================================================\n');
    }

    return NextResponse.json({ success: true, message: '验证码已发送' });

  } catch (error: any) {
    console.error('发送验证码失败:', error);
    return NextResponse.json({ error: '发送失败，请稍后再试' }, { status: 500 });
  }
}
