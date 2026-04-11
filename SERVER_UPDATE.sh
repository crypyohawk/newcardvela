#!/bin/bash
# ============================================================
# 修复 500 "模型倍率或价格未配置" 错误
# ============================================================
# 渠道分组已OK，现在是模型名不匹配
# 方案：渠道填真实模型名 + 模型重定向映射别名

# 去 api.cardvela.com → 渠道管理 → 编辑渠道 #2
#
# === 模型字段（只填 copilot-api 真实支持的名称）===
# 清空原有内容，粘贴这一行：
#
# claude-sonnet-4,claude-sonnet-4.5,claude-sonnet-4.6,claude-opus-4.5,claude-opus-4.6,claude-opus-4.6-fast,claude-haiku-4.5,gpt-4o,gpt-4o-mini,gpt-4o-mini-2024-07-18,gpt-4o-2024-11-20,gpt-4o-2024-08-06,gpt-4o-2024-05-13,gpt-4,gpt-4-0613,gpt-4-0125-preview,gpt-4-o-preview,gpt-4.1,gpt-4.1-2025-04-14,gpt-41-copilot,gpt-5.1,gpt-5.2,gpt-5.2-codex,gpt-5.3-codex,gpt-5.4,gpt-5.4-mini,gpt-5-mini,gpt-3.5-turbo,gpt-3.5-turbo-0613,gemini-2.5-pro,gemini-3-flash-preview,gemini-3.1-pro-preview,grok-code-fast-1,goldeneye-free-auto,oswe-vscode-prime,oswe-vscode-secondary,text-embedding-3-small,text-embedding-3-small-inference,text-embedding-ada-002
#
# === 模型重定向（JSON格式，把横杠别名映射到点号真名）===
# 在编辑渠道页面找到「模型重定向」字段，粘贴这个 JSON：
#
# {
#   "claude-sonnet-4-6": "claude-sonnet-4.6",
#   "claude-sonnet-4-5": "claude-sonnet-4.5",
#   "claude-opus-4-6": "claude-opus-4.6",
#   "claude-opus-4-5": "claude-opus-4.5",
#   "claude-opus-4-6-fast": "claude-opus-4.6-fast",
#   "claude-haiku-4-5": "claude-haiku-4.5",
#   "gpt-4-1": "gpt-4.1",
#   "gpt-4-1-2025-04-14": "gpt-4.1-2025-04-14",
#   "gpt-5-1": "gpt-5.1",
#   "gpt-5-2": "gpt-5.2",
#   "gpt-5-2-codex": "gpt-5.2-codex",
#   "gpt-5-3-codex": "gpt-5.3-codex",
#   "gpt-5-4": "gpt-5.4",
#   "gpt-5-4-mini": "gpt-5.4-mini",
#   "gemini-2-5-pro": "gemini-2.5-pro",
#   "gemini-3-1-pro-preview": "gemini-3.1-pro-preview"
# }
#
# 一行版（直接复制粘贴）：
# {"claude-sonnet-4-6":"claude-sonnet-4.6","claude-sonnet-4-5":"claude-sonnet-4.5","claude-opus-4-6":"claude-opus-4.6","claude-opus-4-5":"claude-opus-4.5","claude-opus-4-6-fast":"claude-opus-4.6-fast","claude-haiku-4-5":"claude-haiku-4.5","gpt-4-1":"gpt-4.1","gpt-4-1-2025-04-14":"gpt-4.1-2025-04-14","gpt-5-1":"gpt-5.1","gpt-5-2":"gpt-5.2","gpt-5-2-codex":"gpt-5.2-codex","gpt-5-3-codex":"gpt-5.3-codex","gpt-5-4":"gpt-5.4","gpt-5-4-mini":"gpt-5.4-mini","gemini-2-5-pro":"gemini-2.5-pro","gemini-3-1-pro-preview":"gemini-3.1-pro-preview"}
#
# === 然后去 设置 → 运营设置 ===
# 
# 重要说明：
# new-api 的模型倍率/固定价格 ≠ CardVela 的实际计费！
# CardVela 用自己的 AIServiceTier (pricePerMillionInput/Output) 计费
# new-api 的倍率只用于：
#   1. 不配会报 500 错误（必须存在）
#   2. 从 token 的 remain_quota 扣除，作为熔断保护
# 所以这里设小值，让 quota 消耗慢，避免误熔断

# ========================
# 模型倍率（追加到已有JSON里）
# ========================
# 在已有 JSON 最后一个条目后加逗号，然后粘贴下面全部内容（不含首尾花括号）：
#
# "claude-sonnet-4": 0.5,
# "claude-sonnet-4.5": 0.5,
# "claude-sonnet-4.6": 0.5,
# "claude-opus-4.5": 0.5,
# "claude-opus-4.6": 0.5,
# "claude-opus-4.6-fast": 0.5,
# "claude-haiku-4.5": 0.5,
# "gpt-4o": 0.5,
# "gpt-4o-mini": 0.5,
# "gpt-4o-mini-2024-07-18": 0.5,
# "gpt-4o-2024-11-20": 0.5,
# "gpt-4o-2024-08-06": 0.5,
# "gpt-4o-2024-05-13": 0.5,
# "gpt-4": 0.5,
# "gpt-4-0613": 0.5,
# "gpt-4-0125-preview": 0.5,
# "gpt-4-o-preview": 0.5,
# "gpt-4.1": 0.5,
# "gpt-4.1-2025-04-14": 0.5,
# "gpt-41-copilot": 0.5,
# "gpt-5.1": 0.5,
# "gpt-5.2": 0.5,
# "gpt-5.2-codex": 0.5,
# "gpt-5.3-codex": 0.5,
# "gpt-5.4": 0.5,
# "gpt-5.4-mini": 0.5,
# "gpt-5-mini": 0.5,
# "gpt-3.5-turbo": 0.5,
# "gpt-3.5-turbo-0613": 0.5,
# "gemini-2.5-pro": 0.5,
# "gemini-3-flash-preview": 0.5,
# "gemini-3.1-pro-preview": 0.5,
# "grok-code-fast-1": 0.5,
# "goldeneye-free-auto": 0,
# "oswe-vscode-prime": 0.5,
# "oswe-vscode-secondary": 0.5,
# "text-embedding-3-small": 0.1,
# "text-embedding-3-small-inference": 0.1,
# "text-embedding-ada-002": 0.1

# ========================
# 模型固定价格（追加到已有JSON里）
# ========================
# 同样追加，这个决定 new-api 侧每次扣多少 quota（设小值）：
#
# "claude-sonnet-4": 0.002,
# "claude-sonnet-4.5": 0.002,
# "claude-sonnet-4.6": 0.002,
# "claude-opus-4.5": 0.002,
# "claude-opus-4.6": 0.002,
# "claude-opus-4.6-fast": 0.002,
# "claude-haiku-4.5": 0.002,
# "gpt-4o": 0.002,
# "gpt-4o-mini": 0.002,
# "gpt-4o-mini-2024-07-18": 0.002,
# "gpt-4o-2024-11-20": 0.002,
# "gpt-4o-2024-08-06": 0.002,
# "gpt-4o-2024-05-13": 0.002,
# "gpt-4": 0.002,
# "gpt-4-0613": 0.002,
# "gpt-4-0125-preview": 0.002,
# "gpt-4-o-preview": 0.002,
# "gpt-4.1": 0.002,
# "gpt-4.1-2025-04-14": 0.002,
# "gpt-41-copilot": 0.002,
# "gpt-5.1": 0.002,
# "gpt-5.2": 0.002,
# "gpt-5.2-codex": 0.002,
# "gpt-5.3-codex": 0.002,
# "gpt-5.4": 0.002,
# "gpt-5.4-mini": 0.002,
# "gpt-5-mini": 0.002,
# "gpt-3.5-turbo": 0.002,
# "gpt-3.5-turbo-0613": 0.002,
# "gemini-2.5-pro": 0.002,
# "gemini-3-flash-preview": 0.002,
# "gemini-3.1-pro-preview": 0.002,
# "grok-code-fast-1": 0.002,
# "goldeneye-free-auto": 0,
# "oswe-vscode-prime": 0.002,
# "oswe-vscode-secondary": 0.002,
# "text-embedding-3-small": 0.0001,
# "text-embedding-3-small-inference": 0.0001,
# "text-embedding-ada-002": 0.0001

# ============================================================
# new-api 渠道模型列表（两种格式，全部复制粘贴进去）
# ============================================================
#
# 格式1：API原始名称（逗号分隔，直接粘贴到渠道的「模型」字段）
#
# claude-sonnet-4,claude-sonnet-4.5,claude-sonnet-4.6,claude-opus-4.5,claude-opus-4.6,claude-opus-4.6-fast,claude-haiku-4.5,gpt-4o,gpt-4o-mini,gpt-4o-mini-2024-07-18,gpt-4o-2024-11-20,gpt-4o-2024-08-06,gpt-4o-2024-05-13,gpt-4,gpt-4-0613,gpt-4-0125-preview,gpt-4-o-preview,gpt-4.1,gpt-4.1-2025-04-14,gpt-41-copilot,gpt-5.1,gpt-5.2,gpt-5.2-codex,gpt-5.3-codex,gpt-5.4,gpt-5.4-mini,gpt-5-mini,gpt-3.5-turbo,gpt-3.5-turbo-0613,gemini-2.5-pro,gemini-3-flash-preview,gemini-3.1-pro-preview,grok-code-fast-1,goldeneye-free-auto,oswe-vscode-prime,oswe-vscode-secondary,text-embedding-3-small,text-embedding-3-small-inference,text-embedding-ada-002
#
# 格式2：按厂商分类列表（方便查看）
#
# === Claude ===
# claude-sonnet-4          / Claude sonnet-4
# claude-sonnet-4.5        / Claude sonnet-4.5
# claude-sonnet-4.6        / Claude sonnet-4.6
# claude-opus-4.5          / Claude opus-4.5
# claude-opus-4.6          / Claude opus-4.6
# claude-opus-4.6-fast     / Claude opus-4.6-fast
# claude-haiku-4.5         / Claude haiku-4.5
#
# === GPT ===
# gpt-4o                   / GPT-4o
# gpt-4o-mini              / GPT-4o-mini
# gpt-4o-mini-2024-07-18
# gpt-4o-2024-11-20
# gpt-4o-2024-08-06
# gpt-4o-2024-05-13
# gpt-4                    / GPT-4
# gpt-4-0613
# gpt-4-0125-preview
# gpt-4-o-preview          / GPT-4-o-preview
# gpt-4.1                  / GPT-4.1
# gpt-4.1-2025-04-14
# gpt-41-copilot
# gpt-5.1                  / GPT-5.1
# gpt-5.2                  / GPT-5.2
# gpt-5.2-codex            / GPT-5.2-codex
# gpt-5.3-codex            / GPT-5.3-codex
# gpt-5.4                  / GPT-5.4
# gpt-5.4-mini             / GPT-5.4-mini
# gpt-5-mini               / GPT-5-mini
# gpt-3.5-turbo
# gpt-3.5-turbo-0613
#
# === Gemini ===
# gemini-2.5-pro           / Gemini 2.5-pro
# gemini-3-flash-preview   / Gemini 3-flash-preview
# gemini-3.1-pro-preview   / Gemini 3.1-pro-preview
#
# === Grok ===
# grok-code-fast-1         / Grok code-fast-1
#
# === 其他 ===
# goldeneye-free-auto
# text-embedding-3-small
# text-embedding-3-small-inference
# text-embedding-ada-002
# oswe-vscode-prime
# oswe-vscode-secondary


# 以后更新代码只需要：
# cd /opt/cardvela
# git pull origin main
# npm run build
# set -a; source .env.production; set +a
# pm2 restart cardvela
# （不需要管 copilot-api，PM2 会一直保持它运行）
