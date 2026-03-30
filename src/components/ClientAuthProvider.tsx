'use client';

import { AuthProvider } from '../hooks/useAuth';

interface ClientAuthProviderProps {
  children: React.ReactNode;
}

export default function ClientAuthProvider({ children }: ClientAuthProviderProps) {
  return <AuthProvider>{children}</AuthProvider>;
}