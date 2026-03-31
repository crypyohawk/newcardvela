# Copilot 号池 — 会话交接文档

> 日期：2026-03-31
> 仓库：https://github.com/crypyohawk/newcardvela.git
> 服务器：ubuntu@ip-172-31-38-205 (/home/ubuntu/cardvela)

---

## 一、当前架构

```
用户 (Cline/Cursor/Claude Code)
  → https://api.cardvela.com  (nginx → new-api Docker, port 3001)
    → copilot-api 实例 (宿主机 port 4141)
      → GitHub Copilot API (ghu_xxx token)

CardVela (PM2, port 3000) → .env.production 中 NEW_API_BASE_URL/NEW_API_ADMIN_TOKEN → new-api
```

---

## 二、已完成的事项

### 基础设施
- [x] nvm + Node 20 安装，copilot-api 全局安装
- [x] GitHub Copilot token (ghu_xxx) 获取成功
- [x] copilot-api 实例运行在 port 4141，模型列表正常返回
- [x] CardVela 数据库 CopilotAccount 记录已创建 (id: cmnd9kg1u000413fup0ve007b, githubId: copilot1, port: 4141)

### new-api 配置 (https://api.cardvela.com)
- [x] 渠道 copilot-1 (ID=5)：类型 OpenAI，Base URL = `http://172.17.0.1:4141`（Docker 网桥 IP，不能用 127.0.0.1）
- [x] 渠道分组 = `copilot`
- [x] 模型列表已配双格式（`.` 和 `-`）：claude-opus-4.6 + claude-opus-4-6 等
- [x] 模型映射已配：`claude-opus-4-6` → `claude-opus-4.6` 等（编辑器用 `-`，copilot-api 用 `.`）
- [x] 系统设置 → 分组倍率有 `"copilot": 1`
- [x] 系统设置 → 用户可选分组有 `"copilot": "Copilot号池"`（之前漏了这个导致"无权访问"）
- [x] 令牌已创建：name=proj-c332b7c9, key=sk-Kyzh...jtON, group=copilot

### CardVela 配置 (https://cardvela.com/admin)
- [x] AI 服务商 `new-api` 已创建（API: https://api.cardvela.com，代码不使用此字段）
- [x] 套餐 `copilot-claude` 已创建：分组=copilot，输入$1.5/M，输出$7/M，限2个Key
- [x] CopilotAccount 已绑定 channelId=5

### 代码修改（本次会话，未部署）
- [x] `app/api/admin/ai-keys/route.ts` — 新增 DELETE 方法（管理员删除用户 Key，同步删 new-api token）
- [x] `app/admin/page.tsx` — Key 管理表格新增"删除"按钮 + handleDeleteAIKey 函数

### API 调用验证
- [x] 直连 copilot-api (127.0.0.1:4141) 成功，日志显示 200
- [x] 通过 new-api (api.cardvela.com) 调用成功（Cline 插件已能正常对话）

---

## 三、待完成事项

### 🔴 紧急：部署代码 + 设置 Cron
```bash
# 1. 推代码到服务器
cd ~/cardvela
git pull origin main
npm run build
pm2 restart cardvela

# 2. 手动触发一次用量同步（验证是否正常）
curl -s "http://localhost:3000/api/cron/sync-usage?secret=你的CRON_SECRET" | python3 -m json.tool

# 3. 设置 crontab 每 5 分钟同步
crontab -e
# 添加：
*/5 * * * * curl -s "http://localhost:3000/api/cron/sync-usage?secret=你的CRON_SECRET" > /dev/null 2>&1
@reboot cd /home/ubuntu/cardvela && bash scripts/copilot-pool.sh start >> /home/ubuntu/copilot-pool/logs/startup.log 2>&1
```

### 🟡 用量/计费不显示的原因
计费是**延迟的**，不是实时扣费：
1. 用户调 API → new-api 记日志
2. Cron 每 5 分钟拉 new-api 日志 → 匹配 Key → 计算费用 → 扣 aiBalance
3. **当前没设 crontab，所以日志从未被拉取，用量/扣费为零**

计费链路代码：`src/lib/usageSync.ts` → `processUsageLogs()`
- 通过 `newApiTokenName` 匹配 AIKey
- 费用 = (inputTokens/1M × pricePerMillionInput) + (outputTokens/1M × pricePerMillionOutput)
- 扣 `User.aiBalance`，写 `AIUsageLog` + `Transaction(type=ai_usage)`
- 幂等：`externalLogId` 唯一约束防重复扣费

### 🟡 已知代码问题
1. **sync/route.ts 写死 group='default'**：`app/api/admin/copilot-accounts/sync/route.ts` 中同步渠道时硬编码 `group: 'default'`，会覆盖手动设的 `copilot` → 如果用管理后台同步功能需注意
2. **AIProvider.baseUrl/masterKey 是死字段**：代码不使用，真正认证走 .env.production

---

## 四、关键配置速查

### 环境变量 (.env.production)
| 变量 | 说明 |
|------|------|
| `NEW_API_BASE_URL` | `http://127.0.0.1:3001`（CardVela→new-api 内网直连） |
| `NEW_API_ADMIN_TOKEN` | new-api 管理员 token |
| `NEW_API_ADMIN_USER` | `1` |
| `NEW_API_SQLITE_PATH` | `/home/ubuntu/new-api/data/one-api.db` |
| `CRON_SECRET` | cron 同步鉴权密钥 |

### 端口分布
| 服务 | 端口 | 运行方式 |
|------|------|---------|
| CardVela | 3000 | PM2 |
| new-api | 3001 (映射自容器 3000) | Docker |
| copilot-api | 4141 | nohup (copilot-pool.sh) |
| PostgreSQL | 5432 | Docker |

### 路由核心链路
```
套餐.channelGroup = "copilot"
  → 用户创建 Key 时 → createNewApiToken({ group: "copilot" })
    → new-api token.group = "copilot"
      → 匹配 channel.group = "copilot" (渠道 ID=5)
        → Base URL http://172.17.0.1:4141
          → copilot-api → GitHub Copilot
```

### 渠道模型自动生成命令
```bash
curl -s http://127.0.0.1:4141/v1/models | python3 -c "
import sys,json
models=[m['id'] for m in json.load(sys.stdin)['data']]
dash=[m.replace('.','-') for m in models if '.' in m]
print('模型列表:')
print(','.join(models+dash))
print()
print('模型映射:')
print('{')
items=['  \"'+m.replace('.','-')+'\": \"'+m+'\"' for m in models if '.' in m]
print(',\n'.join(items))
print('}')
"
```

---

## 五、踩过的坑（重要）

1. **Docker 网络隔离**：new-api 在 Docker 里，`127.0.0.1` 是容器自己。渠道 Base URL 必须用 `172.17.0.1`（docker0 网桥）
2. **new-api 分组需要两处注册**：分组倍率 + 用户可选分组，缺一个就报"无权访问"
3. **模型名格式不一致**：copilot-api 用 `.`（claude-opus-4.6），Cline 等编辑器用 `-`（claude-opus-4-6）。渠道需要双格式 + 模型映射
4. **copilot-api 启动慢**：端口要等 15 秒才能 listen
5. **PM2 + .env.production**：必须先 `set -a; source .env.production; set +a` 再启动 PM2，否则环境变量不注入

