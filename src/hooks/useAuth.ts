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
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        router.push('/login');
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        
        if (!res.ok || !data.user) {
          localStorage.removeItem('token');
          setLoading(false);
          router.push('/login');
          return;
        }

        setUser(data.user);
        setLoading(false);
      } catch (error) {
        console.error('验证失败:', error);
        localStorage.removeItem('token');
        setLoading(false);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  return { user, loading };
}
