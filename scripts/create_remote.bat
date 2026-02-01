@echo off
REM 用法：编辑脚本中 USER 和 REPO 后运行

set USER=crypyohawk
set REPO=cardvale-new

REM 移除旧远程
git remote remove origin 2>nul

REM 添加新远程并推送主分支
git remote add origin https://github.com/%USER%/%REPO%.git
git branch -M main
git push -u origin main

echo Done.
pause
