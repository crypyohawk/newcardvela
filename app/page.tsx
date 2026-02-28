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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white font-latin">
      {/* Referral banner */}
      {referralPrompt?.enabled && referralPrompt.promptText && (
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-center py-3 px-4">
          <p className="font-semibold">🎁 {referralPrompt.promptText}</p>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            <span className="logo-cn">卡维拉</span>
            <span className="ml-2 text-transparent bg-clip-text">CardVela</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-gray-300 hover:text-white transition">Login</Link>
            <Link href="/register" className="bg-blue-600 px-5 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
              Register
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
              <span className="logo-cn">卡维拉</span>
              <span className="ml-2">CardVela</span>
            </span>
            <br />
            <span className="text-3xl md:text-4xl text-gray-300">Focus on global payment & cross-border transactions</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Secure, convenient, and efficient virtual credit card services. Supports mainstream global payment scenarios, helping you easily manage international payments.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link href="/register" className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition shadow-lg shadow-blue-600/25">
              Get Started →
            </Link>
            <Link href="/login" className="bg-slate-700/50 border border-slate-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-slate-700 transition">
              Already have an account
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700/50 hover:border-blue-500/50 transition">
            <div className="w-14 h-14 bg-blue-600/20 rounded-xl flex items-center justify-center text-3xl mb-6">💳</div>
            <h3 className="text-xl font-bold mb-3">Multiple Card Types</h3>
            <p className="text-gray-400">Supports VISA, MasterCard and more to meet your various payment needs.</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700/50 hover:border-green-500/50 transition">
            <div className="w-14 h-14 bg-green-600/20 rounded-xl flex items-center justify-center text-3xl mb-6">🔒</div>
            <h3 className="text-xl font-bold mb-3">Secure & Reliable</h3>
            <p className="text-gray-400">Multiple security verifications, funds are safe and protected, every transaction is worry-free.</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700/50 hover:border-purple-500/50 transition">
            <div className="w-14 h-14 bg-purple-600/20 rounded-xl flex items-center justify-center text-3xl mb-6">⚡</div>
            <h3 className="text-xl font-bold mb-3">Instant Card Issuance</h3>
            <p className="text-gray-400">Quickly activate virtual cards and use them immediately, no lengthy approval process required.</p>
          </div>
        </div>

        {/* Use Cases */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Use Cases</h2>
          <p className="text-gray-400">Meet your diverse payment needs</p>
        </div>
        <div className="grid md:grid-cols-4 gap-6 mb-20">
          <div className="bg-slate-800/30 rounded-xl p-6 text-center border border-slate-700/30">
            <div className="text-4xl mb-3">🛒</div>
            <h4 className="font-semibold mb-2">Online Shopping</h4>
            <p className="text-sm text-gray-400">Supports Amazon, eBay and more</p>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-6 text-center border border-slate-700/30">
            <div className="text-4xl mb-3">📺</div>
            <h4 className="font-semibold mb-2">Subscription Services</h4>
            <p className="text-sm text-gray-400">Claudecode, Gemini, ChatGPT, etc.</p>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-6 text-center border border-slate-700/30">
            <div className="text-4xl mb-3">📱</div>
            <h4 className="font-semibold mb-2">App Payments</h4>
            <p className="text-sm text-gray-400">App Store, Google Play</p>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-6 text-center border border-slate-700/30">
            <div className="text-4xl mb-3">💼</div>
            <h4 className="font-semibold mb-2">Business Payments</h4>
            <p className="text-sm text-gray-400">Ad campaigns, SaaS services</p>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-10 text-center border border-blue-500/20">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-gray-400 mb-8">Register now and start your virtual card journey.</p>
          <Link href="/register" className="inline-block bg-blue-600 px-10 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition">
            Register for Free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="text-gray-400">
              © 2024 CardVela. All rights reserved.
            </div>
            <div className="flex gap-6 text-gray-400 text-sm">
              <Link href="#" className="hover:text-white transition">Terms of Service</Link>
              <Link href="#" className="hover:text-white transition">Privacy Policy</Link>
              <Link href="#" className="hover:text-white transition">Contact Us</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
