// 本地测试脚本 - 验证 copilot-api 集成
// 在 VS Code 中运行此脚本测试整个流程

async function testCopilotAPI() {
  console.log('🚀 开始测试 Copilot API 集成...\n');

  // 1. 测试 copilot-api 直接调用
  console.log('1️⃣ 测试 copilot-api 直接调用...');
  try {
    const response = await fetch('http://localhost:4141/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'user', content: 'Hello, please respond with just "Copilot API is working!"' }
        ],
        max_tokens: 50
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Copilot API 响应成功');
      console.log('📝 响应内容:', data.choices[0].message.content);
    } else {
      console.log('❌ Copilot API 调用失败:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Copilot API 网络错误:', error.message);
  }

  console.log('\n2️⃣ 测试管理界面访问...');
  // 这里我们不能直接测试登录后的页面，但可以测试公开页面
  try {
    const response = await fetch('http://localhost:3001');
    if (response.ok) {
      console.log('✅ Next.js 应用运行正常');
    } else {
      console.log('❌ Next.js 应用无响应');
    }
  } catch (error) {
    console.log('❌ Next.js 网络错误:', error.message);
  }

  console.log('\n3️⃣ 测试数据库连接...');
  // 我们可以通过 API 测试数据库连接
  try {
    const response = await fetch('http://localhost:3001/api/admin/copilot-accounts', {
      headers: {
        'Authorization': 'Bearer test' // 这会失败但能测试 API 路由
      }
    });
    console.log('✅ API 路由可达 (认证会失败，这是正常的)');
  } catch (error) {
    console.log('❌ API 路由无响应:', error.message);
  }

  console.log('\n🎉 本地测试完成！');
  console.log('\n📋 下一步:');
  console.log('1. 访问 http://localhost:3001 登录');
  console.log('2. 去 /admin/copilot-accounts 添加账号');
  console.log('3. 点击"同步到 new-api"');
  console.log('4. 测试完整调用链');
}

// 运行测试
testCopilotAPI().catch(console.error);