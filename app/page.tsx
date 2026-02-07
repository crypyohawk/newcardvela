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
        if (data.referral) {
          setReferralPrompt(data.referral);
        }
        if (data.supportEmail) setSupportEmail(data.supportEmail);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* 推荐提示横幅 - 只有启用时才显示 */}
      {referralPrompt?.enabled && referralPrompt.promptText && (
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-center py-3 px-4">
          <p className="font-semibold">🎁 {referralPrompt.promptText}</p>
        </div>
      )}

      {/* 导航栏 */}
      <nav className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            CardVela
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-gray-300 hover:text-white transition">登录</Link>
            <Link href="/register" className="bg-blue-600 px-5 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
              免费注册
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero 区域 */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
              CardVela
            </span>
            <br />
            <span className="text-3xl md:text-4xl text-gray-300">专注海外支付跨境支付</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            安全、便捷、高效的虚拟信用卡服务，支持全球主流支付场景，助您轻松管理国际支付
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link href="/register" className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition shadow-lg shadow-blue-600/25">
              立即开始 →
            </Link>
            <Link href="/login" className="bg-slate-700/50 border border-slate-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-slate-700 transition">
              已有账户
            </Link>
          </div>
        </div>

        {/* 特点介绍 */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700/50 hover:border-blue-500/50 transition">
            <div className="w-14 h-14 bg-blue-600/20 rounded-xl flex items-center justify-center text-3xl mb-6">💳</div>
            <h3 className="text-xl font-bold mb-3">多种卡片类型</h3>
            <p className="text-gray-400">支持 VISA、MasterCard 等多种卡片类型，满足您的各种支付需求</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700/50 hover:border-green-500/50 transition">
            <div className="w-14 h-14 bg-green-600/20 rounded-xl flex items-center justify-center text-3xl mb-6">🔒</div>
            <h3 className="text-xl font-bold mb-3">安全可靠</h3>
            <p className="text-gray-400">多重安全验证，资金安全有保障，让您的每一笔交易都安心无忧</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700/50 hover:border-purple-500/50 transition">
            <div className="w-14 h-14 bg-purple-600/20 rounded-xl flex items-center justify-center text-3xl mb-6">⚡</div>
            <h3 className="text-xl font-bold mb-3">即时开卡</h3>
            <p className="text-gray-400">快速开通虚拟卡，即刻使用，无需等待繁琐的审核流程</p>
          </div>
        </div>

        {/* 使用场景 */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">适用场景</h2>
          <p className="text-gray-400">满足您的多样化支付需求</p>
        </div>
        <div className="grid md:grid-cols-4 gap-6 mb-20">
          <div className="bg-slate-800/30 rounded-xl p-6 text-center border border-slate-700/30">
            <div className="text-4xl mb-3">🛒</div>
            <h4 className="font-semibold mb-2">海淘购物</h4>
            <p className="text-sm text-gray-400">支持 Amazon、eBay 等平台</p>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-6 text-center border border-slate-700/30">
            <div className="text-4xl mb-3">📺</div>
            <h4 className="font-semibold mb-2">订阅服务</h4>
            <p className="text-sm text-gray-400">Claudecode、Gemini、ChatGPT 等</p>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-6 text-center border border-slate-700/30">
            <div className="text-4xl mb-3">📱</div>
            <h4 className="font-semibold mb-2">应用支付</h4>
            <p className="text-sm text-gray-400">App Store、Google Play</p>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-6 text-center border border-slate-700/30">
            <div className="text-4xl mb-3">💼</div>
            <h4 className="font-semibold mb-2">商务支付</h4>
            <p className="text-sm text-gray-400">广告投放、SaaS 服务</p>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-10 text-center border border-blue-500/20">
          <h2 className="text-3xl font-bold mb-4">准备好开始了吗？</h2>
          <p className="text-gray-400 mb-8">立即注册，开启您的虚拟卡之旅</p>
          <Link href="/register" className="inline-block bg-blue-600 px-10 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition">
            免费注册账户
          </Link>
        </div>
      </div>

      {/* 页脚 */}
      <footer className="border-t border-slate-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="text-gray-400">
              © 2024 CardVela. All rights reserved.
            </div>
            <div className="flex gap-6 text-gray-400 text-sm">
              <Link href="#" className="hover:text-white transition">服务条款</Link>
              <Link href="#" className="hover:text-white transition">隐私政策</Link>
              <Link href="#" className="hover:text-white transition">联系我们</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
