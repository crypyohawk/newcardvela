#!/bin/bash
# ============================================================
# 服务器更新 + Copilot 号池测试（按顺序执行）
# ============================================================

# ==========================================
# 第一步：更新服务器（必须先做！）
# ==========================================
cd /opt/cardvela

# 1a. 更新 new-api 管理令牌（你重新生成了，旧的已失效）
sed -i 's|^NEW_API_ADMIN_TOKEN=.*|NEW_API_ADMIN_TOKEN=n5VL1gVWWWvfRt3sp8yxvIleKroi|' .env
grep NEW_API_ADMIN_TOKEN .env

# 1b. 拉代码 & 构建（包含 group 分组修复）
git pull origin main
npm run build

# 1c. 重新加载环境变量并重启
set -a; source .env; set +a
pm2 restart cardvela
pm2 save

# 1d. 验证
pm2 env 0 | grep NEW_API_ADMIN_TOKEN

# ==========================================
# 第二步：去 new-api 后台清理 + 添加分组
# ==========================================
# 浏览器打开 https://api.cardvela.com
#
# 2a. 令牌管理 → 删掉刚才那个 401 的无效令牌
#
# 2b. 设置 → 运营设置 → 分组倍率改为：
#      {"default":1,"vip":1,"svip":1,"poloapi":1,"cardvela-caca":1,"claude-官":1,"claude aws 官":1,"Claude-code":1,"cur-claude":1,"copilot":1}
#      用户可选分组加上：copilot

# ==========================================
# 第三步：检查 Copilot 账号（刚才查出来是 0）
# ==========================================
cd /opt/cardvela

# 3a. 查所有 Copilot 账号（不限状态）
node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.copilotAccount.findMany()
    .then(accs => {
      console.log('总账号数:', accs.length);
      accs.forEach(a => console.log('  -', a.githubId, '| status:', a.status, '| port:', a.port, '| channelId:', a.newApiChannelId));
      if (accs.length === 0) console.log('  ⚠️ 数据库里没有任何 Copilot 账号，需要在管理后台添加');
      p.\$disconnect();
    });
"

# 3b. 如果上面显示 0 个账号，需要去 cardvela.com 管理后台 → Copilot号池 → 添加账号
#     填入 GitHub 账号ID 和 ghu_ 开头的 token

# ==========================================
# 第四步：在服务器上认证 copilot-api（一次性）
# ==========================================
cd /opt/cardvela

# 4a. 认证（只需做一次，token 会存到 ~/.local/share/copilot-api/github_token）
npx copilot-api auth
#     终端显示 code → 浏览器打开 https://github.com/login/device → 输入 code → 授权
#     看到 "Logged in as xxx" 和 "GitHub token written to ..." 就成功了
#     以后启动不需要再认证，除非 token 过期

# 4b. 前台启动测试
npx copilot-api start --port 4141
#     看到 "Available models: ..." 和端口监听就成功
#     Ctrl+C 停止

# 4c. 另一个终端窗口测试模型列表
curl -s http://127.0.0.1:4141/v1/models | python3 -c "
import json,sys
data = json.load(sys.stdin)
models = [m['id'] for m in data.get('data',[])]
print('可用模型数:', len(models))
for m in sorted(models):
    print(' ', m)
"

# 4d. 测试 chat 请求
curl -s http://127.0.0.1:4141/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role":"user","content":"say hi"}],
    "max_tokens": 10
  }' | python3 -m json.tool

# 4e. 测试成功后，Ctrl+C 停止，然后后台启动
nohup npx copilot-api start --port 4141 > /home/ubuntu/copilot-pool/logs/2937170996@qq.com.log 2>&1 &
echo $! > /home/ubuntu/copilot-pool/pids/2937170996@qq.com.pid
sleep 3
ss -lntp | grep 4141

# ==========================================
# 第五步：更新渠道模型列表 & 绑定
# ==========================================
# 代码已更新 COPILOT_MODELS（基于实际返回的模型列表）
# 需要在 cardvela.com 管理后台 → Copilot号池 → 同步所有渠道
# 这会把新的模型列表写入 new-api 渠道 #2
#
# 或者直接去 api.cardvela.com → 渠道管理 → 编辑渠道 #2
# 手动把模型改为：
# claude-sonnet-4,claude-sonnet-4.5,claude-sonnet-4.6,claude-opus-4.5,claude-opus-4.6,claude-opus-4.6-fast,claude-haiku-4.5,gpt-4o,gpt-4o-mini,gpt-4,gpt-4.1,gpt-5.1,gpt-5.2,gpt-5.4,gpt-5.4-mini,gpt-5-mini,gemini-2.5-pro,gemini-3-flash-preview,gemini-3.1-pro-preview,grok-code-fast-1

# ==========================================
# 第六步：回到主站重新创建用户 Key 测试
# ==========================================
# cardvela.com → AI服务 → 创建 Key → 选择 copilot 套餐 → 测试调用
