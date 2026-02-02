export const dynamic = 'force-dynamic';

'use client';

import { useAuth } from '../../src/hooks/useAuth';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('Dashboard loaded, user:', user, 'loading:', loading);
  }, [user, loading]);

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
        <p className="text-lg mb-2">邮箱: {user.email}</p>
        <p className="text-lg mb-2">余额: ¥{user.balance?.toFixed(2) || '0.00'}</p>
        <p className="text-lg">用户ID: {user.id}</p>
      </div>
    </div>
  );
}
