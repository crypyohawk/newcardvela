const http = require('http');
const TOKEN = 'sk-SHssuQvVynAvJ2tPxZG6Rgbm0OB7hgIqgszNanYapkUPxsBM';
function post(desc, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const opts = { hostname: '127.0.0.1', port: 3001, path: '/v1/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}`, 'Content-Length': Buffer.byteLength(data) },
    };
    const req = http.request(opts, (res) => {
      let out = '';
      res.on('data', c => out += c);
      res.on('end', () => { console.log(`\n=== ${desc} === Status: ${res.statusCode}`); console.log(out.substring(0, 300)); resolve(); });
    });
    req.on('error', e => { console.log(`ERROR: ${e.message}`); resolve(); });
    req.end(data);
  });
}
async function main() {
  await post('gpt-5-4 (横线)', { model: 'gpt-5-4', messages: [{ role: 'user', content: 'say ok' }] });
  await post('gpt-5.4 (点号)', { model: 'gpt-5.4', messages: [{ role: 'user', content: 'say ok' }] });
  await post('gpt-5-2 (横线)', { model: 'gpt-5-2', messages: [{ role: 'user', content: 'say ok' }] });
  await post('gpt-5.2 (点号)', { model: 'gpt-5.2', messages: [{ role: 'user', content: 'say ok' }] });
  await post('gpt-4.1 (点号)', { model: 'gpt-4.1', messages: [{ role: 'user', content: 'say ok' }] });
  await post('gpt-4-1 (横线)', { model: 'gpt-4-1', messages: [{ role: 'user', content: 'say ok' }] });
}
main().then(() => process.exit(0));
