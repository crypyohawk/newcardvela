// 海外 AI 订阅教程 — 数据结构与默认内容
// 管理员可通过 /admin/guide 页面覆盖每个章节的内容，存储在 SystemConfig 表中

export interface GuideLink {
  text: string;
  url: string;
}

export interface GuideStep {
  title: string;
  icon?: string;
  content: string;
  /** 有序材料/要素列表，每项一行 */
  materials?: string[];
  /** 可点击链接按钮 */
  links?: GuideLink[];
  /** 绿色注意事项列表 */
  tips?: string[];
  /** 红色警告框 */
  warning?: string;
}

export interface GuideSection {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  /** 官方网站链接，在章节标题区显示为按钮 */
  officialUrl?: string;
  /** 订阅价格展示文字 */
  price?: string;
  /** Tailwind 渐变色类名 */
  color: string;
  steps: GuideStep[];
}

// ────────────────────────────────────────────────────────────────────
// 默认内容（管理员未配置时显示此内容）
// ────────────────────────────────────────────────────────────────────
export const DEFAULT_GUIDE_SECTIONS: GuideSection[] = [
  // ── 0. 订阅前必读 ─────────────────────────────────────────────────
  {
    id: 'preparation',
    icon: '🧰',
    title: '订阅前必读',
    subtitle: '三分钟了解关键准备，避免踩坑',
    color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30',
    steps: [
      {
        title: '你需要准备的三大工具',
        icon: '📋',
        content:
          '订阅任何海外 AI 服务，都需要提前备齐三样东西：① 能访问海外网站的网络工具（VPN）；② 支持国际支付的虚拟卡；③ 一个干净的海外邮箱。三者缺一不可，否则注册或支付大概率失败。',
        materials: [
          '① 海外邮箱 —— 首选 Gmail，注册成功率最高；Outlook 次之；国内邮箱（QQ/163）成功率极低',
          '② VPN / 代理节点 —— 首选美国（US）节点；Claude 不支持香港 IP；ChatGPT 港/台可用',
          '③ 本平台虚拟卡 —— 支持 Visa / Mastercard，预付卡模式，开卡即用',
        ],
        tips: [
          '同一次绑卡操作全程保持同一台设备、同一个 IP、同一个邮箱',
          '在浏览器无痕/隐私模式（Incognito）中操作，减少 Cookie 干扰',
          'IP 所在州与账单地址所在州保持一致，支付成功率最高',
          '开始之前访问 whatismyip.com 确认当前 IP 的所在国家和州',
        ],
      },
      {
        title: '虚拟卡绑卡通用填写规范',
        icon: '💳',
        content:
          '以下是所有海外平台绑定虚拟卡时的通用填写规范，每次绑卡前请对照核查。',
        materials: [
          '卡号（Card Number）：填写完整 16 位数字，在本平台「我的卡片」页面查看',
          '有效期（Expiry Date）：格式 MM/YY，如"09/27"表示 2027 年 9 月到期',
          'CVV / CVC / 安全码：3 位数字，在卡片详情页查看',
          '持卡人姓名（Name on Card）：英文姓名，推荐 "名 姓" 格式，如 "John Smith"，不含中文',
          '账单地址第一行（Address Line 1）：美国街道地址，如 "350 Fifth Avenue"',
          '城市（City）：与街道地址匹配的城市名，如 "New York"',
          '州（State）：与 VPN 节点所在州一致，如纽约节点选 "NY"',
          '邮编（ZIP Code）：5 位数字，必须与城市精确匹配',
          '国家（Country）：选择 "United States"',
        ],
        tips: [
          '账单地址必须是真实存在的美国地址，可用 Google Maps 验证',
          '卡内余额要比订阅金额多 $3～5，预留预授权扣款缓冲',
          '绑卡失败后不要立刻重试，等 5～10 分钟或换一个 VPN 节点再尝试',
          '多次失败后，尝试在无痕窗口清除状态后重新操作',
        ],
        warning:
          '切勿填写虚假地址（如全零邮编、随意编造的街道名），会直接导致支付被平台风控拒绝。建议用 Google Maps 验证地址真实性。',
      },
      {
        title: '账单地址速查表',
        icon: '🏠',
        content:
          '以下是按美国各州整理的示例账单地址，可直接复制使用。选择与你 VPN 节点所在州相同的地址效果最好。',
        materials: [
          '加州 CA（美西节点）：123 Main Street, Los Angeles, CA 90001',
          '纽约 NY（美东节点）：350 Fifth Avenue, New York, NY 10001',
          '德州 TX（中南部节点）：1234 Elm Street, Austin, TX 73301',
          '华盛顿州 WA（西北节点，无州税）：1 Microsoft Way, Redmond, WA 98052',
          '德拉瓦州 DE（无州税，通用）：2711 Centerville Road, Wilmington, DE 19808',
          '伊利诺伊 IL（中部节点）：233 S Wacker Dr, Chicago, IL 60606',
          '弗吉尼亚 VA（美东节点）：1680 Capital One Dr, McLean, VA 22102',
        ],
        tips: [
          '不确定 VPN 节点在哪个州时，访问 whatismyip.com 查看 IP 归属地',
          'ZIP Code 必须与地址对应，可在 usps.com/zip4 查询精确邮编',
          '部分平台对德拉瓦州（DE）账单地址接受度最高（公司注册多、风控友好）',
        ],
        links: [
          { text: '🔍 查询当前 IP 位置', url: 'https://whatismyip.com' },
          { text: '📮 美国邮编查询', url: 'https://tools.usps.com/zip-code-lookup.htm' },
        ],
      },
      {
        title: '账号安全与续费注意事项',
        icon: '🔐',
        content:
          '海外 AI 账号一旦被封，往往无法申诉且已缴费不退。养成以下习惯可大幅降低封号风险，并保证月度续费不中断。',
        tips: [
          '固定使用同一个 VPN 节点或地区，避免频繁切换国家或地区',
          '开启双因素验证（2FA），使用 Google Authenticator App 而非短信验证（更安全）',
          '不要将账号共享给他人，多设备共享是被封号的首要原因',
          '不要在账号上绑定中国大陆手机号',
          '每月续费日前 2～3 天检查卡内余额是否充足',
          '暂停使用时提前在平台"取消自动续费"（Cancel Subscription），避免被扣费后账号出问题',
        ],
      },
    ],
  },

  // ── 1. ChatGPT ────────────────────────────────────────────────────
  {
    id: 'chatgpt',
    icon: '💬',
    title: 'ChatGPT / OpenAI',
    subtitle: 'OpenAI 出品 · $20/月 · 使用最广泛的 AI',
    officialUrl: 'https://chat.openai.com',
    price: '$20/月（Plus）',
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
    steps: [
      {
        title: '第一步：准备材料清单',
        icon: '📋',
        content:
          '在开始注册前，请确认以下材料全部准备好。材料不全会导致注册失败或支付被拒，事先检查可节省大量时间。',
        materials: [
          '① 邮箱账号 —— 强烈推荐 Gmail；Outlook / Proton Mail 也可用；国内邮箱基本不可用',
          '② 美区 VPN 节点 —— ChatGPT 已封锁中国大陆、香港等地，需要美国节点（洛杉矶/纽约推荐）',
          '③ 本平台虚拟卡 —— Visa 或 Mastercard 预付卡均可',
          '④ 卡内余额 ≥ $22 —— OpenAI 会先扣 $1 预授权验证，再扣 $20 订阅费',
          '⑤ 手机号（可选）—— 部分地区注册时需要短信验证，可使用接码平台',
        ],
        links: [
          { text: '🌐 ChatGPT 官网', url: 'https://chat.openai.com' },
          { text: '📱 接码平台（sms-activate）', url: 'https://sms-activate.org' },
        ],
        tips: [
          '注册前关闭所有隐私类浏览器插件（如 uBlock、AdGuard），它们可能干扰注册',
          '在无痕/隐私窗口中操作，避免旧 Cookie 带来的地区判断错误',
        ],
      },
      {
        title: '第二步：注册 OpenAI 账号',
        icon: '📝',
        content:
          '确认 VPN 已连接到美国节点后，访问 chat.openai.com → 点击右上角 "Sign up"。推荐选择"Continue with Google"用 Gmail 直接授权，这是最快的方式，无需验证邮箱。如选择邮箱注册，OpenAI 会发送验证邮件，点击邮件中的链接完成验证。',
        tips: [
          '用 Google 账号直接授权登录最省事，整个注册过程不到 1 分钟',
          '邮箱注册时如果长时间未收到验证邮件，检查垃圾邮件文件夹',
          '注册时选择用途，随意选择 "Personal use" 即可',
          '如注册页面提示 "OpenAI\'s services are not available in your country"，说明 VPN 节点失效，请切换节点',
        ],
        warning:
          '如注册时需要手机号验证，不要使用中国大陆号码。推荐使用接码平台（sms-activate.org）购买一个美国或其他国家的临时号码，费用约 $0.5。',
      },
      {
        title: '第三步：进入支付页面',
        icon: '💰',
        content:
          '注册成功并登录 ChatGPT 后：点击左下角头像 / 名字 → "Upgrade plan" → 选择 "ChatGPT Plus"（$20/月）→ 点击 "Subscribe" 进入 Stripe 支付页面。',
        tips: [
          '如果找不到升级入口，也可以直接访问 chat.openai.com/account/upgrade',
          '支付页面由 Stripe 托管，加载时确保 VPN 仍处于连接状态',
        ],
        links: [
          { text: '⬆️ 直接进入升级页面', url: 'https://chat.openai.com/account/upgrade' },
        ],
      },
      {
        title: '第四步：填写虚拟卡信息',
        icon: '💳',
        content:
          '在 Stripe 支付页面，按以下规范逐项填写虚拟卡信息（所有信息在本平台「我的卡片」页面查看）：',
        materials: [
          '卡号（Card number）：16 位数字，例如 4111 1111 1111 1111',
          '有效期（MM / YY）：如 09/27，代表 2027 年 9 月',
          'CVC：3 位安全码',
          '持卡人姓名（Name on card）：英文姓名，如 "John Smith"，不含中文字符',
          '账单地址第一行（Address）：真实美国街道地址',
          '城市（City）：如 "Los Angeles"',
          '州（State）：选择与 VPN 节点匹配的州，如加州节点选 "California"',
          '邮编（ZIP）：5 位数字，与城市精确匹配，如洛杉矶填 "90001"',
          '国家：选择 "United States"',
        ],
        tips: [
          '账单地址所在州建议与 VPN 节点所在州保持一致，效果最好',
          '卡内余额必须 ≥ $22（$20 订阅 + $1 预授权 + $1 缓冲）',
          '账单姓名随意填写英文名即可，不需要与护照完全一致',
        ],
        warning:
          '如出现 "Your card has been declined"，按顺序排查：① 卡余额不足；② 账单地址不真实或与 IP 不匹配；③ VPN 节点 IP 被标记为高风险（换节点后等 10 分钟再试）。',
      },
      {
        title: '第五步：确认订阅成功',
        icon: '✅',
        content:
          '支付成功后返回 ChatGPT 主页。在新建对话时，顶部模型下拉菜单中应出现 "GPT-4o"、"o1"、"o3-mini" 等 Plus 专属模型。若未立即刷新，等待 2～5 分钟后刷新页面，或退出重新登录。',
        tips: [
          '点击左下角头像 → "Settings" → "Manage Subscription" 可查看订阅详情和下次续费日期',
          '如需使用 API（配合 Cursor 等工具），需要在 platform.openai.com 单独充值',
          '建议记录下次续费日期，提前 3 天检查卡余额',
        ],
        links: [
          { text: '⚙️ OpenAI API Platform', url: 'https://platform.openai.com' },
        ],
      },
    ],
  },

  // ── 2. Claude ─────────────────────────────────────────────────────
  {
    id: 'claude',
    icon: '🤖',
    title: 'Claude / Anthropic',
    subtitle: 'Anthropic 出品 · $20/月 · 编程写作首选',
    officialUrl: 'https://claude.ai',
    price: '$20/月（Pro）',
    color: 'from-orange-500/20 to-amber-500/10 border-orange-500/30',
    steps: [
      {
        title: '第一步：准备材料清单',
        icon: '📋',
        content:
          'Claude 是 Anthropic 公司的 AI，在编程、长文档分析、写作等领域表现极为出色，被许多开发者视为最强 AI。注册前请准备好以下材料：',
        materials: [
          '① Gmail 邮箱 —— Claude 支持 Google 账号直接登录，无需手机号验证',
          '② 美区 VPN 节点 —— Claude 已限制中国大陆 + 香港访问',
          '③ 本平台虚拟卡 —— Visa 或 Mastercard 均可',
          '④ 卡内余额 ≥ $22 —— $20 订阅费 + $1 预授权 + $1 缓冲',
        ],
        links: [
          { text: '🌐 Claude 官网', url: 'https://claude.ai' },
        ],
        tips: [
          'Claude 注册最省事：无需手机号，直接 Google 账号登录即可',
          '注册完成后先用免费版测试一下，确认账号可以正常对话再升级',
        ],
      },
      {
        title: '第二步：注册 Claude 账号',
        icon: '📝',
        content:
          '保持 VPN 连接，访问 claude.ai → 点击 "Continue with Google" 用 Gmail 一键登录（最推荐），或点击 "Sign up with email" 进行邮箱注册（需要点击验证邮件中的链接）。登录成功后即可体验免费版 Claude。',
        tips: [
          '用 Google 账号登录最快，整个过程不到 30 秒',
          '如果页面显示 "Claude is not available in your region"，更换 VPN 节点后刷新',
          '免费版 Claude 有每日消息次数限制，升级 Pro 可无限使用',
        ],
      },
      {
        title: '第三步：升级 Claude Pro 并绑卡',
        icon: '💳',
        content:
          '在 Claude 主页 → 右下角 "Upgrade to Claude Pro" → 选择月付方案（$20/月）→ 进入 Stripe 支付页面，按以下规范填写虚拟卡信息：',
        materials: [
          '卡号：16 位虚拟卡号',
          '有效期：MM/YY 格式',
          'CVC：3 位安全码',
          '持卡人姓名：英文姓名（如 "Jane Doe"）',
          '账单地址：真实美国街道地址',
          '示例（旧金山节点，加州）：350 Pine Street, San Francisco, CA 94104',
          '示例（纽约节点）：1 World Trade Center, New York, NY 10007',
        ],
        tips: [
          'Claude 支付由 Stripe 托管，稳定性高，成功率通常高于 OpenAI',
          '账单地址所在州建议与 VPN 节点匹配（旧金山节点 → 加州 CA）',
          '填写账单姓名时不要包含任何中文字符或特殊符号',
        ],
        warning:
          'Claude Pro 按月自动续费。若不想续费，必须在下次续费日前主动在 Settings → Billing → Cancel Subscription 取消，否则下月仍会扣费。',
      },
      {
        title: '第四步：API Key 获取（开发者）',
        icon: '🔑',
        content:
          '如果你需要在 Cursor、Claude Code、Cline、Continue 等编程工具中直接调用 Claude API，需要在 console.anthropic.com 注册并单独充值 API 额度（与 Pro 订阅分开计费）。',
        materials: [
          'API 最低充值 $5，按 Token 用量计费',
          'Sonnet 系列：性价比最高，推荐日常开发使用',
          'Opus 系列：能力最强，适合复杂推理任务（价格较高）',
          'Haiku 系列：速度最快、价格最低，适合简单任务和大量调用',
        ],
        links: [
          { text: '🔗 Anthropic API Console', url: 'https://console.anthropic.com' },
        ],
        tips: [
          '在 Console → API Keys → Create Key 生成密钥，妥善保管',
          '也可以使用本平台 AI API 中转服务，无需 VPN 直连，价格更优惠',
        ],
      },
    ],
  },

  // ── 3. Gemini ─────────────────────────────────────────────────────
  {
    id: 'gemini',
    icon: '✨',
    title: 'Gemini / Google',
    subtitle: 'Google 出品 · $19.99/月 · 多模态 + 2TB 云盘',
    officialUrl: 'https://gemini.google.com',
    price: '$19.99/月（Google One AI Premium）',
    color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30',
    steps: [
      {
        title: '第一步：准备材料清单',
        icon: '📋',
        content:
          'Gemini 直接使用 Google 账号访问，无需单独注册。订阅 Google One AI Premium 后可解锁 Gemini Ultra 最强模型，同时获赠 2TB Google Drive 空间，性价比非常高。',
        materials: [
          '① Gmail / Google 账号 —— 已有 Google 账号即可，无需单独注册',
          '② 美区 VPN 节点 —— 部分地区无法访问 Gemini Advanced',
          '③ 本平台虚拟卡 —— Visa 或 Mastercard 均可',
          '④ 卡内余额 ≥ $22 —— 订阅费 $19.99 + 预授权缓冲',
        ],
        links: [
          { text: '✨ Gemini 官网', url: 'https://gemini.google.com' },
        ],
        tips: [
          '确保 Google 账号未绑定中国大陆手机号，否则可能限制支付',
          '订阅后同时获得 2TB Google Drive 存储，比单独购买存储套餐划算很多',
        ],
      },
      {
        title: '第二步：进入 Gemini 并点击升级',
        icon: '📝',
        content:
          '使用 Gmail 登录 gemini.google.com，进入页面后点击左侧 "Get Gemini Advanced" 或顶部的 "Try Gemini Advanced" 按钮，跳转至 Google One 订阅页面，选择 AI Premium 套餐。',
        tips: [
          '如果页面提示 "Not available in your country"，切换到美区 VPN 节点后刷新',
          '首次访问可能需要同意 Google 服务条款，按提示操作即可',
        ],
        warning:
          '部分较旧的 Google 账号需要先在 pay.google.com 添加一张支付方式，才能看到订阅选项。按提示操作添加虚拟卡后再尝试订阅。',
      },
      {
        title: '第三步：填写虚拟卡信息',
        icon: '💳',
        content:
          '在 Google 支付页面，点击 "Add payment method" → "Add credit or debit card"，按以下规范填写：',
        materials: [
          '卡号：16 位虚拟卡号',
          '有效期：MM/YY 格式',
          'CVC：3 位安全码',
          '持卡人姓名：英文姓名',
          '账单地址：真实美国地址（Google Pay 验证较严格，地址必须真实）',
          '示例（加州节点）：1600 Amphitheatre Pkwy, Mountain View, CA 94043',
          '示例（纽约节点）：30 Hudson Yards, New York, NY 10001',
        ],
        tips: [
          'Google Pay 对账单地址验证最为严格，建议用 Google Maps 确认地址真实存在后再填',
          '账单州与 VPN 节点州一致（加州节点 → CA，纽约节点 → NY）',
          '绑卡成功后回到 Google One 页面完成订阅流程',
        ],
      },
      {
        title: '第四步：Gemini API（开发者）',
        icon: '🔑',
        content:
          '开发者可在 Google AI Studio 免费获取 Gemini API Key，有每分钟和每日调用上限。如需更高配额，通过 Google Cloud 开通付费版。',
        materials: [
          'Gemini 1.5 Flash：速度最快、价格最低，适合日常大量调用',
          'Gemini 1.5 Pro：上下文最长（200万 Token），适合超长文档',
          'Gemini 2.0 / 2.5 Pro：最新最强模型，适合复杂推理',
        ],
        links: [
          { text: '🔗 Google AI Studio（免费 API）', url: 'https://aistudio.google.com' },
        ],
        tips: [
          '免费版 API 对个人开发者基本够用，限流后等一分钟继续',
          '推荐使用本平台 AI API 中转服务，无需配置 GCP，更简单',
        ],
      },
    ],
  },

  // ── 4. Grok ───────────────────────────────────────────────────────
  {
    id: 'grok',
    icon: '🦾',
    title: 'Grok / xAI',
    subtitle: 'xAI 出品 · $30/月 · 实时联网深度推理',
    officialUrl: 'https://grok.com',
    price: '$30/月（SuperGrok）',
    color: 'from-purple-500/20 to-violet-500/10 border-purple-500/30',
    steps: [
      {
        title: '第一步：准备材料清单',
        icon: '📋',
        content:
          'Grok 是 Elon Musk 旗下 xAI 公司开发的 AI，内置实时互联网搜索和超强推理能力。Grok 账号与 X（原 Twitter）账号绑定，也可用邮箱单独注册。',
        materials: [
          '① X（Twitter）账号，或可注册的邮箱',
          '② 美区 VPN 节点（部分地区访问受限）',
          '③ 本平台虚拟卡 —— Visa 或 Mastercard',
          '④ 卡内余额 ≥ $33（月付 $30 + 预授权缓冲）',
        ],
        links: [
          { text: '🦾 Grok 官网', url: 'https://grok.com' },
          { text: '🐦 X (Twitter)', url: 'https://x.com' },
        ],
        tips: [
          '没有 X 账号也可以在 grok.com 直接用邮箱注册',
          'Grok 免费版可以体验，有每日消息上限',
          '年付（$300/年）比月付（$30/月）节省约 $60',
        ],
      },
      {
        title: '第二步：登录并进入订阅页面',
        icon: '📝',
        content:
          '访问 grok.com，用 X 账号或邮箱登录。进入主界面后，点击左下角或菜单中的 "Get SuperGrok"，选择 Monthly（$30/月）或 Annual（$300/年）方案。',
        tips: [
          '年付更划算，如果预期使用超过 5 个月，年付更合算',
          'SuperGrok 包含：Grok 3、Deep Search（深度搜索）、图像生成、更多消息配额',
        ],
        warning:
          'Grok 风控较严，绑卡时 IP 必须稳定。不要使用公共共享节点，推荐独享 IP 节点；绑卡失败后等 15 分钟再重试。',
      },
      {
        title: '第三步：填写虚拟卡信息',
        icon: '💳',
        content:
          '在支付页面按以下规范填写虚拟卡信息（格式与通用规范相同）：',
        materials: [
          '卡号：16 位虚拟卡号',
          '有效期：MM/YY 格式',
          'CVV：3 位安全码',
          '持卡人姓名：英文姓名',
          '账单地址：真实美国地址，与 VPN 节点所在州一致',
          '示例（德克萨斯节点）：1234 Elm Street, Austin, TX 73301',
          '示例（加州节点）：500 Terry Francois Street, San Francisco, CA 94158',
        ],
        tips: [
          '绑卡失败时，换一个不同的美区节点（如从西海岸换到东海岸）',
          '每次尝试之间等待 15 分钟，避免频繁触发风控',
        ],
      },
      {
        title: '第四步：xAI API（开发者）',
        icon: '🔑',
        content:
          '访问 console.x.ai 注册 xAI API，新用户有免费额度。Grok 系列模型支持实时互联网搜索和超长上下文，适合需要最新信息的任务。',
        materials: [
          'Grok 3：最新最强，支持 131K Token 上下文',
          'Grok 3 Mini：速度更快，价格更低，适合日常调用',
          'Live Search：内置实时网络搜索，可获取当日最新数据',
        ],
        links: [
          { text: '🔗 xAI API Console', url: 'https://console.x.ai' },
        ],
        tips: [
          '目前 API 主要面向开发者，部分功能需申请访问权限',
          'Grok 内置联网搜索能力是其最大优势，特别适合分析时事和最新数据',
        ],
      },
    ],
  },

  // ── 5. Cursor ─────────────────────────────────────────────────────
  {
    id: 'cursor',
    icon: '🖥️',
    title: 'Cursor',
    subtitle: '最受开发者欢迎的 AI 编程 IDE · $20/月',
    officialUrl: 'https://cursor.com',
    price: '$20/月（Pro）',
    color: 'from-cyan-500/20 to-sky-500/10 border-cyan-500/30',
    steps: [
      {
        title: '第一步：准备材料清单',
        icon: '📋',
        content:
          'Cursor 是基于 VS Code 的 AI 编程 IDE，内置 GPT-4o、Claude 3.5、Gemini 等顶级模型，是目前最受开发者欢迎的 AI 编程工具。Cursor 本体可在国内直接下载和使用，只有在订阅时需要 VPN。',
        materials: [
          '① 任意邮箱 —— Cursor 对邮箱类型无要求，Gmail / Outlook / 国内邮箱均可注册',
          '② VPN（仅绑卡时需要）—— Cursor 日常使用无需 VPN，只在 cursor.com 付款时需要',
          '③ 本平台虚拟卡 —— Visa 或 Mastercard 均可',
          '④ 卡内余额 ≥ $22 —— $20 订阅费 + 预授权缓冲',
        ],
        links: [
          { text: '⬇️ 下载 Cursor', url: 'https://cursor.com/download' },
          { text: '🌐 Cursor 官网', url: 'https://cursor.com' },
        ],
        tips: [
          'Cursor 日常使用完全不需要 VPN，国内直连，速度快',
          '只有在 cursor.com 账单页面付款时需要短暂挂 VPN',
          '已有 VS Code 扩展和设置可一键导入到 Cursor',
        ],
      },
      {
        title: '第二步：下载安装并注册账号',
        icon: '📝',
        content:
          '访问 cursor.com/download，下载对应操作系统版本（Windows / macOS / Linux）。安装后打开 Cursor，点击右上角 "Sign In" 或启动引导中的登录按钮，用邮箱注册或直接用 Google / GitHub 账号登录。',
        tips: [
          'Cursor 免费版包含有限的 AI 使用额度（Fast Requests），可体验主要功能',
          '免费版可以使用 GPT-4o 和 Claude 3.5 Sonnet 等主流模型',
          'Tab 自动补全 / Ctrl+K 快速编辑 / Ctrl+I Agent 是三大核心功能',
          '从 VS Code 迁移时，点击 File → Preferences → Import Settings from VS Code',
        ],
      },
      {
        title: '第三步：升级 Pro 并绑定虚拟卡',
        icon: '💳',
        content:
          '挂上 VPN 访问 cursor.com → 点击右上角头像或 "Pricing" → 选择 Pro 方案 → "Get Started" → 登录账号 → 进入 Billing 页面 → 填写虚拟卡信息：',
        materials: [
          '卡号：16 位虚拟卡号',
          '有效期：MM/YY 格式',
          'CVC：3 位安全码',
          '持卡人姓名：英文姓名',
          '账单地址：真实美国地址（Cursor 使用 Stripe 支付）',
          '示例（纽约节点）：350 Fifth Avenue, New York, NY 10001',
          '示例（加州节点）：1 Infinite Loop, Cupertino, CA 95014',
        ],
        tips: [
          'Cursor 使用 Stripe 支付，成功率很高，是所有 AI 工具中绑卡最顺畅的',
          '绑卡成功后，关掉 VPN，重新打开 Cursor，Pro 功能立刻生效',
          '订阅后 Cursor 可以无限使用 AI 的 "Fast Requests" 配额',
        ],
        warning:
          '如提示 "card declined"，按顺序检查：① 卡余额是否 ≥ $22；② 账单地址是否真实；③ 当前 VPN 节点是否稳定。换节点后等 5 分钟再试。',
      },
      {
        title: '第四步：配置本平台 AI API（可选）',
        icon: '🔗',
        content:
          '订阅 Cursor Pro 后，也可以额外配置本平台 AI API，使用本平台的模型（无需 VPN，价格更低，适合高频使用）。在 Cursor 中：Ctrl+Shift+J → Models → 在 "OpenAI API Key" 下方填写本平台 Key 和 Base URL：',
        materials: [
          'API Key：在本平台「AI API」页面复制生成的密钥',
          'Base URL：填写本平台提供的 API 中转地址（形如 https://xxx.xxx.com/v1）',
          '模型：在 Model 列表中选择 GPT-4o / Claude 3.5 Sonnet / Gemini 等',
        ],
        tips: [
          '配置本平台 API 后，Cursor 所有请求走本平台中转，无需 VPN',
          'API 按 Token 计费，低频用户比月费订阅更划算',
          'Cursor Pro 和自定义 API 可以并存，根据需要切换',
        ],
      },
    ],
  },

  // ── 6. 虚拟卡使用技巧 ──────────────────────────────────────────────
  {
    id: 'card-tips',
    icon: '💳',
    title: '虚拟卡使用技巧',
    subtitle: '选卡 · 充值 · 续费 · 常见问题排查',
    color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30',
    steps: [
      {
        title: '如何选择卡片类型',
        icon: '🃏',
        content:
          '本平台提供多种虚拟卡，不同卡针对不同使用场景优化。在开卡前，先确认目标平台接受哪种卡类型。',
        materials: [
          'Visa 预付卡 —— 兼容性最广，绝大多数海外平台均支持，是首选',
          'Mastercard 预付卡 —— 兼容性与 Visa 相当，可作备选',
          '特定用途卡 —— 部分卡针对 OpenAI、广告平台等特定场景优化，成功率更高',
          '不确定时，先尝试 Visa，失败后换 Mastercard',
        ],
        tips: [
          'ChatGPT / Claude / Cursor：Visa 预付卡首选',
          'Google One：Visa 和 Mastercard 均支持',
          '广告平台（Facebook / Google Ads）：使用平台推荐的专用卡类型',
          '如不确定适合哪种卡，可以联系本平台客服获取建议',
        ],
      },
      {
        title: '充值金额建议',
        icon: '💰',
        content:
          '每次充值金额应略高于目标平台的订阅费，为预授权验证和手续费留出缓冲。建议每个服务单独开一张卡，分散风险。',
        materials: [
          'ChatGPT Plus（$20/月）→ 建议充值 $23～25',
          'Claude Pro（$20/月）→ 建议充值 $23～25',
          'Google One AI（$19.99/月）→ 建议充值 $23～25',
          'Grok SuperGrok（$30/月）→ 建议充值 $33～35',
          'Cursor Pro（$20/月）→ 建议充值 $23～25',
          '同时订阅多个时，充值金额 = 各服务金额之和 + 每个服务 $3 缓冲',
        ],
        tips: [
          '多充入 $3～5 可以应对预授权扣款（通常在 1～3 个工作日内退回）',
          '不建议在一张卡上充值过多，一旦出问题损失更大',
          '每月续费日前 3 天确认卡余额是否充足，不足时及时充值',
        ],
        warning:
          '余额不足是支付失败和续费失败的第一原因！首次订阅和每月续费前都必须检查余额。',
      },
      {
        title: '防止自动续费失败',
        icon: '🔄',
        content:
          '海外 AI 工具均为月度自动续费，每月固定日期扣款。如果扣款时余额不足，服务会立即中断，严重时可能影响账号状态。',
        tips: [
          '记录每个订阅的账单日（通常是你首次订阅的那一天），提前 3 天充值',
          '可以在各平台的 Billing 页面查看下次续费日期',
          '暂停使用时提前在平台内取消续订（Cancel），避免续费失败',
          '多次扣款失败可能导致账号被暂停，恢复时需要重新绑卡',
          '建议在续费日当天用手机/邮件提醒自己检查一下账单',
        ],
      },
      {
        title: '支付失败完整排查流程',
        icon: '🔧',
        content:
          '遇到支付失败时，不要慌张。按以下顺序逐项排查，大多数问题都能解决：',
        materials: [
          '第一步：检查卡余额 —— 登录本平台，确认卡余额 ≥ 订阅金额 + $5 缓冲',
          '第二步：检查 VPN 节点 —— 访问 whatismyip.com，确认当前 IP 在美国（或目标地区）',
          '第三步：检查账单地址 —— 确认地址格式正确、街道/城市/ZIP 三者匹配，可用 Google Maps 验证',
          '第四步：等待后重试 —— 短时间多次尝试会触发风控；换节点等 10～15 分钟后再试',
          '第五步：换无痕窗口 —— 清除 Cookie 后在全新的无痕浏览器窗口重新操作',
          '第六步：换卡类型 —— 如 Visa 失败，尝试 Mastercard；或联系客服更换特定卡类型',
          '第七步：联系客服 —— 排查所有步骤后仍失败，联系本平台客服寻求协助',
        ],
        tips: [
          '每次操作前先用 whatismyip.com 确认 IP 国家和州',
          '绑卡建议选择 IP 所在州的地址（例如加州 IP → 加州账单地址）',
          '遇到"Card declined"不要连续重试超过 3 次，否则可能短暂冻结',
        ],
        links: [
          { text: '🔍 检查当前 IP 位置', url: 'https://whatismyip.com' },
          { text: '🗺️ Google Maps 验证地址', url: 'https://maps.google.com' },
        ],
      },
      {
        title: '安全用卡好习惯',
        icon: '🔒',
        content:
          '虚拟卡卡号一旦泄露，可能被恶意使用。以下习惯可以有效降低风险。',
        tips: [
          '只在官方正规网站使用虚拟卡，不在来路不明的第三方网站绑卡',
          '不要截图保存包含完整卡号的页面，更不要发给他人',
          '每个订阅服务建议单独开一张卡，一卡一用，互不影响',
          '发现异常扣款时，立即在本平台申请冻结或注销该卡片',
          '定期检查订阅平台的账单记录，发现未知扣款立即联系客服',
        ],
      },
    ],
  },
];
