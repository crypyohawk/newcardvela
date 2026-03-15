'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [referralPrompt, setReferralPrompt] = useState<{ enabled: boolean; promptText: string } | null>(null);
  const [supportEmail, setSupportEmail] = useState('');

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.referral) setReferralPrompt(data.referral);
        if (data.supportEmail) setSupportEmail(data.supportEmail);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white font-latin overflow-hidden">
      {/* Referral banner */}
      {referralPrompt?.enabled && referralPrompt.promptText && (
        <div className="bg-gradient-to-r from-blue-600/90 to-cyan-500/90 text-center py-2.5 px-4 text-sm font-medium backdrop-blur-sm">
          🎁 {referralPrompt.promptText}
        </div>
      )}

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#0a0e1a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-sm font-black">C</div>
            <span className="text-lg font-bold tracking-tight">CardVela</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition px-4 py-2">
              登录
            </Link>
            <Link href="/register" className="text-sm bg-white text-black font-semibold px-5 py-2 rounded-full hover:bg-gray-100 transition">
              免费注册
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-blue-600/15 via-cyan-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute top-40 right-1/4 w-[200px] h-[200px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8 text-sm text-gray-300">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              全球 VISA / Mastercard 虚拟卡即时发卡
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
              <span className="bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">一张美卡</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">解决全球订阅支付</span>
            </h1>

            <p className="text-lg text-gray-400 leading-relaxed mb-10 max-w-xl mx-auto">
              ChatGPT、Claude、Gemini、Midjourney… 
              <br className="hidden sm:block" />
              无需海外银行账户，3 分钟开卡，USDT / 支付宝充值即用。
            </p>

            <div className="flex justify-center gap-3 mb-6">
              <Link href="/register" className="group bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-semibold px-8 py-3.5 rounded-full hover:shadow-lg hover:shadow-blue-500/25 transition-all text-sm">
                立即开卡
                <span className="inline-block group-hover:translate-x-1 transition-transform ml-1">→</span>
              </Link>
              <Link href="/login" className="bg-white/5 border border-white/10 text-white font-medium px-8 py-3.5 rounded-full hover:bg-white/10 transition text-sm">
                已有账户
              </Link>
            </div>
          </div>

          {/* Card visual */}
          <div className="mt-16 flex justify-center">
            <div className="relative">
              {/* Glow behind card */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-cyan-400/30 blur-2xl scale-110 rounded-3xl" />
              <div className="relative w-[340px] h-[200px] bg-gradient-to-br from-[#1a1f35] to-[#0d1120] rounded-2xl border border-white/10 p-6 shadow-2xl">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <span className="text-xs text-gray-500 tracking-widest uppercase">Virtual Card</span>
                    <p className="text-lg font-bold tracking-wider mt-1">CardVela</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg viewBox="0 0 48 32" className="w-10 h-7">
                      <circle cx="16" cy="16" r="10" fill="#EB001B" opacity="0.9"/>
                      <circle cx="32" cy="16" r="10" fill="#F79E1B" opacity="0.9"/>
                      <path d="M24 8.8a10 10 0 010 14.4 10 10 0 000-14.4z" fill="#FF5F00" opacity="0.9"/>
                    </svg>
                    <svg viewBox="0 0 48 32" className="w-10 h-7">
                      <rect fill="#1A1F71" width="48" height="32" rx="4" opacity="0.9"/>
                      <text x="24" y="20" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold" fontStyle="italic">VISA</text>
                    </svg>
                  </div>
                </div>
                <div className="text-lg tracking-[0.25em] text-gray-300 font-mono mb-4">
                  •••• •••• •••• 4285
                </div>
                <div className="flex justify-between items-end text-xs text-gray-500">
                  <span>VALID THRU 12/28</span>
                  <span className="text-green-400 font-medium">● Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported services - scrolling marquee */}
      <section className="border-y border-white/5 py-6 overflow-hidden">
        <div className="flex items-center gap-10 animate-marquee whitespace-nowrap">
          {[
            'ChatGPT', 'Claude', 'Gemini', 'Midjourney', 'GitHub Copilot', 'Netflix', 'Spotify',
            'AWS', 'Google Cloud', 'Apple Store', 'Google Play', 'Facebook Ads', 'Shopify',
            'ChatGPT', 'Claude', 'Gemini', 'Midjourney', 'GitHub Copilot', 'Netflix', 'Spotify',
            'AWS', 'Google Cloud', 'Apple Store', 'Google Play', 'Facebook Ads', 'Shopify',
          ].map((name, i) => (
            <span key={i} className="text-sm text-gray-500 font-medium tracking-wide">{name}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-3">为什么选择 CardVela</h2>
          <p className="text-gray-500">从开卡到订阅，一站式全球支付解决方案</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="group bg-white/[0.02] border border-white/5 rounded-2xl p-8 hover:border-blue-500/30 hover:bg-blue-500/[0.03] transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">3 分钟极速开卡</h3>
            <p className="text-sm text-gray-500 leading-relaxed">注册即可开通虚拟卡，支持 VISA 和 Mastercard，无需护照、无需海外银行账户。</p>
          </div>

          <div className="group bg-white/[0.02] border border-white/5 rounded-2xl p-8 hover:border-cyan-500/30 hover:bg-cyan-500/[0.03] transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">多渠道充值</h3>
            <p className="text-sm text-gray-500 leading-relaxed">支持 USDT、支付宝、微信等多种入金方式，灵活方便，全球用户均可使用。</p>
          </div>

          <div className="group bg-white/[0.02] border border-white/5 rounded-2xl p-8 hover:border-green-500/30 hover:bg-green-500/[0.03] transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">安全可控</h3>
            <p className="text-sm text-gray-500 leading-relaxed">客户端直连银行 API，充值、消费、退款、余额变动全部实时同步，无中间商隔离，费用透明可查，资金安全有保障。</p>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">覆盖全球主流支付场景</h2>
              <div className="space-y-5">
                {[
                  { icon: '🤖', title: 'AI 服务订阅', desc: 'ChatGPT Plus、Claude Pro、Gemini Advanced、Cursor、Midjourney 等' },
                  { icon: '☁️', title: '云服务 & SaaS', desc: 'AWS、Google Cloud、Azure、Vercel、Cloudflare 等' },
                  { icon: '🎬', title: '流媒体 & 娱乐', desc: 'Netflix、Spotify、YouTube Premium、Disney+ 等' },
                  { icon: '💼', title: '商业代付 & 发薪', desc: '广告投放、跨境电商、海外雇员发薪，支持小额高频场景' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-start group">
                    <div className="text-2xl mt-0.5 shrink-0">{item.icon}</div>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8">
              <h3 className="text-lg font-semibold mb-6 text-gray-300">三步开始使用</h3>
              <div className="space-y-6">
                {[
                  { step: '01', title: '注册账户', desc: '邮箱注册，1 分钟完成' },
                  { step: '02', title: '充值开卡', desc: '选择卡类型，USDT / 支付宝充值' },
                  { step: '03', title: '绑定订阅', desc: '获取卡号，绑定 ChatGPT 等服务' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400 shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold mb-0.5">{item.title}</h4>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/register" className="mt-8 w-full block text-center bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-semibold py-3 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 transition-all text-sm">
                免费注册 →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="relative bg-gradient-to-br from-blue-600/10 via-[#0a0e1a] to-cyan-500/10 rounded-3xl border border-white/5 p-12 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <h2 className="text-3xl font-bold mb-3">开启你的全球支付之旅</h2>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">无需复杂手续，注册后即可开通虚拟卡，立即订阅全球 AI 服务。</p>
              <Link href="/register" className="inline-block bg-white text-black font-semibold px-10 py-3.5 rounded-full hover:bg-gray-100 transition text-sm">
                立即开始 →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-xs font-black text-black">C</div>
              <span className="font-semibold text-sm">CardVela</span>
              <span className="text-gray-600 text-sm ml-2">© 2020</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link href="/terms" className="hover:text-gray-300 transition">服务条款</Link>
              <Link href="/privacy" className="hover:text-gray-300 transition">隐私政策</Link>
              {supportEmail && (
                <span className="text-gray-600">{supportEmail}</span>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
