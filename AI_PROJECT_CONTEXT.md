# CardVela 项目快速接手说明

本文件给新的 AI 会话快速建立上下文。目标不是覆盖全部细节，而是让接手者在几分钟内知道：这个项目是什么、核心链路在哪、生产环境怎么动、当前有哪些已知问题。

## 1. 项目是什么

CardVela 是一个以虚拟卡平台为主体、并逐步扩展 AI 服务能力的 Next.js 全栈项目。

当前至少包含两条主线业务：

1. 虚拟卡平台
- 用户注册/登录
- 用户查看卡类型、开卡、充值、提现
- 管理员配置卡类型、费率、公告、用户与订单
- 对接上游发卡/持卡人体系（gsalary）

2. AI 服务平台
- 提供 AI Key、AI 套餐、AI 用量统计、余额扣费
- 通过 new-api 做 API 网关和上游路由
- 通过 webhook / 定时同步回写用量与计费
- 同时维护 Copilot 号池与代理能力

项目正在向“AI 出海工作空间”方向扩展，但当前代码库仍以虚拟卡平台 + AI 服务聚合为核心。

## 2. 技术栈与运行方式

- 前端/后端：Next.js 14 App Router
- 语言：TypeScript
- UI：React 18 + Tailwind CSS
- 数据库：PostgreSQL
- ORM：Prisma
- AI 网关：new-api
- 进程管理：PM2
- 运行脚本见 package.json：
  - npm run dev
  - npm run build
  - npm run start
  - npm run db:push

重要现实约束：

- 这个项目当前没有可直接用于生产的 Prisma migration 基线。
- 生产环境数据库结构同步通常使用 `npx prisma db push`，不要默认使用 `prisma migrate deploy`。
- `README.md` 目前有 merge conflict 残留，不应作为可信主说明文档。

## 3. 关键目录怎么理解

### 前台页面
- `app/page.tsx`：首页
- `app/(auth)/login/page.tsx`：登录
- `app/(auth)/register/page.tsx`：注册
- `app/dashboard/page.tsx`：用户主工作台，卡片展示、开卡、充值、推荐、AI 入口等都在这里

### 后台页面
- `app/admin/page.tsx`：管理员主后台入口
- `app/admin/card-types/page.tsx`：卡类型配置
- `app/admin/users/...`：用户管理
- `app/admin/copilot-accounts/page.tsx`：Copilot 相关账号/池管理入口之一

### API 路由
- `app/api/config/route.ts`：用户端拉基础配置、卡类型、公告等的关键接口
- `app/api/auth/...`：认证
- `app/api/user/...`：用户侧业务 API
- `app/api/admin/...`：管理后台 API
- `app/api/webhook/...`：new-api 等外部回调
- `app/api/cron/...`：定时同步任务

### 核心库
- `src/lib/prisma.ts`：Prisma Client
- `src/lib/auth.ts` / `src/lib/adminAuth.ts`：认证与管理员校验
- `src/lib/gsalary.ts`：发卡上游相关逻辑
- `src/lib/newapi.ts`：new-api 管理、token、日志、渠道等操作
- `src/lib/usageSync.ts`：AI 用量同步相关
- `src/lib/copilotPool.ts`：Copilot 号池相关逻辑
- `src/lib/cardOpening.ts`：开卡金额/预充值/费用计算

## 4. 核心数据模型（理解业务优先级）

Prisma 文件在 `prisma/schema.prisma`。

### 虚拟卡主线
- `User`：平台用户，含普通余额 `balance` 与 AI 余额 `aiBalance`
- `CardType`：卡类型配置，是用户开卡页展示的核心数据源
- `UserCard`：用户已开卡记录
- `RechargeOrder`：账户充值订单
- `CardRechargeOrder`：卡充值订单
- `Transaction`：资金流水
- `OpenCardNotice`：开卡公告

### AI 服务主线
- `AIProvider`：上游提供商
- `AIServiceTier`：AI 套餐/服务层
- `AIKey`：用户 API Key
- `AIUsageLog`：AI 调用用量日志
- 另有企业子账号、号池扩容申请等模型

### 最近已落地的卡片字段
`CardType` 新增：
- `cardSegment`：卡段显示，例如 `45659910-physical`

它已经用于：
- 管理端卡类型新增/编辑
- 用户端卡类型展示
- 用户端配置接口 `app/api/config/route.ts`

## 5. 当前项目最重要的业务链路

### A. 用户端卡片展示与开卡链路

1. 用户进入 `app/dashboard/page.tsx`
2. 页面调用 `GET /api/config`
3. 后端从 `CardType` 读出可见卡类型、费率展示字段、说明、卡编号、卡段等
4. 前端在“选择卡片类型”区渲染卡面
5. 用户点击开卡后继续进入开卡/充值/上游发卡流程

如果用户端卡片展示有问题，优先看这三个位置：
- `app/dashboard/page.tsx`
- `app/api/config/route.ts`
- `prisma/schema.prisma` 中的 `CardType`

### B. 管理员配置卡类型链路

1. 管理员进入 `app/admin/card-types/page.tsx`
2. 页面调 `app/api/admin/card-types/route.ts` 和 `app/api/admin/card-types/[id]/route.ts`
3. 修改内容写入 `CardType`
4. 用户端再通过 `GET /api/config` 获取并展示

这条链路目前已经支持：
- 卡产品编号 `cardBin`
- 卡段显示 `cardSegment`
- 展示费率与实际费率分离
- `targetRole` 区分普通用户和代理商版本

### C. AI Key / new-api 链路

高层逻辑：

1. 用户创建 AI Key
2. 系统调用 new-api 创建 token
3. token 元数据写回本库 `AIKey`
4. 用户通过平台域名发起 AI 调用
5. new-api 记录日志
6. webhook 或 cron 同步用量并扣减余额

详细结构优先看：
- `/memories/repo/ai-service-architecture.md`
- `/memories/repo/ai-key-system-flow.md`
- `src/lib/newapi.ts`

### D. Copilot 号池链路

这部分是生产运维重点，不是单纯页面功能：

1. 服务器上运行多实例 copilot-api
2. 每个端口独立 HOME，避免 token 共用
3. 通过 new-api channel 路由到不同 copilot-api 实例
4. 用户获取 token 后，由 AI 通过 SSH 完成换绑/扩容/重启

详细操作手册看：
- `账号测试流程.md`

## 6. 生产环境与部署事实

### 服务器
- 生产服务器 IP、SSH 方式、项目目录、Copilot 号池操作方式见 `账号测试流程.md`
- 当前主项目目录：`/opt/cardvela`

### 常用部署动作
典型 AI 操作模式：

1. 本地改代码
2. 通过 scp 上传到 `/opt/cardvela`
3. 在服务器执行：
   - `npm run build`
   - `pm2 restart cardvela`
4. 如果 Prisma schema 有变更：
   - 优先 `npx prisma db push`

### PowerShell 远程执行约定
不要直接在 PowerShell 里拼复杂引号的 ssh 命令。
优先使用 `账号测试流程.md` 里的 base64 + here-string 模式：

```powershell
$script = @'
cd /opt/cardvela
your commands here
'@
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($script))
ssh -i "$env:USERPROFILE\.ssh\id_ed25519" root@23.106.142.166 "echo $b64 | base64 -d | bash"
```

## 7. 重要文档的用途

- `AI_PROJECT_CONTEXT.md`
  - 当前这份文件，给新 AI 会话快速建立全局认知

- `账号测试流程.md`
  - 生产服务器、SSH 执行方式、Copilot 号池换绑/扩容/停用手册

- `HANDOFF_NEXT_CHAT.md`
  - 简短交接与当前待修问题

- `SERVER_FIX_COMMANDS.txt`
  - 当前产品规划偏 AI 出海工作空间 MVP，不是纯运维命令清单

- `/memories/repo/ai-service-architecture.md`
  - AI 服务架构全局说明

- `/memories/repo/ai-key-system-flow.md`
  - AI Key 与 new-api token 同步链路、失效原因与修复思路

- `/memories/repo/cursor-proxy-sse-format.md`
  - Cursor 在 `/v1/chat/completions` 下的 SSE 兼容要求，避免错误使用 `event:` 行

## 8. 当前已知问题（接手优先关注）

来自 `HANDOFF_NEXT_CHAT.md` 的当前待修项：

1. 计费/用量不记录
- 现象：调用成功但不扣费、不记日志
- 排查方向：webhook、cron、`src/lib/newapi.ts`、`src/lib/usageSync.ts`、`AIUsageLog`

2. 号池账号绑定 Key 后从管理页面消失
- 排查方向：后台列表查询条件、绑定关系字段、new-api / 本库同步逻辑

## 9. 最近完成的改动（新会话高频会问到）

最近已经完成并上线的内容：

1. 卡类型支持 `cardSegment`
- 管理端可新增/编辑
- 用户端接口会返回
- 用户端卡片展示为：
  - 卡编号（#Gxxxxx）
  - 卡段（45659910-physical）

2. 用户端开卡卡面样式优化
- 费用展示改为更紧凑的参数块布局
- 功能逻辑未改变，仅优化视觉与可读性

## 10. 新 AI 接手时的建议顺序

如果是第一次接手本仓库，建议按这个顺序看：

1. 先看本文件 `AI_PROJECT_CONTEXT.md`
2. 再看 `prisma/schema.prisma`，理解核心模型
3. 再看 `app/dashboard/page.tsx` 和 `app/api/config/route.ts`，理解用户主链路
4. 如果任务是后台配置，继续看 `app/admin/card-types/page.tsx` 和对应 admin API
5. 如果任务涉及 AI Key / 号池 / new-api，再看：
   - `src/lib/newapi.ts`
   - `/memories/repo/ai-service-architecture.md`
   - `/memories/repo/ai-key-system-flow.md`
   - `账号测试流程.md`

## 11. 明确的操作禁忌

1. 不要默认信任 `README.md`，它当前有冲突内容。
2. 不要在生产库上直接默认跑 `prisma migrate deploy`。
3. 不要对 copilot-api 使用 `pkill -f` 之类粗暴杀进程操作。
4. 不要把新的敏感 token、cookie、密钥再抄写进新的文档文件；敏感信息优先保留在已有运维文档或环境变量中。

## 12. 一句话总结

这是一个“虚拟卡平台 + AI 服务网关 + Copilot 号池运维”混合型项目；大多数功能问题先从 `dashboard/config/card-types/schema` 四件套入手，大多数 AI 问题先从 `newapi.ts + webhook/cron + repo memories` 入手，大多数生产问题先看 `账号测试流程.md`。