#!/bin/bash
# ================================================================
# CardVela 号池绑定 + AI 等级系统 — 服务器部署脚本
# 日期: 2026-03-31
# 最新提交: 3a2d4be (origin/main)
# ================================================================
#
# 变更清单 (a46d013 → 3a2d4be, 共 5 个 commit):
#   1. feat: pool resource binding system + AI tier upgrade
#   2. fix: 5 bugs in pool binding system
#   3. fix: tighten pool key lifecycle rules
#   4. fix: skip revoked keys in usage sync
#
# Schema 新增:
#   User:            aiTier, aiBalanceLocked, aiTierUpgradedAt
#   CopilotAccount:  boundAiKeyId(@unique), boundUserId, boundAt
#   AIKey:           copilotAccountId
#   新表:            PoolExpansionRequest
#
# 新增 API:
#   GET/POST  /api/user/ai-service/upgrade      — AI 等级升级
#   GET/POST  /api/user/ai-service/pool-request  — 号池扩容申请
#   GET/PUT   /api/admin/pool-requests           — 管理员审批扩容
#
# ================================================================

set -e  # 任何命令失败立即停止

# ================================================================
# 步骤 1: 拉取最新代码
# ================================================================
echo ">>> [1/5] 拉取最新代码..."
cd /home/ubuntu/cardvela
git pull origin main

# ================================================================
# 步骤 2: 数据库迁移
# ================================================================
echo ">>> [2/5] 数据库迁移..."

# 加载环境变量（确保 DATABASE_URL 可用）
set -a; source .env.production; set +a

# 生产环境推荐用 db push（直接同步 schema 到数据库，无需迁移文件）
npx prisma db push

# 重新生成 Prisma Client
npx prisma generate

# ================================================================
# 步骤 3: 构建项目
# ================================================================
echo ">>> [3/5] 构建项目..."
npm run build

# ================================================================
# 步骤 4: 重启服务
# ================================================================
echo ">>> [4/5] 重启 PM2 服务..."
pm2 restart cardvela
pm2 save

# 等待 5 秒让服务完全启动
sleep 5

# ================================================================
# 步骤 5: 验证
# ================================================================
echo ">>> [5/5] 验证服务状态..."

# 检查进程状态
pm2 status cardvela

# 测试用量同步接口
echo ""
echo ">>> 测试用量同步..."
curl -s "http://localhost:3000/api/cron/sync-usage?secret=a335b8fb17d4766aa3d30c8fe8b89be6" | python3 -m json.tool || echo "同步接口返回异常"

# 检查新 API 是否可达（应返回 401，说明路由注册成功）
echo ""
echo ">>> 测试新增 API 可达性（期望 401 = 路由正常）..."
curl -s -o /dev/null -w "upgrade API: HTTP %{http_code}\n" http://localhost:3000/api/user/ai-service/upgrade
curl -s -o /dev/null -w "pool-request API: HTTP %{http_code}\n" http://localhost:3000/api/user/ai-service/pool-request
curl -s -o /dev/null -w "admin pool-requests API: HTTP %{http_code}\n" http://localhost:3000/api/admin/pool-requests

echo ""
echo ">>> 部署完成！"

# ================================================================
# 热更新（仅前端/API 改动，无 Schema 变更时）
# ================================================================
# cd /home/ubuntu/cardvela
# git pull origin main
# npm run build
# pm2 restart cardvela

# ================================================================
# 手动触发用量同步（排查用量不显示时使用）
# ================================================================
# curl -s "http://localhost:3000/api/cron/sync-usage?secret=a335b8fb17d4766aa3d30c8fe8b89be6" | python3 -m json.tool
#
# 正常返回示例:
#   synced > 0  → 有新日志被同步并扣费
#   synced = 0, debug.lastSyncAt → 上次同步时间戳，确认是否覆盖了调用时段
#
# 如果持续 synced=0，检查 new-api 日志面板是否有对应调用记录

# ================================================================
# 修复 NEW_API_ADMIN_TOKEN（用量同步报 token 无效时）
# ================================================================
# ⚠️ NEW_API_ADMIN_TOKEN 是 CardVela 后端调 new-api 管理 API 的令牌（查日志/建token/禁用token）
#    它与用户的 sk-xxxxx Key 完全独立，更换此 token 不会影响任何用户 Key 的正常使用。
#
# 步骤:
#   1. 浏览器打开 http://<服务器IP>:3001 登录 new-api 管理后台
#      （如果 3001 端口未开放外网，用 SSH 隧道: ssh -L 3001:127.0.0.1:3001 ubuntu@<IP>）
#   2. 点击右上角头像 → 个人设置 → 系统访问令牌 → 生成新令牌
#   3. 复制令牌，更新服务器上的 .env.production:
#      nano /home/ubuntu/cardvela/.env.production
#      找到 NEW_API_ADMIN_TOKEN=旧值 → 替换为新令牌 → Ctrl+O 保存 → Ctrl+X 退出
#   4. 重新加载环境变量并重启:
#      cd /home/ubuntu/cardvela
#      set -a; source .env.production; set +a
#      pm2 restart cardvela
#   5. 验证:
#      curl -s "http://localhost:3000/api/cron/sync-usage?secret=a335b8fb17d4766aa3d30c8fe8b89be6" | python3 -m json.tool
#      如果不再报 token 无效且 synced > 0，说明修复成功

# ================================================================
# 步骤 6: 配置 Crontab（首次部署后手动执行一次 crontab -e）
# ================================================================
# 写入以下三行：
#
# # 每月1号凌晨3点收月费
# 0 3 1 * * curl -s -X POST http://localhost:3000/api/admin/monthly-fee -H "x-cron-secret: CardVela-MonthlyFee-2026-Secret" > /dev/null 2>&1
#
# # 每5分钟同步AI用量
# */5 * * * * curl -s "http://localhost:3000/api/cron/sync-usage?secret=a335b8fb17d4766aa3d30c8fe8b89be6" > /dev/null 2>&1
#
# # 开机自动启动 copilot-pool
# @reboot cd /home/ubuntu/cardvela && bash scripts/copilot-pool.sh start >> /home/ubuntu/copilot-pool/logs/startup.log 2>&1

# ================================================================
# 步骤 7: 管理后台配置（通过网页操作）
# ================================================================
# 1. 登录管理后台 → AI 服务商管理
#    编辑 new-api 服务商 → 类型设为 copilot-pool
#
# 2. AI 套餐管理 → copilot-claude 套餐
#    所需角色 → 企业用户 (enterprise)
#    确认上游分组名 = copilot
#    确认套餐已启用
