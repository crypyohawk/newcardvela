'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../src/hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();
  const { refreshUser } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Please enter email and password.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Login failed.' });
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.token);
      await refreshUser();
      router.push('/dashboard');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Login failed.' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <a href="/" aria-label="CardVela" className="inline-flex">
            <img src="/brand/cardvela-wordmark.svg" alt="CardVela" className="h-10 w-auto" />
          </a>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-center mb-6 text-white">登录账户</h1>

          {message && (
            <div className={`mb-4 p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {message.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">邮箱</label>
              <input
                type="email"
                placeholder="请输入邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">密码</label>
              <input
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition"
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-semibold py-2.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 transition-all mt-2"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </div>

          <p className="text-center mt-6 text-sm text-gray-500">
            还没有账户？ <Link href="/register" className="text-blue-400 hover:text-blue-300 transition">立即注册</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
