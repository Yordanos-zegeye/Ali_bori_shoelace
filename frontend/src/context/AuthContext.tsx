import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, AuthResponse } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  isSuperAdmin: boolean;
  isFactoryMonitor: boolean;
  isStore: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'alibori_access_token';
const REFRESH_KEY = 'alibori_refresh_token';
const USER_KEY = 'alibori_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on mount
  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await api.get<User>('/auth/me/');
        setUser(currentUser);
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      } catch (err: any) {
        console.warn('Session verification failed, attempting token refresh...', err);
        const refreshToken = localStorage.getItem(REFRESH_KEY);
        if (refreshToken) {
          try {
            const refreshResp = await api.post<{ access: string }>('/auth/refresh/', { refresh: refreshToken });
            if (refreshResp.access) {
              localStorage.setItem(TOKEN_KEY, refreshResp.access);
              setToken(refreshResp.access);
              const currentUser = await api.get<User>('/auth/me/');
              setUser(currentUser);
              localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
              setIsLoading(false);
              return;
            }
          } catch (refreshErr) {
            console.error('Refresh token expired or invalid', refreshErr);
          }
        }
        // If refresh also failed, log out
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const resp = await api.post<AuthResponse>('/auth/login/', { email, password });
      
      setToken(resp.access);
      setUser(resp.user);

      localStorage.setItem(TOKEN_KEY, resp.access);
      localStorage.setItem(REFRESH_KEY, resp.refresh);
      localStorage.setItem(USER_KEY, JSON.stringify(resp.user));

      return resp.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const refreshUserData = async () => {
    try {
      const currentUser = await api.get<User>('/auth/me/');
      setUser(currentUser);
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    } catch (err) {
      console.error('Failed to refresh user data', err);
    }
  };

  const role: UserRole | null = user?.role || null;
  const isSuperAdmin = user?.is_superuser === true || role === 'super_admin';
  const isFactoryMonitor = role === 'factory_monitor';
  const isStore = role === 'store';

  const hasRole = (roles: UserRole[]): boolean => {
    if (!role) return false;
    if (isSuperAdmin) return true; // Super admin has access to everything
    return roles.includes(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        hasRole,
        isSuperAdmin,
        isFactoryMonitor,
        isStore,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
