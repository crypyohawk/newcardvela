#!/bin/bash

echo "🚀 开始部署 CardVela..."

# 拉取最新代码
git pull origin main

# 构建并启动容器
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 等待数据库启动
echo "⏳ 等待数据库启动..."
sleep 10

# 运行数据库迁移
docker-compose exec app npx prisma db push

echo "✅ 部署完成！"
echo "🌐 访问 https://cardvela.com"
