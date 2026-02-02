export const dynamic = 'force-dynamic';

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  balance: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      router.push('/login');
      return;
    }

    // 从 token 中提取用户信息（暂时模拟）
    setUser({
      id: 'user123',
      email: '用户邮箱',
      username: '用户名',
      role: 'user',
      balance: 0,
    });
    
    setLoading(false);
  }, [router]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">未授权</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">欢迎, {user.username}</h1>
        
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">我的卡片</h2>
            <p className="text-3xl font-bold text-blue-600">0</p>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">账户余额</h2>
            <p className="text-3xl font-bold text-green-600">¥{user.balance?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">推荐奖励</h2>
            <p className="text-3xl font-bold text-purple-600">¥0.00</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-4">账户信息</h2>
          <p className="mb-2"><strong>邮箱:</strong> {user.email}</p>
          <p className="mb-2"><strong>用户ID:</strong> {user.id}</p>
          <p><strong>角色:</strong> {user.role}</p>
        </div>
      </div>
    </div>
  );
}
