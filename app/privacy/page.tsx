import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white font-latin">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#0a0e1a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-sm font-black">C</div>
            <span className="text-lg font-bold tracking-tight">CardVela</span>
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition">← 返回首页</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">隐私政策</h1>
          <p className="text-sm text-gray-500">最后更新：2025 年 1 月 1 日</p>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed text-gray-400">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. 概述</h2>
            <p>CardVela（“我们”）尊重并保护您的隐私。本隐私政策说明我们在您使用 CardVela 虚拟卡服务时，如何收集、使用和保护您的信息。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. 我们收集的信息</h2>
            <p className="mb-3">当您注册并使用本服务时，我们可能收集以下信息：</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><span className="text-white font-medium">账户信息：</span>邮箱地址、用户名、加密存储的密码。</li>
              <li><span className="text-white font-medium">交易记录：</span>充值、消费、提现等交易明细。</li>
              <li><span className="text-white font-medium">卡片信息：</span>虚拟卡号、有效期等（通过加密通道从银行 API 获取）。</li>
              <li><span className="text-white font-medium">使用数据：</span>登录时间、访问日志等技术数据。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. 信息使用方式</h2>
            <p className="mb-3">我们将收集的信息用于：</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>提供虚拟卡开通、充值、消费等核心服务。</li>
              <li>处理您的充值订单和提现申请。</li>
              <li>防欺诈、反洗钱及安全风控。</li>
              <li>优化服务体验、排查技术问题。</li>
              <li>遵守法律法规和监管要求。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. 信息共享</h2>
            <p className="mb-3">我们不会出售或出租您的个人信息。以下情况除外：</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>经您明确同意。</li>
              <li>法律法规或监管机构要求。</li>
              <li>与合作银行共享必要信息以完成卡片发行及交易处理。</li>
              <li>为保护平台及用户的合法权益。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. 数据安全</h2>
            <p>我们采取行业标准的安全措施保护您的个人信息，包括数据加密传输（TLS/SSL）、密码哈希存储、受限的数据访问权限等。但任何互联网传输方式都无法完全保证绝对安全。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. 数据保留</h2>
            <p>我们仅在提供服务所需的期限内保留您的数据。您可以随时联系客服请求删除账户及相关数据。涉及金融交易的记录可能需根据法律要求保留更长时间。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. 您的权利</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>查看我们持有的您的个人数据。</li>
              <li>请求更正或删除您的个人数据。</li>
              <li>随时注销账户并停止使用服务。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. 政策变更</h2>
            <p>我们可能不时更新本隐私政策，变更内容将在本页面发布并更新“最后更新”日期。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. 声明</h2>
            <p>CardVela 义务告知：本平台由国际授权机构发行，仅面向海外用户提供服务，用户需遵守所在地法律法规。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. 联系我们</h2>
            <p>如对本隐私政策有任何疑问，请通过平台内的客服功能或访问 <Link href="/" className="text-blue-400 hover:text-blue-300 transition">cardvela.com</Link> 联系我们。</p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-[10px] font-black">C</div>
            <span className="text-sm font-semibold">CardVela</span>
            <span className="text-gray-600 text-sm ml-2">© 2020</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/terms" className="hover:text-gray-300 transition">服务条款</Link>
            <span className="text-gray-300">隐私政策</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
