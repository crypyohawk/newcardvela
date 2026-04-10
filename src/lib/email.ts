import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

export async function sendVerificationCode(userEmail: string, code: string) {
  console.log('[Email] RESEND_API_KEY 存在:', !!process.env.RESEND_API_KEY);
  
  if (!resend) {
    console.log('[Email] resend 实例为 null，打印验证码');
    console.log(`发送至: ${userEmail}, 验证码: ${code}`);
    return { success: true, id: 'no_api_key_' + Date.now() };
  }

  try {
    console.log('[Resend] 开始发送邮件至:', userEmail);

    const { data, error } = await resend.emails.send({
      from: 'CardVela <noreply@cardvela.com>',
      to: userEmail,
      subject: '您的验证码 - CardVela',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">CardVela 验证码</h2>
          <p>您的验证码是：</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #1f2937; letter-spacing: 4px;">${code}</span>
          </div>
          <p style="color: #6b7280;">验证码有效期为 10 分钟。</p>
        </div>
      `,
    });

    if (error) {
      console.error('[Resend] API 返回错误:', error);
      console.error('[Resend] 错误名称:', error.name);
      console.error('[Resend] 错误消息:', error.message);
      throw new Error(error.message);
    }

    console.log('[Resend] 发送成功, ID:', data?.id);
    return { success: true, id: data?.id };
  } catch (error: any) {
    console.error('[Resend] 捕获异常:', error.message || error);
    console.error('[Resend] 异常堆栈:', error.stack);
    throw error;
  }
}

// 转发GSalary验证码给用户
export async function sendVerificationCodeForward(params: {
  to: string;
  username: string;
  otp: string;
  typeName: string;
  merchantName: string;
  maskedCardNumber: string;
  amount?: string;
}) {
  const { to, username, otp, typeName, merchantName, maskedCardNumber, amount } = params;

  if (!resend) {
    console.log(`[邮件] resend未配置，打印验证码: ${otp} -> ${to}`);
    return;
  }

  const amountHtml = amount 
    ? `<tr><td style="padding:8px 0;color:#666;">交易金额</td><td style="padding:8px 0;font-weight:bold;">${amount}</td></tr>` 
    : '';

  const html = `
    <div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif;">
      <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:22px;">🔐 交易验证码</h1>
      </div>
      <div style="background:#fff;padding:30px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;">
        <p style="color:#333;font-size:15px;">您好 <strong>${username}</strong>，</p>
        <p style="color:#666;font-size:14px;">您的卡片正在进行一笔交易，请使用以下验证码完成验证：</p>
        
        <div style="background:#f8f9fa;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
          <div style="font-size:36px;font-weight:bold;color:#667eea;letter-spacing:8px;">${otp}</div>
        </div>

        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#666;">验证类型</td>
            <td style="padding:8px 0;font-weight:bold;">${typeName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666;">商户名称</td>
            <td style="padding:8px 0;font-weight:bold;">${merchantName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666;">卡号</td>
            <td style="padding:8px 0;font-weight:bold;font-family:monospace;">${maskedCardNumber}</td>
          </tr>
          ${amountHtml}
        </table>

        <div style="margin-top:20px;padding:15px;background:#fff3cd;border-radius:8px;border-left:4px solid #ffc107;">
          <p style="margin:0;font-size:13px;color:#856404;">⚠️ 验证码有效期较短，请尽快输入。如非本人操作，请立即冻结卡片。</p>
        </div>

        <p style="color:#999;font-size:12px;margin-top:20px;">请勿将验证码告知他人。此邮件由系统自动发送，请勿回复。</p>
      </div>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'CardVela <noreply@cardvela.com>',
      to: to,
      subject: `【交易验证码】${otp} - ${merchantName} (${maskedCardNumber})`,
      html: html,
    });

    if (error) {
      console.error(`[邮件] 验证码转发API错误:`, error);
      throw new Error(error.message);
    }

    console.log(`[邮件] 验证码转发成功: ${to}, ID: ${data?.id}`);
  } catch (error) {
    console.error(`[邮件] 验证码转发失败:`, error);
    throw error;
  }
}

// 管理员告警邮件
export async function sendAdminAlert(params: {
  to: string;
  subject: string;
  title: string;
  message: string;
  details: string;
  action: string;
}) {
  const { to, subject, title, message, details, action } = params;

  if (!resend) {
    console.log(`[邮件] resend未配置，打印告警: ${title}\n${details}`);
    return;
  }

  const detailsHtml = details.replace(/\n/g, '<br>').replace(/•/g, '&#8226;');

  const html = `
    <div style="max-width:560px;margin:0 auto;font-family:Arial,sans-serif;">
      <div style="background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:20px;">⚠️ ${title}</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;">
        <p style="color:#333;font-size:14px;">${message}</p>
        <div style="background:#fef2f2;border-radius:8px;padding:16px;margin:16px 0;font-family:monospace;font-size:13px;color:#991b1b;line-height:1.8;">
          ${detailsHtml}
        </div>
        <div style="margin-top:16px;padding:12px;background:#fffbeb;border-radius:8px;border-left:4px solid #f59e0b;">
          <p style="margin:0;font-size:13px;color:#92400e;">💡 ${action}</p>
        </div>
        <p style="color:#999;font-size:11px;margin-top:16px;">此邮件由 CardVela 监控系统自动发送 · ${new Date().toISOString()}</p>
      </div>
    </div>
  `;

  const { data, error } = await resend.emails.send({
    from: 'CardVela Alert <noreply@cardvela.com>',
    to: to,
    subject: subject,
    html: html,
  });

  if (error) {
    console.error(`[邮件] 告警发送失败:`, error);
    throw new Error(error.message);
  }

  console.log(`[邮件] 告警发送成功: ${to}, ID: ${data?.id}`);
}