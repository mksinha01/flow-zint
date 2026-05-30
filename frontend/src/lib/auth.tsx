'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@/types';
import { authApi, workspacesApi } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, workspaceName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper: fetch user's first workspace and cache its ID in localStorage
  const fetchAndStoreWorkspace = async () => {
    try {
      const { data } = await workspacesApi.list();
      const workspaces = (data as any).data?.workspaces ?? [];
      if (workspaces.length > 0) {
        localStorage.setItem('workspace_id', workspaces[0].id);
      }
    } catch {
      // non-fatal — workspace_id will just be missing
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const stored = localStorage.getItem('user');
    if (token && stored) {
      setAccessToken(token);
      setUser(JSON.parse(stored));
      // Re-hydrate workspace_id if not cached yet
      if (!localStorage.getItem('workspace_id')) {
        fetchAndStoreWorkspace();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    const { user, accessToken, refreshToken } = data.data;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    setAccessToken(accessToken);
    // Cache workspace_id so workspace-protected routes get x-workspace-id header
    await fetchAndStoreWorkspace();
  };

  const register = async (name: string, email: string, password: string, workspaceName: string) => {
    const { data } = await authApi.register(name, email, password, workspaceName);
    const { user, accessToken, refreshToken } = data.data;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    setAccessToken(accessToken);
    // Cache workspace_id so workspace-protected routes get x-workspace-id header
    await fetchAndStoreWorkspace();
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setAccessToken(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
