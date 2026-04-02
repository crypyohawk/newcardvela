==================================================
new-api 分组配置 - 可直接复制
2026-04-02
==================================================

# 推荐方案：
# - 新增内部号池分组 cardvela-caca
# - 普通用户不直接看到这个分组
# - 后台创建/绑定渠道时可指定 group=cardvela-caca


分组倍率：
{
	"default": 1,
	"svip": 1,
	"vip": 1,
	"cardvela-caca": 1
}


用户可选分组：
{
	"default": "默认分组",
	"vip": "vip分组"
}


分组特殊倍率：
{
	"vip": {
		"edit_this": 0.9
	},
	"cardvela-caca": {
		"edit_this": 1
	}
}


分组特殊可用分组：
{
	"vip": {
		"--remove_1": "vip_removed_group_1",
		"append_1": "vip_special_group_1"
	},
	"cardvela-caca": {
		"append_1": "cardvela-caca"
	}
}


# 如果你想让用户创建令牌时也能直接选择 cardvela-caca，改用下面这份“用户可选分组”：
# {
#   "default": "默认分组",
#   "vip": "vip分组",
#   "cardvela-caca": "卡池分组"
# }


# 最简方案（如果你不想保留 svip）
# 分组倍率：
# {
#   "default": 1,
#   "vip": 1,
#   "cardvela-caca": 1
# }
#
# 用户可选分组：
# {
#   "default": "默认分组",
#   "vip": "vip分组"
# }
#
# 分组特殊倍率：
# {
#   "vip": {
#     "edit_this": 0.9
#   }
# }
#
# 分组特殊可用分组：
# {
#   "cardvela-caca": {
#     "append_1": "cardvela-caca"
#   }
# }


# 渠道分组填写说明：
# - 你们号池渠道的 group 填：cardvela-caca
# - 普通渠道保持 default 或 vip


==================================================
new-api 分组配置 - 完整版（含上游分组）
2026-04-02
==================================================

# 适用场景：
# - 普通用户分组：default / vip / svip
# - PoloAPI 上游分组：poloapi
# - 自己号池分组：cardvela-caca
# - 你截图里现有的上游渠道分组：
#   claude-官
#   claude aws 官
#   Claude-code
#   cur-claude
#
# 推荐原则：
# - 用户可选分组只放 default / vip / svip
# - 上游渠道分组和内部号池分组只在后台渠道上使用，不开放给普通用户直接选


完整版分组倍率：
{
	"default": 1,
	"vip": 1,
	"svip": 1,
	"poloapi": 1,
	"cardvela-caca": 1,
	"claude-官": 1,
	"claude aws 官": 1,
	"Claude-code": 1,
	"cur-claude": 1
}


完整版用户可选分组：
{
	"default": "默认分组",
	"vip": "VIP分组",
	"svip": "SVIP分组"
}


完整版分组特殊倍率：
{
	"vip": {
		"edit_this": 0.9
	},
	"svip": {
		"edit_this": 0.85
	},
	"poloapi": {
		"edit_this": 1
	},
	"cardvela-caca": {
		"edit_this": 1
	},
	"claude-官": {
		"edit_this": 1
	},
	"claude aws 官": {
		"edit_this": 1
	},
	"Claude-code": {
		"edit_this": 1
	},
	"cur-claude": {
		"edit_this": 1
	}
}


完整版分组特殊可用分组：
{
	"vip": {
		"append_1": "vip"
	},
	"svip": {
		"append_1": "vip",
		"append_2": "svip"
	},
	"poloapi": {
		"append_1": "poloapi"
	},
	"cardvela-caca": {
		"append_1": "cardvela-caca"
	},
	"claude-官": {
		"append_1": "claude-官"
	},
	"claude aws 官": {
		"append_1": "claude aws 官"
	},
	"Claude-code": {
		"append_1": "Claude-code"
	},
	"cur-claude": {
		"append_1": "cur-claude"
	}
}


# 最推荐你现在直接粘贴用的就是上面这四段。
#
# 下面是后台实际使用建议：
# - 走 PoloAPI 的渠道：group 填 poloapi
# - 走自己号池的渠道：group 填 cardvela-caca
# - 走官方 Claude 渠道：group 填 claude-官
# - 走 Claude AWS 官方渠道：group 填 claude aws 官
# - 走 Claude Code 渠道：group 填 Claude-code
# - 走 cur-claude 渠道：group 填 cur-claude
#
# 如果某个套餐只想命中特定渠道组，CardVela 后台 AI Tier 的 channelGroup 也要填同名字符串。


==================================================
new-api 最终只填这两个（完整可选版）
2026-04-02
==================================================

# 1. 粘贴到“分组倍率”输入框：
{
	"default": 1,
	"vip": 1,
	"svip": 1,
	"poloapi": 1,
	"cardvela-caca": 1,
	"claude-官": 1,
	"claude aws 官": 1,
	"Claude-code": 1,
	"cur-claude": 1
}


# 2. 粘贴到“用户可选分组”输入框：
{
	"default": "默认分组",
	"vip": "VIP分组",
	"svip": "SVIP分组",
	"cardvela-caca": "CardVela号池",
	"claude-官": "Claude官号",
	"claude aws 官": "Claude AWS官号",
	"Claude-code": "Claude Code",
	"cur-claude": "Cur Claude"
}


# 说明：
# - 这是你当前要的“完整版”
# - 分组倍率和用户可选分组都包含全部分组
# - 如果后面不想让普通用户看到这些上游分组，再改回精简版


==================================================
Copilot 号池渠道模型探测与录入
2026-04-02
==================================================

# 目标：
# - 先在服务器本机测试 4141 号池实例能返回哪些模型
# - 把返回的模型整理成两种格式
# - 再把模型填进 new-api 新建渠道的“模型”输入框
#
# 这里吃过亏：模型名称不要只填一种格式。
# 同一个模型建议同时填：
# - 原始 ID 格式：claude-opus-4
# - 兼容别名格式：Claude opus-4 / Claude opus4
#
# 如果未来服务端实际返回的是 claude-opus-4-6，
# 那就同时写：
# - claude-opus-4-6
# - Claude opus-4-6
# - Claude opus4.6


==================================================
步骤 1：先在服务器测试 4141 号池实例能否返回模型
==================================================

# 先确认实例在监听
ss -lntp | grep 4141

# 如果这里没有任何输出，不是模型接口有问题，而是 4141 上没有号池实例在运行。
# 这时要先确认：
# 1. CardVela 后台「Copilot账号池」里是否已经录入真实 GitHub Copilot 账号 token
# 2. 服务器上是否已经启动 copilot-api 实例

# 正确理解：
# - GitHub Copilot 账号 token 是给 copilot-api 启动时用的
# - 不是填在 new-api 渠道“密钥”输入框里的
# - scripts/copilot-pool.sh 实际是这样启动的：
#   npx copilot-api start --port "$port" --token "$token"

# 如果“还未录入” Copilot 账号 token，先做这一步：
# 1. 打开 CardVela 后台 → Copilot账号池管理
# 2. 新增一条 Copilot 账号
# 3. 至少要填：
#    - GitHub ID
#    - GitHub Copilot 账号 token
# 4. 保存后再回服务器执行下面这几条启动命令

# 如果刚录入了 Copilot 账号 token，先启动号池实例：
cd /opt/cardvela
bash scripts/copilot-pool.sh start
bash scripts/copilot-pool.sh status
ss -lntp | grep 4141

# 直接拉模型列表（很多兼容 OpenAI 的服务支持这个接口）
curl -s http://127.0.0.1:4141/v1/models \
	-H "Authorization: Bearer sk-test" \
	| tee /tmp/cardvela-caca-models.json

# 如果上面没返回，再试一次不带 Bearer
curl -s http://127.0.0.1:4141/v1/models \
	| tee /tmp/cardvela-caca-models-noauth.json

# 从 JSON 里提取模型 ID（需要服务器有 jq）
cat /tmp/cardvela-caca-models.json | jq -r '.data[].id' | sort -u

# 如果没有 jq，就直接看原始 JSON
cat /tmp/cardvela-caca-models.json


==================================================
步骤 2：把返回模型整理成可录入格式
==================================================

# 先把原始模型 ID 单独导出来
cat /tmp/cardvela-caca-models.json | jq -r '.data[].id' | sort -u > /tmp/cardvela-caca-model-ids.txt
cat /tmp/cardvela-caca-model-ids.txt

# 你最终要填入 new-api 渠道“模型”输入框时，建议按下面规则整理：
#
# 规则 A：原始 ID 保留
# 例如：claude-opus-4
#
# 规则 B：再补一个带大写品牌名的兼容写法
# 例如：Claude opus-4
#
# 规则 C：如果是 Claude 版本号，还再补一个去掉中划线的兼容写法
# 例如：Claude opus4
# 例如：Claude sonnet4
# 例如：Claude opus4.6


==================================================
步骤 3：按当前仓库默认白名单，先可直接填这份模型
==================================================

# 这是仓库当前写死给 copilot 渠道同步用的基础模型：
# - claude-sonnet-4
# - claude-opus-4
# - gpt-4o
# - gpt-4
# - gemini-2.5-pro
# - o3-mini
# - o4-mini

# new-api 渠道“模型”输入框建议先填下面这份：
# （原始 ID + 兼容写法一起填，逗号分隔）

claude-sonnet-4,Claude sonnet-4,Claude sonnet4,claude-opus-4,Claude opus-4,Claude opus4,gpt-4o,GPT-4o,gpt-4,GPT-4,gemini-2.5-pro,Gemini 2.5 Pro,o3-mini,O3 Mini,o4-mini,O4 Mini


==================================================
步骤 4：如果服务器实际返回了更多 Claude 模型，就按这个模板追加
==================================================

# 如果返回：claude-opus-4-1
# 追加写法：
# claude-opus-4-1,Claude opus-4-1,Claude opus4.1

# 如果返回：claude-opus-4-5
# 追加写法：
# claude-opus-4-5,Claude opus-4-5,Claude opus4.5

# 如果返回：claude-opus-4-6
# 追加写法：
# claude-opus-4-6,Claude opus-4-6,Claude opus4.6

# 如果返回：claude-sonnet-4-1
# 追加写法：
# claude-sonnet-4-1,Claude sonnet-4-1,Claude sonnet4.1

# 如果返回：claude-sonnet-4-5
# 追加写法：
# claude-sonnet-4-5,Claude sonnet-4-5,Claude sonnet4.5


==================================================
步骤 5：创建号池渠道时各字段怎么填
==================================================

类型：OpenAI
名称：cardvela-caca-01
密钥：先随便填（如果当前不校验）
组织：留空
API 地址：http://127.0.0.1:4141
模型：先填上面那串基础模型；如果步骤 1 拉到了更多模型，再把更多模型按双格式补进去
分组：cardvela-caca

# 重点：
# - new-api 渠道“密钥”可以先随便填（如果当前版本不校验）
# - 真正关键的是 Copilot 账号 token 已经录入 CardVela 后台，并且 4141 实例已启动


==================================================
步骤 6：创建后马上验证
==================================================

# 拿到 new-api 渠道后，最好在服务器再测一次 4141 真实可用模型
curl -s http://127.0.0.1:4141/v1/models -H "Authorization: Bearer sk-test"

# 如果你想核对某个模型是否真的能调用，后面可以再测 chat/completions。

# 安全提醒：
# - GitHub token 不要写进仓库文件
# - 如果 token 已在聊天窗口明文发出，建议立刻去 GitHub 后台撤销并重新生成