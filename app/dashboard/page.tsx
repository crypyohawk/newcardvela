export const dynamic = 'force-dynamic';

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  balance: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      router.push('/login');
      return;
    }

    // 直接获取用户信息
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        console.log('API /me 响应:', data);
        if (data.user) {
          setUser(data.user);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('获取用户信息失败:', err);
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl">加载中...</p>
          <p className="text-sm text-gray-500 mt-2">正在获取用户信息</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">
          欢迎{user ? `, ${user.username}` : '来到 CardVela'}
        </h1>
        
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">我的卡片</h2>
            <p className="text-3xl font-bold text-blue-600">0</p>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">账户余额</h2>
            <p className="text-3xl font-bold text-green-600">¥{user?.balance?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">推荐奖励</h2>
            <p className="text-3xl font-bold text-purple-600">¥0.00</p>
          </div>
        </div>

        <button 
          onClick={() => {
            localStorage.removeItem('token');
            router.push('/login');
          }}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          退出登录
        </button>
      </div>
    </div>
  );
}
