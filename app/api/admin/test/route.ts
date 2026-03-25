export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getBalance, getCards } from '../../../../src/lib/gsalary';
import { verifyToken, getTokenFromRequest } from '../../../../src/lib/auth';
import { db } from '../../../../src/lib/db';

export async function GET(request: NextRequest) {
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

  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    tests: [],
  };

  // 测试 1: 检查环境变量
  const envCheck = {
    name: '环境变量检查',
    status: 'pending',
    details: {},
  };

  envCheck.details = {
    GSALARY_API_URL: process.env.GSALARY_API_URL ? '✅ 已配置' : '❌ 未配置',
    GSALARY_APP_ID: process.env.GSALARY_APP_ID ? '✅ 已配置' : '❌ 未配置',
    GSALARY_PRIVATE_KEY: process.env.GSALARY_PRIVATE_KEY ? '✅ 已配置' : '❌ 未配置',
    GSALARY_PLATFORM_PUBLIC_KEY: process.env.GSALARY_PLATFORM_PUBLIC_KEY ? '✅ 已配置' : '❌ 未配置',
  };

  const allEnvSet = process.env.GSALARY_API_URL && 
                    process.env.GSALARY_APP_ID && 
                    process.env.GSALARY_PRIVATE_KEY && 
                    process.env.GSALARY_PLATFORM_PUBLIC_KEY;

  envCheck.status = allEnvSet ? 'success' : 'failed';
  results.tests.push(envCheck);

  // 测试 2: 获取余额
  const balanceTest = {
    name: '获取商户余额',
    status: 'pending',
    details: {},
    error: null,
  };

  try {
    const balance = await getBalance();
    balanceTest.status = 'success';
    balanceTest.details = balance;
  } catch (error: any) {
    balanceTest.status = 'failed';
    balanceTest.error = error.message;
  }
  results.tests.push(balanceTest);

  // 测试 3: 获取卡BIN列表
  const binsTest = {
    name: '获取卡BIN列表',
    status: 'pending',
    details: {},
    error: null,
  };

  try {
    const bins = await getCards();
    binsTest.status = 'success';
    binsTest.details = bins;
  } catch (error: any) {
    binsTest.status = 'failed';
    binsTest.error = error.message;
  }
  results.tests.push(binsTest);

  // 生成 HTML 报告
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>GSalary API 测试</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; background: #f5f5f5; }
    h1 { color: #333; }
    .test-card { background: white; border-radius: 8px; padding: 20px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .test-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .test-name { font-size: 18px; font-weight: bold; }
    .status { padding: 5px 15px; border-radius: 20px; font-size: 14px; }
    .status.success { background: #d4edda; color: #155724; }
    .status.failed { background: #f8d7da; color: #721c24; }
    .status.pending { background: #fff3cd; color: #856404; }
    .details { background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 13px; white-space: pre-wrap; overflow-x: auto; }
    .error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 5px; margin-top: 10px; }
    .timestamp { color: #666; font-size: 14px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>🔌 GSalary API 连接测试</h1>
  <p class="timestamp">测试时间: ${results.timestamp}</p>
  
  ${results.tests.map((test: any) => `
    <div class="test-card">
      <div class="test-header">
        <span class="test-name">${test.name}</span>
        <span class="status ${test.status}">${test.status === 'success' ? '✅ 成功' : test.status === 'failed' ? '❌ 失败' : '⏳ 等待'}</span>
      </div>
      <div class="details">${JSON.stringify(test.details, null, 2)}</div>
      ${test.error ? `<div class="error">错误: ${test.error}</div>` : ''}
    </div>
  `).join('')}

  <div class="test-card">
    <h3>📝 下一步</h3>
    <ul>
      <li>如果环境变量检查失败，请检查 .env.local 文件</li>
      <li>如果 API 调用失败，可能是 IP 白名单未配置（需要部署后配置）</li>
      <li>如果提示签名错误，请检查私钥格式是否正确</li>
    </ul>
  </div>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
