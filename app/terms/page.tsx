import Link from 'next/link';

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold mb-2">服务条款</h1>
          <p className="text-sm text-gray-500">最后更新：2025 年 1 月 1 日</p>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed text-gray-400">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. 服务概述</h2>
            <p>CardVela（“本平台”）是一个提供虚拟信用卡发行与管理服务的在线平台。我们通过合作银行的 API 接口，为用户提供 VISA 和 Mastercard 虚拟卡的开通、充值、消费及提现服务。使用本平台即表示您同意以下条款。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. 使用条件</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>您必须年满 18 周岁方可使用本服务。</li>
              <li>您同意仅将虚拟卡用于合法用途，包括但不限于在线订阅、商品购买、广告投放等。</li>
              <li>禁止将虚拟卡用于任何违法、欺诈或违反发卡组织规定的活动。</li>
              <li>因违规使用导致的卡片被冻结、资金损失等后果，由用户自行承担。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. 资金与费用</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>平台收取的开卡费、充值手续费、交易费等均在开卡页面明确标注，充值前请确认。</li>
              <li>账户余额可申请提现，提现时可能产生手续费，具体费率以平台设置为准。</li>
              <li>虚拟卡余额直接连接银行 API，消费、退款、充值等变动实时同步，无中间商差价。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. 服务变更与终止</h2>
            <p>我们保留在必要时修改、暂停或终止服务的权利。服务条款的变更将在本页面更新，继续使用本服务即表示您接受更新后的条款。如因用户违规导致账户被封禁，账户内余额将按规定处理。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. 免责声明</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>本平台仅提供虚拟卡发行及管理服务，不对用户在第三方平台的交易纠纷承担责任。</li>
              <li>因不可抗力（包括但不限于网络故障、银行系统维护、政策变化等）导致的服务中断，本平台不承担赔偿责任。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. 知识产权</h2>
            <p>CardVela 平台的所有内容、功能设计及品牌标识均受知识产权法律保护，未经授权不得复制或仿制。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. 声明</h2>
            <p>CardVela 义务告知：本平台由国际授权机构发行，仅面向海外用户提供服务，用户需遵守所在地法律法规。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. 联系我们</h2>
            <p>如对本服务条款有任何疑问，请通过平台内的客服功能或访问 <Link href="/" className="text-blue-400 hover:text-blue-300 transition">cardvela.com</Link> 联系我们。</p>
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
            <span className="text-gray-300">服务条款</span>
            <Link href="/privacy" className="hover:text-gray-300 transition">隐私政策</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
