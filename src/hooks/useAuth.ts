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
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        if (isMounted) {
          setLoading(false);
          router.push('/login');
        }
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!isMounted) return;

        const data = await res.json();
        
        if (!res.ok || !data.user) {
          localStorage.removeItem('token');
          setLoading(false);
          router.push('/login');
          return;
        }

        setUser(data.user);
        setLoading(false);
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        if (isMounted) {
          console.error('验证失败:', error);
          localStorage.removeItem('token');
          setLoading(false);
          router.push('/login');
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [router]);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
  };

  return { user, loading, logout };
}
