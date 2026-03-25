# CardVela Claude 聚合平台 — 完整开发方案

> 版本：v1.0 | 日期：2026-03-25  
> 状态：**待确认** — 确认后逐步执行

---

## 一、产品定位

**CardVela Claude Enterprise Hub**  
"虚拟卡支付 + 多渠道 Claude API 聚合 + 白标子 Key，一站式解决稳定、价格、合规所有痛点。"

用户在同一个 Dashboard 里：充值账户 → 选服务方案 → 一键生成 API Key → 在 Cline / Cursor / Claude Code 中直接使用。

---

## 二、服务分级（先上线 2 个 Tier）

| Tier | 名称 | 核心渠道 | 定位 | 价格倍率 |
|------|------|---------|------|---------|
| **Economy** | 经济版 | PoloAPI 低倍率池 | 个人/测试/性价比 | 约 1.3x 成本 |
| **Stable** | 稳定版 | PoloAPI 企业池 + CloseAI | 企业生产/SLA保障 | 约 1.5x 成本 |
| *Official* | *官方版* | *AWS Bedrock* | *后期开放* | *待定* |
| *Custom* | *实验版* | *混合池* | *后期开放，标红风险* | *待定* |

**首期只做 Economy + Stable，后续渐进扩展。**

---

## 三、用户类型

### 3.1 个人用户（现有 role="user"）
- 自助选 Tier、生成 Key、按量扣费
- 查看自己的用量和余额

### 3.2 企业用户（新增 role="enterprise"）
- 创建子账户，分配额度上限
- 查看所有子账户用量汇总
- 统一充值，从企业余额分配到子账户
- 可设置每个子账户的月用量上限

### 3.3 管理员（现有 role="admin"）
- 管理所有渠道配置、定价
- 查看全局用量、收入统计
- 审核企业账户

---

## 四、技术架构

```
用户 (Cline / Cursor / Claude Code)
  │
  │  请求: https://api.cardvela.com/v1/messages
  │  Header: x-api-key: sk-cardvela-xxxx
  │
  ▼
┌─────────────────────────────┐
│  new-api Gateway (Docker)   │  ← 端口 3001
│  ├─ 渠道管理 (PoloAPI等)      │
│  ├─ 负载均衡 / 故障切换       │
│  ├─ Token 计量               │
│  └─ 子 Key 分发              │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  上游渠道                     │
│  ├─ PoloAPI (经济/稳定)      │
│  ├─ CloseAI (稳定)          │
│  └─ AWS Bedrock (官方,后期)  │
└─────────────────────────────┘

CardVela Next.js (PM2, 端口 3000)
  ├─ 用户注册/登录/充值（已有）
  ├─ 虚拟卡管理（已有）
  └─ Claude 服务模块（新增）
       ├─ 选 Tier → 生成 Key
       ├─ 用量查询 → 图表展示
       ├─ 企业子账户管理
       └─ 余额扣费 → 用量同步

两者通过 new-api 的管理 API 通信
CardVela 调 new-api API 创建用户/Key/查用量
```

### Nginx 配置（服务器）
```nginx
# 现有 - CardVela 前端
server {
    server_name cardvela.com;
    location / { proxy_pass http://127.0.0.1:3000; }
}

# 新增 - API Gateway
server {
    server_name api.cardvela.com;
    location / { proxy_pass http://127.0.0.1:3001; }
}
```

---

## 五、数据库设计（新增表）

以下表全部添加到现有 `prisma/schema.prisma` 中：

```prisma
// ============================================================
// Claude 聚合服务相关模型
// ============================================================

// AI 服务套餐/Tier
model AIServiceTier {
  id              String   @id @default(cuid())
  name            String   @unique              // "economy" | "stable" | "official" | "custom"
  displayName     String                        // "经济版" | "稳定版"
  description     String?  @db.Text             // 套餐描述
  pricePerMillionInput    Float                 // 每百万 input token 价格 (USD)
  pricePerMillionOutput   Float                 // 每百万 output token 价格 (USD)
  features        String?  @db.Text             // JSON: 特性列表
  isActive        Boolean  @default(true)
  sortOrder       Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  aiKeys          AIKey[]
}

// 用户的 API Key
model AIKey {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tierId          String
  tier            AIServiceTier @relation(fields: [tierId], references: [id])
  
  keyName         String                        // 用户给 Key 起的名称
  apiKey          String   @unique              // sk-cardvela-xxxx（展示给用户）
  newApiKeyId     String?                       // new-api 侧的 token ID（用于管理）
  newApiChannelId String?                       // new-api 侧的渠道 ID
  
  status          String   @default("active")   // active | disabled | expired
  monthlyLimit    Float?                        // 每月用量上限 (USD)，null=不限
  totalUsed       Float    @default(0)          // 累计消费 (USD)
  monthUsed       Float    @default(0)          // 本月消费 (USD)
  lastUsedAt      DateTime?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  usageLogs       AIUsageLog[]

  @@index([userId])
  @@index([apiKey])
  @@index([status])
}

// API 调用日志
model AIUsageLog {
  id              String   @id @default(cuid())
  userId          String
  aiKeyId         String
  aiKey           AIKey    @relation(fields: [aiKeyId], references: [id], onDelete: Cascade)
  
  model           String                        // "claude-sonnet-4-20250514" 等
  inputTokens     Int                           // 输入 token 数
  outputTokens    Int                           // 输出 token 数
  cost            Float                         // 本次费用 (USD)
  channel         String?                       // 实际走的渠道
  
  createdAt       DateTime @default(now())

  @@index([userId, createdAt])
  @@index([aiKeyId, createdAt])
}

// 企业子账户关系
model EnterpriseSubAccount {
  id              String   @id @default(cuid())
  enterpriseId    String                        // 企业主账户 userId
  enterprise      User     @relation("EnterpriseOwner", fields: [enterpriseId], references: [id])
  subUserId       String                        // 子账户 userId
  subUser         User     @relation("SubAccount", fields: [subUserId], references: [id])
  
  monthlyBudget   Float?                        // 月预算上限 (USD)
  isActive        Boolean  @default(true)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([enterpriseId, subUserId])
  @@index([enterpriseId])
  @@index([subUserId])
}
```

### User 模型需新增的关联字段：
```prisma
model User {
  // ... 现有字段 ...
  
  // 新增：AI 服务关联
  aiKeys              AIKey[]
  enterpriseOwned     EnterpriseSubAccount[] @relation("EnterpriseOwner")
  subAccountOf        EnterpriseSubAccount[] @relation("SubAccount")
}
```

---

## 六、新增 API 路由

### 6.1 用户端 API

| 方法 | 路由 | 功能 |
|------|------|------|
| GET | `/api/user/ai-service/tiers` | 获取可用套餐列表 |
| POST | `/api/user/ai-service/keys` | 创建新 Key（选 Tier） |
| GET | `/api/user/ai-service/keys` | 获取我的所有 Key |
| PUT | `/api/user/ai-service/keys/[id]` | 编辑 Key（改名/设上限/禁用） |
| DELETE | `/api/user/ai-service/keys/[id]` | 删除 Key |
| GET | `/api/user/ai-service/usage` | 查询用量（按天/月/Key 细分） |
| GET | `/api/user/ai-service/usage/summary` | 用量汇总（本月消费/余额等） |

### 6.2 企业端 API

| 方法 | 路由 | 功能 |
|------|------|------|
| POST | `/api/user/enterprise/sub-accounts` | 创建子账户 |
| GET | `/api/user/enterprise/sub-accounts` | 获取子账户列表 |
| PUT | `/api/user/enterprise/sub-accounts/[id]` | 编辑子账户（预算/状态） |
| GET | `/api/user/enterprise/usage` | 查看所有子账户用量汇总 |

### 6.3 管理员 API

| 方法 | 路由 | 功能 |
|------|------|------|
| GET/POST | `/api/admin/ai-tiers` | 管理套餐 |
| GET/PUT | `/api/admin/ai-tiers/[id]` | 编辑套餐 |
| GET | `/api/admin/ai-usage` | 全局用量统计 |
| GET | `/api/admin/ai-keys` | 查看所有用户 Key |
| POST | `/api/admin/ai-channels` | 管理上游渠道配置 |

### 6.4 内部 API（new-api 回调）

| 方法 | 路由 | 功能 |
|------|------|------|
| POST | `/api/webhook/new-api` | 接收 new-api 用量回调，扣减用户余额 |

---

## 七、前端页面设计

### 7.1 Dashboard 新增 Tab："Claude 服务"

在现有 dashboard 的 5 个入口卡片（我的卡片、开通新卡、充值、提现、推荐奖励）旁边新增：

```
┌──────────┐
│  🤖       │
│ Claude    │
│ AI 服务   │
└──────────┘
```

点击后进入 AI 服务子页面：

### 7.2 AI 服务页面结构

```
┌─────────────────────────────────────────────────────┐
│  Claude AI 服务                                       │
│                                                       │
│  ┌─── 概览卡片 ───────────────────────────────────┐  │
│  │ 本月消费: $12.50  │  剩余额度: $87.50  │ Key: 2 │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─── 我的 Key ──────────────────────────────────┐  │
│  │ 名称       Tier    Key               用量  状态 │  │
│  │ 开发测试   经济版  sk-cv-abc...def   $5.2  活跃 │  │
│  │ 生产环境   稳定版  sk-cv-xyz...123   $7.3  活跃 │  │
│  │                                                  │  │
│  │ [+ 创建新 Key]                                   │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─── 用量图表（最近30天） ──────────────────────┐  │
│  │  📊 柱状图：每日消费                           │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─── 快速配置 ──────────────────────────────────┐  │
│  │  Cline 配置:                                    │  │
│  │  ┌─────────────────────────────────────────┐    │  │
│  │  │ ANTHROPIC_BASE_URL=https://api.cardvela… │    │  │
│  │  │ ANTHROPIC_API_KEY=sk-cv-abc...def        │    │  │
│  │  └─────────────────────────────────────────┘    │  │
│  │  [复制] [Cursor 配置] [Claude Code 配置]         │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 7.3 创建 Key 弹窗

```
┌─── 创建 API Key ──────────────────────┐
│                                         │
│  Key 名称: [________________]           │
│                                         │
│  选择套餐:                               │
│  ┌─────────────┐  ┌─────────────┐      │
│  │ ⚡ 经济版     │  │ 🛡️ 稳定版    │      │
│  │ $3/百万input │  │ $8/百万input │      │
│  │ $15/百万out  │  │ $24/百万out  │      │
│  │ 适合个人测试  │  │ 企业生产推荐  │      │
│  │ [已选择] ✓   │  │ [选择]       │      │
│  └─────────────┘  └─────────────┘      │
│                                         │
│  月用量上限: [____] USD (留空=不限)       │
│                                         │
│  [取消]              [创建 Key]          │
└─────────────────────────────────────────┘
```

### 7.4 企业管理页面（企业用户专属）

```
┌─── 企业管理 ──────────────────────────────────┐
│                                                 │
│  企业总消费: $156.80  │  子账户数: 5            │
│                                                 │
│  ┌─── 子账户列表 ────────────────────────────┐ │
│  │ 用户名    邮箱          本月用量  预算   状态│ │
│  │ 张三     zhang@co.com   $23.5   $50   正常 │ │
│  │ 李四     li@co.com      $45.2   $100  正常 │ │
│  │ 王五     wang@co.com    $12.0   $30   正常 │ │
│  │                                            │ │
│  │ [+ 添加子账户]                              │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## 八、核心业务流程

### 8.1 用户创建 Key 流程
```
1. 用户点击"创建新 Key"
2. 选择 Tier + 填写名称
3. 前端 POST /api/user/ai-service/keys
4. 后端：
   a. 检查用户余额 ≥ 0
   b. 生成 sk-cardvela-xxxx 格式的 Key
   c. 调 new-api 管理 API 创建对应的 token
   d. 存入 AIKey 表
   e. 返回 Key 信息
5. 前端展示 Key + 配置教程
```

### 8.2 API 调用计费流程
```
1. 用户用 Key 请求 api.cardvela.com
2. new-api 验证 Key → 转发到上游渠道 → 返回结果
3. new-api 记录 token 用量
4. CardVela 定时任务（每 5 分钟）：
   a. 调 new-api API 拉取最新用量
   b. 计算费用 = tokens × 对应 Tier 单价
   c. 扣减用户 balance
   d. 写入 AIUsageLog
   e. 如果余额不足，自动禁用 Key
```

### 8.3 余额不足处理
```
1. 用户余额 < $1 时：发邮件提醒
2. 用户余额 ≤ $0 时：自动禁用所有 Key
3. 用户充值后：自动恢复 Key
```

### 8.4 企业子账户流程
```
1. 企业管理员邀请子用户（输入邮箱）
2. 子用户注册后自动关联到企业
3. 子用户从自己的余额扣费，企业管理员可设置月预算
4. 超预算自动暂停子账户的 Key
```

---

## 九、管理后台新增功能

在现有 `/admin` 页面新增以下管理模块：

### 9.1 套餐管理
- 编辑 Tier 的名称、价格、描述、状态
- 开关 Tier 的可用性

### 9.2 全局用量统计
- 今日/本月总 token 用量
- 今日/本月总收入
- 按渠道分布的饼图
- 按 Tier 分布的柱状图

### 9.3 用户 Key 管理
- 查看所有用户的 Key 列表
- 可手动禁用/启用任意 Key
- 查看单个 Key 的调用日志

---

## 十、环境变量（新增）

```env
# new-api Gateway
NEW_API_BASE_URL=http://127.0.0.1:3001      # new-api 地址
NEW_API_ADMIN_TOKEN=your-new-api-admin-token  # new-api 管理员 token

# API Key 前缀
AI_KEY_PREFIX=sk-cardvela                     # 生成的 Key 前缀

# 用量同步
USAGE_SYNC_INTERVAL=300000                    # 用量同步间隔 (ms)，默认 5 分钟
LOW_BALANCE_THRESHOLD=1                       # 低余额提醒阈值 (USD)
```

---

## 十一、开发步骤与顺序

### 第一阶段：数据库 + 后端基础（本地）
```
Step 1: Prisma schema 新增 4 张表 + User 关联
Step 2: npx prisma db push（本地数据库先跑通）
Step 3: 实现 AI 服务 API 路由（CRUD）
Step 4: 实现 new-api 集成模块（src/lib/newapi.ts）
Step 5: 实现用量同步定时任务
```

### 第二阶段：前端页面（本地）
```
Step 6: Dashboard 新增 "Claude 服务" tab
Step 7: Key 管理页面（创建/删除/查看）
Step 8: 用量图表（日/月维度）
Step 9: 配置教程组件（Cline/Cursor/Claude Code）
Step 10: 企业管理页面
```

### 第三阶段：管理后台（本地）
```
Step 11: 管理员 - 套餐管理
Step 12: 管理员 - 全局用量统计
Step 13: 管理员 - Key 管理
```

### 第四阶段：服务器部署
```
Step 14: 服务器安装 Docker + 部署 new-api
Step 15: 配置 api.cardvela.com 域名 + nginx
Step 16: 推送代码 + 数据库迁移
Step 17: 添加上游渠道（PoloAPI 等）
Step 18: 全流程测试
```

---

## 十二、风险控制

| 风险 | 对策 |
|------|------|
| 上游渠道宕机 | new-api 自动故障切换到备用渠道 |
| 用户余额不足仍在消费 | 预扣费模式 + 每 5 分钟同步 + 余额≤0自动禁Key |
| 破解版连坐风控 | 严格隔离到独立 IP + 实验池标红风险 |
| Key 泄露 | 支持一键重置 Key + 用量异常告警 |
| 并发量超过上游限制 | new-api 限流配置 + 渠道权重分配 |

---

## 十三、文件影响清单

### 需修改的文件：
- `prisma/schema.prisma` — 新增 4 个 model + User 关联
- `app/dashboard/page.tsx` — 新增 AI 服务 tab 入口
- `app/admin/page.tsx` — 新增管理模块

### 需新建的文件：
```
src/lib/newapi.ts                              — new-api 集成模块
app/api/user/ai-service/tiers/route.ts         — 套餐查询
app/api/user/ai-service/keys/route.ts          — Key CRUD
app/api/user/ai-service/keys/[id]/route.ts     — 单个 Key 操作
app/api/user/ai-service/usage/route.ts         — 用量查询
app/api/user/ai-service/usage/summary/route.ts — 用量汇总
app/api/user/enterprise/sub-accounts/route.ts  — 企业子账户
app/api/user/enterprise/usage/route.ts         — 企业用量汇总
app/api/admin/ai-tiers/route.ts                — 管理套餐
app/api/admin/ai-tiers/[id]/route.ts           — 编辑套餐
app/api/admin/ai-usage/route.ts                — 全局用量
app/api/admin/ai-keys/route.ts                 — Key 管理
app/api/webhook/new-api/route.ts               — 用量回调
```

---

## 确认事项

请确认以下内容后开始执行：

- [ ] **4 张表的设计**是否 OK？
- [ ] **Tier 定价**先用占位值，后续在管理后台调整？
- [ ] **计费方式**：从现有账户余额（balance 字段）直接扣？
- [ ] **企业账户**第一期就做，还是先做个人版？
- [ ] **先从 Step 1（数据库）开始执行？**
