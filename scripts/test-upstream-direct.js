const http = require('http');
const TOKEN = 'sk-copilot';

function post(desc, port, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: '172.17.0.1', port, path: '/v1/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}`, 'Content-Length': Buffer.byteLength(data) },
    };
    const req = http.request(opts, (res) => {
      let out = '';
      res.on('data', c => out += c);
      res.on('end', () => { console.log(`\n=== ${desc} === Status: ${res.statusCode}`); console.log(out.substring(0, 400)); resolve(); });
    });
    req.on('error', e => { console.log(`\n=== ${desc} === ERROR: ${e.message}`); resolve(); });
    req.setTimeout(15000, () => { req.destroy(); console.log(`\n=== ${desc} === TIMEOUT`); resolve(); });
    req.end(data);
  });
}

async function main() {
  const port = 4142; // copilot channel 3

  // A: gpt-5.4 无 max_tokens → 直连上游
  await post('直连: gpt-5.4 无 max_tokens', port, {
    model: 'gpt-5.4', messages: [{ role: 'user', content: 'say ok' }]
  });

  // B: gpt-5.4 + max_tokens → 直连上游
  await post('直连: gpt-5.4 + max_tokens=50', port, {
    model: 'gpt-5.4', messages: [{ role: 'user', content: 'say ok' }], max_tokens: 50
  });

  // C: gpt-5.4 + max_completion_tokens → 直连上游
  await post('直连: gpt-5.4 + max_completion_tokens=50', port, {
    model: 'gpt-5.4', messages: [{ role: 'user', content: 'say ok' }], max_completion_tokens: 50
  });

  // D: gpt-5.2 无 max_tokens → 直连上游
  await post('直连: gpt-5.2 无 max_tokens', port, {
    model: 'gpt-5.2', messages: [{ role: 'user', content: 'say ok' }]
  });

  // E: gpt-5.2 + max_tokens → 直连上游
  await post('直连: gpt-5.2 + max_tokens=50', port, {
    model: 'gpt-5.2', messages: [{ role: 'user', content: 'say ok' }], max_tokens: 50
  });
}

main().then(() => process.exit(0));
