#!/bin/bash
set -e

echo "🚀 开始部署 CardVela..."

cd "$(dirname "$0")"

# 拉取最新代码
git pull origin main

# 安装依赖（如有变化）
if [ package-lock.json -nt node_modules/.package-lock.json ] || [ ! -d node_modules ]; then
  echo "📦 安装依赖..."
  npm ci
fi

# Prisma client + 数据库迁移
npx prisma generate
npx prisma db push --skip-generate

# 构建 Next.js
echo "🔨 构建中..."
npm run build

# 通过 PM2 重启 cardvela 主服务
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart cardvela --update-env
  pm2 save
else
  echo "⚠️  未安装 pm2，跳过重启。请手动重启服务。"
fi

echo "✅ 部署完成！"
echo "🌐 访问 https://cardvela.com"
