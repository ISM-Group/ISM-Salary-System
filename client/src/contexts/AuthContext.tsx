import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { authAPI } from '@/lib/api';

type User = {
  id: string;
  username: string;
  full_name: string;
  role: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as User) : null;
  });

  useEffect(() => {
    if (!token || !user) {
      return;
    }
    authAPI.getCurrentUser().catch(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
    });
  }, [token, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      login: async (username: string, password: string) => {
        const response = await authAPI.login(username, password);
        const nextToken = response.data.token;
        const nextUser = response.data.user as User;
        localStorage.setItem('token', nextToken);
        localStorage.setItem('user', JSON.stringify(nextUser));
        setToken(nextToken);
        setUser(nextUser);
      },
      logout: async () => {
        try {
          await authAPI.logout();
        } finally {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      },
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
