import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Workspace } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  workspace: Workspace | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string, wsName?: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshAuth = async () => {
    const token = localStorage.getItem('threadline_token');
    if (!token) {
      setUser(null);
      setWorkspace(null);
      setLoading(false);
      return;
    }

    try {
      const u = await api.getMe();
      setUser(u);
      try {
        const ws = await api.getCurrentWorkspace();
        setWorkspace(ws);
      } catch {
        setWorkspace(null);
      }
    } catch {
      api.logout();
      setUser(null);
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await api.login({ email, password: pass });
      setUser(res.user);
      setWorkspace(res.workspace || null);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, pass: string, name: string, wsName?: string) => {
    setLoading(true);
    try {
      const res = await api.register({ email, password: pass, full_name: name, workspace_name: wsName });
      setUser(res.user);
      setWorkspace(res.workspace || null);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setWorkspace(null);
  };

  return (
    <AuthContext.Provider value={{ user, workspace, loading, login, register, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
