@echo off
REM 在运行此脚本前，请在 GitHub 创建新仓库并记下 HTTPS 地址
set /p GITHUB_USER=请输入 GitHub 用户名:
set /p NEW_REPO=请输入新仓库名（例如 cardvale-new）:

cd /d "%~dp0\.."

echo 正在移除旧 remote（如果存在）...
git remote remove origin 2>nul

echo 添加新 remote...
git remote add origin https://github.com/%GITHUB_USER%/%NEW_REPO%.git

echo 检查并提交本地改动...
git add -A
git commit -m "deploy: push to new repo" 2>nul

echo 推送 main 分支到新仓库...
git branch -M main
git push -u origin main

if errorlevel 1 (
  echo 推送失败，请检查凭证或远程地址。
  pause
  exit /b 1
)

echo 推送成功: https://github.com/%GITHUB_USER%/%NEW_REPO%.git
pause
