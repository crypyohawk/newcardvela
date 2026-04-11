const http = require('http');

// 登录并获取 channel 配置
async function req(method, path, body, headers = {}) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: '127.0.0.1', port: 3001, path, method,
      headers: { ...headers, 'Content-Type': 'application/json' },
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request(opts, (res) => {
      let out = '';
      res.on('data', c => out += c);
      res.on('end', () => {
        const cookies = res.headers['set-cookie'] || [];
        resolve({ status: res.statusCode, body: out, cookies });
      });
    });
    r.on('error', e => resolve({ status: 0, body: e.message, cookies: [] }));
    if (data) r.end(data); else r.end();
  });
}

async function main() {
  // 登录
  console.log('=== 登录 ===');
  const login = await req('POST', '/api/user/login', {
    username: 'admin',
    password: 'JyLH32oVwyGqUPUgNx8oqsvgaVItBc2F'
  });
  console.log('Status:', login.status);
  console.log('Body:', login.body.substring(0, 300));
  console.log('Cookies:', login.cookies);

  // 提取 session cookie
  let sessionCookie = '';
  for (const c of login.cookies) {
    if (c.includes('session')) {
      sessionCookie = c.split(';')[0];
      break;
    }
  }

  // 如果登录成功，获取 access token
  let accessToken = '';
  try {
    const parsed = JSON.parse(login.body);
    if (parsed.data) accessToken = parsed.data;
  } catch {}

  const authHeader = accessToken
    ? { 'Authorization': `Bearer ${accessToken}` }
    : sessionCookie
      ? { 'Cookie': sessionCookie }
      : {};

  console.log('\n=== Auth header ===', JSON.stringify(authHeader));

  // 获取 channel 3 配置
  console.log('\n=== Channel 3 ===');
  const ch3 = await req('GET', '/api/channel/3', null, authHeader);
  console.log('Status:', ch3.status);
  console.log('Body:', ch3.body.substring(0, 800));

  // 获取所有 channel
  console.log('\n=== All Channels ===');
  const chs = await req('GET', '/api/channel/?p=0&page_size=20', null, authHeader);
  console.log('Status:', chs.status);
  // 解析并打印关键字段
  try {
    const parsed = JSON.parse(chs.body);
    if (parsed.data) {
      for (const ch of parsed.data) {
        console.log(`Channel ${ch.id}: type=${ch.type}, name=${ch.name}, base_url=${ch.base_url}, setting=${JSON.stringify(ch.setting || ch.other || '').substring(0,200)}`);
      }
    }
  } catch {
    console.log('Body:', chs.body.substring(0, 1000));
  }
}

main().then(() => process.exit(0));
