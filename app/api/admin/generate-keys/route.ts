export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { generateKeyPair } from '../../../../src/lib/gsalary';
import { verifyToken, getTokenFromRequest } from '../../../../src/lib/auth';
import { db } from '../../../../src/lib/db';

export async function GET(request: NextRequest) {
  try {
    // 管理员认证
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: '无效的令牌' }, { status: 401 });
    }
    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '无管理员权限' }, { status: 403 });
    }

    const { publicKey, privateKey } = generateKeyPair();
    
    // 转换为 .env 格式（换行符替换为 \n）
    const privateKeyEnv = privateKey.replace(/\n/g, '\\n');
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>RSA 密钥对生成 - 仅需一次</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 1000px; margin: 0 auto; background: #f0f0f0; }
    .warning-box { background: #ff6b6b; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .step-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .step-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 15px; }
    .key-area { background: #1a1a2e; color: #00ff00; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 11px; white-space: pre-wrap; word-break: break-all; max-height: 200px; overflow-y: auto; }
    .copy-btn { background: #4CAF50; color: white; border: none; padding: 12px 25px; cursor: pointer; border-radius: 5px; margin-top: 10px; font-size: 14px; }
    .copy-btn:hover { background: #45a049; }
    .env-format { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 12px; white-space: pre-wrap; word-break: break-all; }
    .highlight { background: #ffeb3b; color: #000; padding: 2px 5px; }
    ol { line-height: 2; }
  </style>
</head>
<body>
  <div class="warning-box">
    <h2>⚠️ 重要提示</h2>
    <p>此页面每次刷新都会生成<strong>新的密钥对</strong>！</p>
    <p>请<strong>立即复制并保存</strong>下方的私钥，否则刷新后将丢失！</p>
  </div>

  <div class="step-box">
    <div class="step-title">📋 操作步骤</div>
    <ol>
      <li>复制下方的 <span class="highlight">公钥</span>，粘贴到 GSalary 开发者页面的"客户公钥"</li>
      <li>点击 GSalary 的"确认"按钮</li>
      <li>复制 GSalary 返回的"平台公钥"</li>
      <li>复制下方的 <span class="highlight">私钥 (ENV格式)</span>，粘贴到 .env.local</li>
      <li>将平台公钥也粘贴到 .env.local</li>
    </ol>
  </div>

  <div class="step-box">
    <div class="step-title">🔑 第1步：复制公钥到 GSalary</div>
    <div class="key-area" id="publicKey">${publicKey}</div>
    <button class="copy-btn" onclick="copyText('publicKey')">📋 复制公钥</button>
  </div>

  <div class="step-box">
    <div class="step-title">🔒 第2步：保存私钥到 .env.local</div>
    <p style="color: red; font-weight: bold;">⚠️ 这是私钥！请妥善保管，不要泄露！</p>
    <div class="env-format" id="privateKeyEnv">GSALARY_PRIVATE_KEY="${privateKeyEnv}"</div>
    <button class="copy-btn" onclick="copyText('privateKeyEnv')">📋 复制私钥配置</button>
  </div>

  <div class="step-box">
    <div class="step-title">📝 完整的 .env.local 配置模板</div>
    <div class="env-format" id="fullEnv"># GSalary API 配置
GSALARY_API_URL="https://api.gsalary.com"
GSALARY_APP_ID="8a3efb7e-67fa-41f2-b266-6f8d4f7c50d8"

# 私钥（刚生成的）
GSALARY_PRIVATE_KEY="${privateKeyEnv}"

# 平台公钥（从GSalary复制，换行符替换为\\n）
GSALARY_PLATFORM_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\\n在这里粘贴GSalary的平台公钥内容\\n-----END PUBLIC KEY-----"</div>
    <button class="copy-btn" onclick="copyText('fullEnv')">📋 复制完整配置</button>
  </div>

  <script>
    function copyText(id) {
      const text = document.getElementById(id).innerText;
      navigator.clipboard.writeText(text).then(() => {
        alert('✅ 复制成功！');
      });
    }
  </script>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
