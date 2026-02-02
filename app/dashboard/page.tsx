'use client';

import { useAuth } from '../../src/hooks/useAuth';

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-white">加载中...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* 导航栏 */}
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <h1 className="text-xl font-bold">CardVela</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-300">欢迎, {user.username}</span>
            <span className="text-green-400">余额: ¥{user.balance?.toFixed(2) || '0.00'}</span>
            <button 
              onClick={() => {
                localStorage.removeItem('token');
                window.location.reload();
              }}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm"
            >
              退出登录
            </button>
          </div>
        </div>
      </nav>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">我的卡片</h2>
            <p className="text-3xl font-bold text-blue-400">0</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">总余额</h2>
            <p className="text-3xl font-bold text-green-400">¥{user.balance?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">推荐奖励</h2>
            <p className="text-3xl font-bold text-purple-400">¥0.00</p>
          </div>
        </div>
      </div>
    </div>
  );
}
