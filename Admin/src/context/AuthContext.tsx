import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface AdminUser {
  userId: number;
  name: string;
  role: 'admin';
}

interface AuthContextValue {
  user: AdminUser | null;
  token: string | null;
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Real login call against POST /api/auth/login lands with Phase 05/11 wiring.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const [user, setUser] = useState<AdminUser | null>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      login: (newToken, newUser) => {
        localStorage.setItem('admin_token', newToken);
        setToken(newToken);
        setUser(newUser);
      },
      logout: () => {
        localStorage.removeItem('admin_token');
        setToken(null);
        setUser(null);
      },
    }),
    [token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
