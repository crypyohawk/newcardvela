import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationCode(userEmail: string, code: string) {
  try {
    // 开发模式下打印到控制台便于测试
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`[验证码邮件] 发送至: ${userEmail}`);
      console.log(`验证码: ${code}`);
      console.log(`${'='.repeat(50)}\n`);
      return { id: 'mock_' + Date.now() };
    }

    // 生产环境使用 Resend
    const result = await resend.emails.send({
      from: process.env.SUPPORT_EMAIL || 'noreply@CardVela.com',
      to: userEmail,
      subject: 'CardVela 卡片验证码',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>CardVela 卡片验证</h2>
          <p>您正在查看卡片敏感信息，请使用以下验证码：</p>
          <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; text-align: center;">
            <h1 style="color: #333; letter-spacing: 5px; font-family: monospace;">${code}</h1>
          </div>
          <p style="color: #666; font-size: 14px;">
            验证码有效期为 10 分钟。如非本人操作，请忽略此邮件。
          </p>
          <p style="color: #999; font-size: 12px;">
            此邮件由系统自动发送，请勿回复。
          </p>
        </div>
      `,
    });

    console.log('[邮件] 验证码已发送到:', userEmail);
    return result;
  } catch (error: any) {
    console.error('[邮件发送失败]', error);
    
    // 开发环境邮件发送失败时也打印验证码
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[开发模式] 验证码: ${code}`);
      return { id: 'mock_' + Date.now() };
    }
    
    throw new Error(`邮件发送失败: ${error.message}`);
  }
}
