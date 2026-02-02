export const dynamic = 'force-dynamic';

'use client';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">欢迎来到 CardVela</h1>
        <p className="text-lg mb-4">仪表盘加载成功！</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-bold mb-2">我的卡片</h2>
            <p className="text-2xl font-bold text-blue-600">0</p>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-bold mb-2">账户余额</h2>
            <p className="text-2xl font-bold text-green-600">¥0.00</p>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-bold mb-2">推荐奖励</h2>
            <p className="text-2xl font-bold text-purple-600">¥0.00</p>
          </div>
        </div>
      </div>
    </div>
  );
}
