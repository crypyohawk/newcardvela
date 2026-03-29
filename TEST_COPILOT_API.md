# 测试 ericc-ch/copilot-api 工具步骤

## 概述
本文件提供测试 `ericc-ch/copilot-api` 的具体步骤和命令，用于验证工具可用性，为账号池方案做准备。

## 前提
- GitHub 账户已登录，且有 Copilot Pro 订阅。
- 在项目目录 `C:\Users\Admin\Desktop\yeka` 下运行命令。

## 步骤1：获取 GitHub Copilot Token
运行以下命令获取 token（gho_ 开头）：
```
npx copilot-api auth
```
- 这会打开浏览器登录 GitHub。
- 成功后，复制输出的 token（保密）。

## 步骤2：启动 Copilot API 服务器
用 token 启动服务器（替换 YOUR_TOKEN 为实际 token）：
```
npx copilot-api start --port 4141 --token YOUR_TOKEN
```
- 服务器启动在 http://localhost:4141。
- 成功显示 "Server started on port 4141"。

## 步骤3：测试 API 调用
新开 PowerShell 终端，运行 curl 测试：
```
curl -X POST http://localhost:4141/v1/chat/completions -H "Content-Type: application/json" -d "{\"model\": \"claude-3.5-sonnet\", \"messages\": [{\"role\": \"user\", \"content\": \"Hello, test message\"}]}"
```
- 预期返回 JSON，如 `{"choices": [{"message": {"content": "Hi there!"}}]}`。
- 失败则检查 token 或网络。

## 注意事项
- 如果 auth 失败，确保 Copilot 订阅有效。
- 测试后 Ctrl+C 停止服务器。
- 成功后，我们继续实现池子。

## 运行结果记录
- 步骤1 结果：
- 步骤2 结果：
- 步骤3 结果：