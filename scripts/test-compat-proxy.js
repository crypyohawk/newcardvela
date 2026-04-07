// 在服务器上运行的测试脚本
const http = require('http');
const TOKEN = 'sk-SHssuQvVynAvJ2tPxZG6Rgbm0OB7hgIqgszNanYapkUPxsBM';

function post(desc, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: '127.0.0.1', port: 3002, path: '/v1/chat/completions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}`, 'Content-Length': Buffer.byteLength(data) },
    };
    const req = http.request(opts, (res) => {
      let out = '';
      res.on('data', c => out += c);
      res.on('end', () => {
        console.log(`\n=== ${desc} ===`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body: ${out.substring(0, 300)}`);
        resolve();
      });
    });
    req.on('error', e => { console.log(`\n=== ${desc} === ERROR: ${e.message}`); resolve(); });
    req.end(data);
  });
}

async function main() {
  // Test 1: 标准 Chat Completions (gpt-4.1 + messages) → 应透传成功
  await post('Test 1: 标准 messages 透传 (gpt-4.1)', {
    model: 'gpt-4.1', messages: [{ role: 'user', content: 'say ok' }]
  });

  // Test 2: Responses API 格式 (input 而非 messages) → 应自动转换
  await post('Test 2: Responses API input→messages 转换 (gpt-4.1)', {
    model: 'gpt-4.1', input: [{ role: 'user', content: 'say ok' }]
  });

  // Test 3: max_tokens + gpt-5.4 → 应自动替换为 max_completion_tokens
  await post('Test 3: max_tokens→max_completion_tokens (gpt-5.4)', {
    model: 'gpt-5.4', messages: [{ role: 'user', content: 'say ok' }], max_tokens: 50
  });

  // Test 4: Responses API 格式 + gpt-5.4 → 两个修复同时生效
  await post('Test 4: Responses API + max_tokens 双修复 (gpt-5.4)', {
    model: 'gpt-5.4', input: 'say ok', max_output_tokens: 50
  });

  // Test 5: 非 GPT-5 模型带 max_tokens → 不应该被修改
  await post('Test 5: max_tokens 保留 (gpt-4.1, 非 GPT-5)', {
    model: 'gpt-4.1', messages: [{ role: 'user', content: 'say ok' }], max_tokens: 50
  });

  // Test 6: 非 chat/completions 请求 → 应完全透传
  console.log('\n=== Test 6: 非 chat/completions 请求透传 ===');
  const opts6 = {
    hostname: '127.0.0.1', port: 3002, path: '/api/status',
    method: 'GET',
  };
  await new Promise(resolve => {
    const req6 = http.request(opts6, res => {
      let out = '';
      res.on('data', c => out += c);
      res.on('end', () => { console.log(`Status: ${res.statusCode}`); console.log(`Body: ${out.substring(0, 200)}`); resolve(); });
    });
    req6.on('error', e => { console.log(`ERROR: ${e.message}`); resolve(); });
    req6.end();
  });
}

main().then(() => { console.log('\n=== All tests done ==='); process.exit(0); });
