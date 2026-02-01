@echo off
REM 在服务器 C:\cardvela 下运行；首次部署请先 git clone 到 C:\cardvela

cd /d C:\cardvela

echo 拉取并重置为远程 main...
git fetch origin
git reset --hard origin/main

echo 安装依赖...
npm install

echo 应用数据库模式（Prisma）...
npx prisma db push

echo 构建项目...
npm run build
if errorlevel 1 (
  echo 构建失败，请查看错误日志
  pause
  exit /b 1
)

echo 复制静态资源到 standalone（如存在）...
if exist ".next\static" (
  xcopy /E /I /Y ".next\static" ".next\standalone\.next\static"
)
if exist "public" (
  xcopy /E /I /Y "public" ".next\standalone\public"
)

echo 启动服务（推荐使用 pm2，或直接用 node）...
cd .next\standalone
REM 使用 PM2 更稳健：pm2 start server.js --name cardvela
start "" cmd /c "node server.js"

echo 部署完成
pause
