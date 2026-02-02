import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  balance: number;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('useAuth: 检查 token', token);

    if (!token) {
      console.log('useAuth: 没有 token，跳转到登录');
      setLoading(false);
      router.push('/login');
      return;
    }

    // 获取用户信息
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log('useAuth: API 响应状态', res.status);

        if (!res.ok) {
          throw new Error('获取用户信息失败');
        }

        const data = await res.json();
        console.log('useAuth: 用户数据', data);
        setUser(data.user);
        setLoading(false);
      } catch (err: any) {
        console.error('useAuth: 错误', err);
        setError(err.message);
        setLoading(false);
        router.push('/login');
      }
    };

    fetchUser();
  }, [router]);

  const logout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return { user, loading, error, logout };
}
