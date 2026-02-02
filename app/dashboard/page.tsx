export const dynamic = 'force-dynamic';

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setMounted(true);
  }, [router]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">欢迎来到 CardVela</h1>
        
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">我的卡片</h2>
            <p className="text-3xl font-bold text-blue-600">0</p>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">账户余额</h2>
            <p className="text-3xl font-bold text-green-600">¥0.00</p>
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
