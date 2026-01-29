'use client';

import { useAuth } from '../../src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>加载中...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Yeka 控制台</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">欢迎, {user.username}</span>
            <span className="text-green-600">余额: ¥{user.balance.toFixed(2)}</span>
            <button onClick={logout} className="btn-secondary">
              退出登录
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">我的卡片</h2>
            <p className="text-3xl font-bold text-blue-600">0</p>
            <a href="/cards" className="text-blue-500 text-sm mt-2 inline-block">
              查看全部 →
            </a>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">在售卡片</h2>
            <p className="text-3xl font-bold text-green-600">0</p>
            <a href="/marketplace" className="text-blue-500 text-sm mt-2 inline-block">
              去市场 →
            </a>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">交易记录</h2>
            <p className="text-3xl font-bold text-purple-600">0</p>
            <a href="/transactions" className="text-blue-500 text-sm mt-2 inline-block">
              查看全部 →
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
