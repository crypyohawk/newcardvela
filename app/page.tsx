import Link from 'next/link';

const scenarios = [
  { name: 'ChatGPT Plus', icon: '🤖', desc: 'OpenAI 订阅' },
  { name: 'Claude Pro', icon: '🧠', desc: 'Anthropic 订阅' },
  { name: 'Gemini', icon: '✨', desc: 'Google AI 订阅' },
  { name: 'Midjourney', icon: '🎨', desc: 'AI 绘图' },
  { name: 'Apple Store', icon: '🍎', desc: '应用购买' },
  { name: 'Amazon', icon: '📦', desc: '海淘购物' },
  { name: 'Netflix', icon: '🎬', desc: '流媒体' },
  { name: '更多平台', icon: '🌐', desc: '全球通用' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* 导航栏 */}
      <nav className="fixed top-0 w-full bg-slate-900/95 backdrop-blur border-b border-slate-800 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex justify-between items-center">
          <span className="text-xl font-bold">CardVela</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-gray-300 hover:text-white">
              登录
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              注册
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          全球虚拟信用卡
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          轻松订阅 ChatGPT、Claude、Gemini 等 AI 服务
        </p>
        <Link
          href="/register"
          className="inline-block bg-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700"
        >
          立即开卡
        </Link>
      </section>

      {/* 支付场景 */}
      <section className="py-16 px-4 bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">支付场景</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {scenarios.map((item, i) => (
              <div
                key={i}
                className="bg-slate-800 rounded-xl p-4 text-center hover:bg-slate-700 transition"
              >
                <div className="w-16 h-16 bg-slate-700 rounded-xl mx-auto mb-3 flex items-center justify-center text-3xl">
                  {item.icon}
                </div>
                <h3 className="font-semibold mb-1">{item.name}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 卡片产品 */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">选择您的卡片</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            {/* VISA 卡 */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="relative">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-blue-200 text-sm">新加坡发行</span>
                    <h3 className="text-xl font-bold">VISA 虚拟卡</h3>
                  </div>
                  <span className="text-2xl font-bold italic">VISA</span>
                </div>
                
                <div className="mb-6 text-sm space-y-2 text-blue-100">
                  <p>✓ 支持微信、支付宝主扫和被扫</p>
                  <p>✓ 支持 Google Pay</p>
                  <p>✓ 适合 AI 订阅、海淘购物</p>
                </div>

                <div className="border-t border-blue-400/30 pt-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-200">开卡费</span>
                      <p className="text-lg font-bold">$10.00</p>
                    </div>
                    <div>
                      <span className="text-blue-200">月费</span>
                      <p className="text-lg font-bold">$0.10</p>
                    </div>
                    <div>
                      <span className="text-blue-200">充值手续费</span>
                      <p className="text-lg font-bold">1%</p>
                    </div>
                    <div>
                      <span className="text-blue-200">交易手续费</span>
                      <p className="text-lg font-bold">1%</p>
                    </div>
                  </div>
                </div>

                <Link
                  href="/register?card=visa"
                  className="block w-full bg-white text-blue-600 text-center py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
                >
                  立即开卡
                </Link>
              </div>
            </div>

            {/* Mastercard */}
            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="relative">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-orange-200 text-sm">美国发行</span>
                    <h3 className="text-xl font-bold">Mastercard 虚拟卡</h3>
                  </div>
                  <div className="flex">
                    <div className="w-6 h-6 bg-red-500 rounded-full"></div>
                    <div className="w-6 h-6 bg-yellow-400 rounded-full -ml-2"></div>
                  </div>
                </div>
                
                <div className="mb-6 text-sm space-y-2 text-orange-100">
                  <p>✓ 美国万事达卡</p>
                  <p>✓ 全球广泛受理</p>
                  <p>✓ 适合广告投放、海外消费</p>
                </div>

                <div className="border-t border-orange-400/30 pt-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-orange-200">开卡费</span>
                      <p className="text-lg font-bold">$10.00</p>
                    </div>
                    <div>
                      <span className="text-orange-200">月费</span>
                      <p className="text-lg font-bold">$0.10</p>
                    </div>
                    <div>
                      <span className="text-orange-200">充值手续费</span>
                      <p className="text-lg font-bold">1%</p>
                    </div>
                    <div>
                      <span className="text-orange-200">交易手续费</span>
                      <p className="text-lg font-bold">1%</p>
                    </div>
                  </div>
                </div>

                <Link
                  href="/register?card=mastercard"
                  className="block w-full bg-white text-orange-600 text-center py-3 rounded-lg font-semibold hover:bg-orange-50 transition"
                >
                  立即开卡
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 费率说明 */}
      <section className="py-16 px-4 bg-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">费率说明</h2>
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-4">费用项目</th>
                  <th className="px-6 py-4">VISA</th>
                  <th className="px-6 py-4">Mastercard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr>
                  <td className="px-6 py-4">开卡费</td>
                  <td className="px-6 py-4">$10.00</td>
                  <td className="px-6 py-4">$10.00</td>
                </tr>
                <tr>
                  <td className="px-6 py-4">月费</td>
                  <td className="px-6 py-4">$0.10/月</td>
                  <td className="px-6 py-4">$0.10/月</td>
                </tr>
                <tr>
                  <td className="px-6 py-4">交易手续费</td>
                  <td className="px-6 py-4">1%</td>
                  <td className="px-6 py-4">1%</td>
                </tr>
                <tr>
                  <td className="px-6 py-4">退款手续费</td>
                  <td className="px-6 py-4">$2.00</td>
                  <td className="px-6 py-4">$2.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 开卡须知 */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">开卡须知</h2>
          <div className="bg-slate-800 rounded-xl p-6 space-y-4 text-gray-300">
            <p>
              1. 开卡后请及时充值使用，长期不使用的卡片会被自动注销。
            </p>
            <p>
              2. 请勿用于任何违法违规用途，否则将冻结账户，并追究法律责任。
            </p>
            <p>
              3. 请妥善保管卡片信息，避免泄露给他人，以防资金损失。
            </p>
            <p>4. 警告：严禁一卡多IP使用，切记：在订阅服务消费时请先确保卡内余额充足，余额不足等以上原因造成多次交易失败导致封卡冻结的自行承担责任。  </p>
            <p>5. 本平台保留最终解释权。</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800 text-center text-gray-500 text-sm">
        <p>© 2024 CardVela. All rights reserved.</p>
        <p className="mt-2">客服邮箱: support@CardVela.com | Telegram: @CardVela</p>
      </footer>
    </div>
  );
}
