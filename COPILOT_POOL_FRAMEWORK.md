# Copilot账号池 + 智能负载均衡 完整框架设计

## 概述
本方案旨在通过账号池实现每月200-500美元支撑10-30人重度Claude Opus使用。核心是新建独立网关（号池），将Copilot API转化为标准API形式，链接到现有new-api系统，实现透明负载均衡。

**目标**：每月1600-2400次Opus调用，成本低至200美元/月，支持企业级使用。

## 整体架构
```
[客户端工具] → [独立网关 (8080端口)] → [Copilot API实例池] → [格式转换] → [new-api网关] → [cardvela用户端]
↑
[管理后台] → [Prisma DB (账号池)]
```
- **独立网关**：新建`copilot-gateway/`目录，Node.js微服务，监听8080端口，提供隔离链接`http://yourdomain.com:8080/v1/chat/completions`。
- **账号池**：通过管理后台管理，网关动态拉取。
- **转化逻辑**：Copilot原生响应 → OpenAI兼容格式 → new-api处理 → 用户。

## 核心模块
1. **数据库扩展**：Prisma `CopilotAccount`表。
2. **管理后台**：`app/admin/copilot-accounts/page.tsx`，CRUD账号。
3. **自动化脚本**：`scripts/copilot-account-setup.py`，批量注册绑卡。
4. **Copilot实例池**：Docker Compose启动多个容器。
5. **独立网关**：`copilot-gateway/`，核心转化逻辑。
6. **链接new-api**：网关POST转换后数据到new-api。

## 执行步骤（分阶段）
### 阶段1：基础搭建（1-2天）
1. 编辑`prisma/schema.prisma`，添加CopilotAccount模型。
2. 运行`npx prisma db push`。
3. 创建`app/admin/copilot-accounts/page.tsx`和API路由。
4. 测试：手动添加账号，验证列表。

### 阶段2：自动化脚本（2-3天）
1. 创建`scripts/copilot-account-setup.py`。
2. 安装依赖：`pip install playwright requests`。
3. 测试：创建1个账号，验证DB写入。

### 阶段3：实例池部署（1天）
1. 创建`docker-compose.copilot.yml`。
2. 写`scripts/start-copilot-pool.sh`。
3. 运行`bash scripts/start-copilot-pool.sh`。

### 阶段4：网关实现（2-3天）
1. 创建`copilot-gateway/`目录。
2. 实现转化逻辑（见下文）。
3. 部署：`docker-compose up -d`。
4. 测试：Postman调用隔离链接。

### 阶段5：集成测试（1周）
1. 全池测试，验证负载均衡。
2. 监控额度，报警。

## 详细逻辑：号池转化API + 链接new-api
这是核心部分，你没有经验的部分。号池（账号列表）通过网关转化为API形式：网关作为代理，将客户端请求转发到最佳Copilot实例，获取响应，转换格式，然后链接到new-api进行后续处理。

### 1. 号池管理
- **数据源**：账号存储在cardvela DB，通过API `/api/admin/copilot-accounts`拉取。
- **选择逻辑**：网关启动时缓存账号列表，每分钟刷新。选择标准：剩余额度 > 20%，无rate-limit，最近使用时间最旧。

### 2. API转化过程
- **输入**：客户端POST `/v1/chat/completions` (OpenAI格式)。
- **步骤**：
  1. **账号选择**：从池子选最佳账号。
  2. **转发到Copilot**：将请求body转发到`http://copilot-{id}:4141/v1/chat/completions`。Copilot返回Anthropic格式响应，如：
     ```json
     {
       "content": "Hello world",
       "usage": {"input_tokens": 10, "output_tokens": 20}
     }
     ```
  3. **格式转换**：转为OpenAI兼容格式（new-api期望）：
     ```json
     {
       "choices": [{"message": {"content": "Hello world"}}],
       "usage": {"prompt_tokens": 10, "completion_tokens": 20}
     }
     ```
  4. **链接new-api**：POST转换后数据到`http://localhost:3000/api/user/ai-service`，让new-api处理扣费/日志/用户验证。
  5. **返回**：new-api响应返回客户端。
- **代码示例**（网关`src/index.js`）：
  ```javascript
  app.post('/v1/chat/completions', async (req, res) => {
    const accounts = await axios.get('http://localhost:3000/api/admin/copilot-accounts'); // 拉账号
    const best = selectBest(accounts.data); // 选择逻辑
    const copilotRes = await axios.post(`http://copilot-${best.id}:4141/v1/chat/completions`, req.body);
    const converted = convertFormat(copilotRes.data); // 转换
    const newApiRes = await axios.post('http://localhost:3000/api/user/ai-service', converted); // 链接new-api
    res.json(newApiRes.data);
  });
  ```

### 3. 链接new-api细节
- **为什么链接**：复用new-api的扣费、日志、用户管理，避免重复开发。
- **数据传递**：转换后JSON直接POST，确保new-api能解析（假设支持OpenAI格式）。
- **同步**：网关不直接扣费，只传递数据；new-api处理后，网关可选通过API更新池子额度。
- **隔离**：网关和new-api在同一服务器，但独立进程，避免耦合。

## 风险控制
- **风控**：注册间隔3秒，代理池。
- **监控**：日志记录失败，额度报警。
- **备份**：20%冷备账号。

## 成本估算
- 开发：人力1-2周。
- 运营：200美元/月，支持1600次调用。

## 下一步
按阶段执行，从基础搭建开始。需要代码实现时，告诉我具体模块。

---

## 服务器部署指南（2026-03-30）

### 服务器架构总览

```
用户浏览器 → nginx (80/443) → CardVela Next.js (PM2, port 3000) → PostgreSQL (Docker, port 5432)
                                       ↓
用户 sk-xxx → new-api (Docker, port 3001) ← cron 每5分钟拉日志扣费
                  ↑
      ┌───────────┼───────────┐
 copilot-api    copilot-api    copilot-api
 (port 4141)   (port 4142)   (port 4143)     ← 每个注册为 new-api 渠道
```

- **项目路径**: `/home/ubuntu/cardvela`
- **进程管理**: PM2（不是 Docker Compose）
- **Git 仓库**: `https://github.com/crypyohawk/newcardvela.git`
- **new-api**: Docker 容器，端口 3001，域名 `api.cardvela.com`

---

### 部署一：CardVela 主站更新

> 先部署主站，确认正常后再部署号池。

#### 1.1 拉代码 & 构建

```bash
ssh ubuntu@<服务器IP>

cd ~/cardvela

# 停止服务（避免 prisma 文件锁）
pm2 stop all

# 拉最新代码
git checkout -- package-lock.json
git pull origin main

# 安装依赖
npm install

# 推送数据库变更
# 新增字段: User.aiBalance, AIServiceTier.maxKeys/requiredRole/minAiBalance/models, AIKey.label
# 删除字段: AIServiceTier.maxKeysPerUser (已废弃)
# 全部有默认值，不影响现有数据
npx prisma db push

# 构建
npm run build

# 启动
pm2 restart all

# 验证启动无报错
pm2 logs cardvela --lines 30 --nostream
```

#### 1.2 查 new-api 数据库类型

创建 Key 时需要从 new-api 数据库读取完整密钥（new-api API 只返回 masked key）。

```bash
# 查 new-api 容器用什么数据库
docker exec $(docker ps --filter "publish=3001" -q) env | grep -i sql

# 或者
docker inspect $(docker ps --filter "publish=3001" -q) --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -i sql
```

根据输出判断：
- 如果有 `SQL_DSN=mysql://...` → MySQL
- 如果有 `SQL_DSN=postgres://...` → PostgreSQL
- 如果没有 SQL_DSN 或值为空 → SQLite（Docker 默认）

#### 1.3 配置环境变量

```bash
nano ~/cardvela/.env.production
```

确保有以下变量（根据 1.2 的结果填写）：

```env
# ===== 已有变量（确认存在即可）=====
DATABASE_URL=postgresql://cardvela:CardVela2024Secure@localhost:5432/cardvela
JWT_SECRET=<已有的>
NEW_API_BASE_URL=http://127.0.0.1:3001
NEW_API_ADMIN_COOKIE=session=<你现有的cookie>
NEW_API_ADMIN_USER=1

# ===== 新增变量 =====

# Cron 同步鉴权密钥（随机生成）
CRON_SECRET=<下面生成>

# new-api 数据库连接（根据 1.2 结果选一个填）
# MySQL:
NEW_API_DB_URL=mysql://root:password@127.0.0.1:3306/new-api
# PostgreSQL:
# NEW_API_DB_URL=postgresql://user:pass@127.0.0.1:5432/new-api
# SQLite（同机部署，直接读文件）:
# NEW_API_SQLITE_PATH=/home/ubuntu/new-api/data/one-api.db
```

生成 CRON_SECRET：

```bash
openssl rand -hex 16
# 输出类似: a1b2c3d4e5f67890abcdef1234567890
# 把它填进 .env.production 的 CRON_SECRET=
```

配好后重启生效：

```bash
pm2 restart all
```

#### 1.4 设置 Cron 定时同步

```bash
crontab -e
```

添加这行（每 5 分钟同步 new-api 用量日志并扣费）：

```
*/5 * * * * curl -s "http://localhost:3000/api/cron/sync-usage?secret=你的CRON_SECRET" >> /home/ubuntu/cardvela/logs/cron-sync.log 2>&1
```

创建日志目录：

```bash
mkdir -p ~/cardvela/logs
```

手动测试一次：

```bash
curl -s "http://localhost:3000/api/cron/sync-usage?secret=你的CRON_SECRET" | python3 -m json.tool
```

预期返回：
```json
{ "message": "无新日志", "synced": 0 }
```
或有实际同步数据的 JSON。

#### 1.5 验证主站部署

```bash
# 1. 网站可访问
curl -sI https://cardvela.com | head -3

# 2. API 正常
curl -s https://cardvela.com/api/config | python3 -m json.tool

# 3. 数据库字段确认
cd ~/cardvela
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findFirst({ select: { aiBalance: true, balance: true } })
  .then(u => { console.log('aiBalance 字段 OK:', u); p.\$disconnect(); })
  .catch(e => { console.error('错误:', e.message); p.\$disconnect(); });
"

# 4. Key 创建测试（在网页 dashboard 操作，或用 curl）
# 如果报 "无法从数据库读取完整 key" → 检查 NEW_API_DB_URL 配置

# 5. PM2 无报错
pm2 logs cardvela --lines 20 --nostream
```

**主站部署完成标志**：网站正常访问，dashboard 显示 "账户 $xx | AI $xx" 双余额，cron 返回正常 JSON。

---

### 部署二：Copilot 号池

> 在主站部署确认正常后进行。号池出问题不影响已有的 PoloAPI 代理服务。

#### 2.1 安装 copilot-api

```bash
# 全局安装
npm install -g copilot-api

# 验证
copilot-api --version
```

#### 2.2 在管理后台添加 Copilot 账号

1. 访问 `https://cardvela.com/admin/copilot-accounts`
2. 点"添加账号"，填入 GitHub ID 和 `ghu_` 开头的 token
3. 设置月度额度上限（美元）

或用命令行直接写数据库：

```bash
cd ~/cardvela
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.copilotAccount.create({
  data: {
    githubId: 'account-a',
    token: 'ghu_xxxxxxxxxxxx',
    quotaLimit: 50,
    port: 4141,
    status: 'active'
  }
}).then(a => { console.log('创建成功:', a.id); p.\$disconnect(); });
"
```

#### 2.3 启动 Copilot 实例

**方法 A：用管理脚本（推荐）**

```bash
cd ~/cardvela

# 启动所有活跃账号的实例
bash scripts/copilot-pool.sh start

# 查看状态
bash scripts/copilot-pool.sh status

# 停止所有
bash scripts/copilot-pool.sh stop

# 重启所有
bash scripts/copilot-pool.sh restart
```

**方法 B：手动启动单个实例**

```bash
# 格式: bash scripts/copilot-pool.sh start <名称> <token> <端口>
bash scripts/copilot-pool.sh start account-a ghu_xxxxxxxxxxxx 4141
bash scripts/copilot-pool.sh start account-b ghu_yyyyyyyyyyyy 4142
bash scripts/copilot-pool.sh start account-c ghu_zzzzzzzzzzzz 4143
```

验证实例运行：

```bash
# 检查端口
curl -s http://127.0.0.1:4141/v1/models | python3 -m json.tool

# 查看日志
tail -20 /home/ubuntu/copilot-pool/logs/account-a.log
```

#### 2.4 在 new-api 注册渠道

每个 copilot-api 实例需要注册为 new-api 的一个渠道。

**在 new-api 管理面板操作**（`https://api.cardvela.com`）：

1. 进入"渠道管理" → "添加渠道"
2. 每个实例添加一个：

| 字段 | 值 |
|------|------|
| 名称 | copilot-a（随意） |
| 类型 | OpenAI |
| Base URL | `http://127.0.0.1:4141` |
| 密钥 | `sk-placeholder`（copilot-api 不验证） |
| 模型 | `claude-sonnet-4-20250514,claude-opus-4-20250514`（按实际填） |
| 分组 | `copilot`（必须和 AIServiceTier 的 channelGroup 一致） |

3. 重复添加 4142、4143 等

4. 添加完成后，点"测试"确认各渠道可用

#### 2.5 回填渠道 ID

在 new-api 面板中记下每个渠道的 ID，然后更新 CardVela 数据库：

```bash
cd ~/cardvela
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  // 先看当前账号列表
  const accs = await p.copilotAccount.findMany();
  accs.forEach(a => console.log(a.id, a.githubId, 'port=' + a.port, 'channelId=' + a.newApiChannelId));

  // 更新渠道 ID（替换为你实际的值）
  // await p.copilotAccount.update({ where: { id: 'cuid_xxx' }, data: { newApiChannelId: 15, port: 4141 } });
  // await p.copilotAccount.update({ where: { id: 'cuid_yyy' }, data: { newApiChannelId: 16, port: 4142 } });
  // await p.copilotAccount.update({ where: { id: 'cuid_zzz' }, data: { newApiChannelId: 17, port: 4143 } });

  await p.\$disconnect();
}
main();
"
```

> 回填 `newApiChannelId` 后，cron 同步会自动追踪每个 Copilot 账号的用量。

#### 2.6 创建 Copilot 套餐

在管理后台 `/admin` → AI 服务管理 → 添加套餐：

| 字段 | 值 |
|------|------|
| 名称 | copilot-claude |
| 显示名 | Copilot Claude（号池） |
| 渠道分组 | `copilot`（和 2.4 中注册的分组一致） |
| 输入价格 | 按你的定价 |
| 输出价格 | 按你的定价 |
| 总 Key 上限 | 根据号池承载能力设置（0=不限） |
| 最低AI余额 | 建议 $5+ |

#### 2.7 验证完整链路

```bash
# 1. Copilot 实例运行
bash ~/cardvela/scripts/copilot-pool.sh status

# 2. new-api 渠道通
# 在 new-api 面板点各渠道的"测试"按钮

# 3. 在 dashboard 创建 copilot 套餐的 Key
# 然后用这个 Key 调用：
curl -X POST https://api.cardvela.com/v1/chat/completions \
  -H "Authorization: Bearer sk-你的key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "messages": [{"role": "user", "content": "hello"}],
    "max_tokens": 50
  }'

# 4. 等 5 分钟后检查 cron 是否同步了用量
curl -s "http://localhost:3000/api/cron/sync-usage?secret=你的CRON_SECRET" | python3 -m json.tool

# 5. 检查 dashboard 是否显示 AI 余额扣费
```

#### 2.8 设置开机自启

```bash
# copilot-pool 开机自启
crontab -e
# 添加：
@reboot cd /home/ubuntu/cardvela && bash scripts/copilot-pool.sh start >> /home/ubuntu/copilot-pool/logs/startup.log 2>&1
```

---

### 数据库变更清单

本次 `prisma db push` 的字段变更：

| 表 | 操作 | 字段 | 默认值 | 说明 |
|---|---|---|---|---|
| User | 新增 | `aiBalance Float` | 0 | AI 专用余额，与主余额隔离 |
| AIServiceTier | 新增 | `maxKeys Int` | 0 | 套餐总可开 Key 数（0=不限） |
| AIServiceTier | 新增 | `requiredRole String?` | null | 开 Key 所需角色 |
| AIServiceTier | 新增 | `minAiBalance Float` | 0 | 开 Key 最低 AI 余额 |
| AIServiceTier | 新增 | `models String?` | null | 可用模型及倍率 JSON |
| AIServiceTier | 删除 | `maxKeysPerUser` | - | 已废弃，改用 maxKeys |
| AIKey | 新增 | `label String?` | null | 企业标签 |

### 环境变量清单

| 变量 | 必需 | 说明 |
|---|---|---|
| `CRON_SECRET` | **是** | Cron 同步鉴权，随机字符串 |
| `NEW_API_BASE_URL` | 是 | `http://127.0.0.1:3001`（同机） |
| `NEW_API_ADMIN_COOKIE` | 是 | new-api 管理员 session cookie |
| `NEW_API_ADMIN_USER` | 是 | `1`（管理员 user ID） |
| `NEW_API_DB_URL` | **条件** | new-api 用 MySQL/PG 时必填 |
| `NEW_API_SQLITE_PATH` | 条件 | new-api 用 SQLite 时填 |

### 常见问题

**Q: Key 创建报 "无法从数据库读取完整 key"**
A: `NEW_API_DB_URL` 或 `NEW_API_SQLITE_PATH` 未配置或配置错误。

**Q: Cron 同步返回 401**
A: `CRON_SECRET` 和 crontab 中的 secret 不一致。

**Q: Copilot 实例启动后 new-api 渠道测试失败**
A: 检查 `curl http://127.0.0.1:4141/v1/models`，确认实例在运行。检查 token 是否过期。

**Q: 用量扣费没生效**
A: 检查 crontab 是否设置。手动执行一次 cron URL 看返回值。检查 `pm2 logs` 有无报错。