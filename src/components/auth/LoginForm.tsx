'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setMessage({ type: 'error', text: '请填写邮箱和密码' });
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
      console.log('登录响应:', { status: res.status, data });

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || '登录失败' });
        setLoading(false);
        return;
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
        console.log('Token 已保存');
      }

      setMessage({ type: 'success', text: '登录成功！正在跳转...' });
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (error: any) {
      console.error('登录错误:', error);
      setMessage({ type: 'error', text: error.message || '登录失败' });
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">登录</h1>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
          <input
            type="email"
            placeholder="请输入邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
          <input
            type="password"
            placeholder="请输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium mt-6"
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </div>

      <p className="text-center mt-6 text-gray-600">
        没有账户？<Link href="/register" className="text-blue-600 hover:underline font-medium">注册</Link>
      </p>
    </div>
  );
}
