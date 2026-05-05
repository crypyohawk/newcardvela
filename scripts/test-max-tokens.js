// 专门测试 max_completion_tokens vs max_tokens
const http = require('http');
const TOKEN = process.env.TEST_API_TOKEN;

if (!TOKEN) {
  console.error('Missing TEST_API_TOKEN');
  process.exit(1);
}

function post(desc, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: '127.0.0.1', port: 3001, // 直连 new-api
      path: '/v1/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}`, 'Content-Length': Buffer.byteLength(data) },
    };
    const req = http.request(opts, (res) => {
      let out = '';
      res.on('data', c => out += c);
      res.on('end', () => {
        console.log(`\n=== ${desc} ===`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body: ${out.substring(0, 400)}`);
        resolve();
      });
    });
    req.on('error', e => { console.log(`ERROR: ${e.message}`); resolve(); });
    req.end(data);
  });
}

async function main() {
  // A: gpt-5.4 + 无 max_tokens → 应该成功
  await post('A: gpt-5.4 无 max 参数', {
    model: 'gpt-5.4', messages: [{ role: 'user', content: 'say ok' }]
  });

  // B: gpt-5.4 + max_completion_tokens → 看 new-api 是否支持
  await post('B: gpt-5.4 + max_completion_tokens', {
    model: 'gpt-5.4', messages: [{ role: 'user', content: 'say ok' }], max_completion_tokens: 50
  });

  // C: gpt-5.4 + max_tokens → 确认报错
  await post('C: gpt-5.4 + max_tokens (应该报错)', {
    model: 'gpt-5.4', messages: [{ role: 'user', content: 'say ok' }], max_tokens: 50
  });
}

main().then(() => process.exit(0));
