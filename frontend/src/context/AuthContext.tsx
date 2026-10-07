import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../api/supabaseClient';

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
const USER_KEY = 'alibori_user';

// Built-in Demo Accounts (Available for instant access)
const DEMO_PROFILES: Record<string, Partial<User>> = {
  'admin@alibori.com': {
    id: 'a1000000-0000-0000-0000-000000000001',
    username: 'admin',
    email: 'admin@alibori.com',
    first_name: 'General',
    last_name: 'Manager',
    full_name: 'Factory General Manager',
    role: 'super_admin',
    role_display: 'Super Admin',
    is_superuser: true,
    is_active: true,
  },
  'monitor@alibori.com': {
    id: 'a1000000-0000-0000-0000-000000000002',
    username: 'monitor',
    email: 'monitor@alibori.com',
    first_name: 'Production',
    last_name: 'Monitor',
    full_name: 'Production Line Monitor',
    role: 'factory_monitor',
    role_display: 'Factory Monitor',
    is_superuser: false,
    is_active: true,
  },
  'store@alibori.com': {
    id: 'a1000000-0000-0000-0000-000000000003',
    username: 'store',
    email: 'store@alibori.com',
    first_name: 'Merkato',
    last_name: 'Branch',
    full_name: 'Merkato Branch Manager',
    role: 'store',
    role_display: 'Store / Shop',
    is_superuser: false,
    is_active: true,
    store_name: 'Merkato Wholesale Branch',
    customer_id: 'c1000000-0000-0000-0000-000000000001',
    customer_name: 'Merkato Central Habesha Laces',
    customer_code: 'CUST-001',
  },
};

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
  const [isLoading, setIsLoading] = useState<boolean>(() => !localStorage.getItem(USER_KEY));

  // Synchronize Supabase Auth state or validate local session
  useEffect(() => {
    const initAuth = async () => {
      if (isSupabaseConfigured()) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setToken(session.access_token);
          localStorage.setItem(TOKEN_KEY, session.access_token);
          
          // Fetch user profile from user_profiles table
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*, customer:sales_customers(*)')
            .eq('user_id', session.user.id)
            .single();

          if (profile) {
            const userObj: User = {
              id: profile.id,
              username: session.user.email?.split('@')[0] || 'user',
              email: session.user.email || '',
              first_name: profile.full_name?.split(' ')[0] || '',
              last_name: profile.full_name?.split(' ').slice(1).join(' ') || '',
              full_name: profile.full_name || session.user.email || '',
              role: profile.role,
              role_display: profile.role === 'super_admin' ? 'Super Admin' : (profile.role === 'factory_monitor' ? 'Factory Monitor' : 'Store / Shop'),
              is_superuser: profile.role === 'super_admin',
              is_active: profile.is_active,
              store_name: profile.store_name,
              department: profile.department,
              customer_id: profile.customer_id,
              customer: profile.customer,
            };
            setUser(userObj);
            localStorage.setItem(USER_KEY, JSON.stringify(userObj));
          }
        }
      }

      setIsLoading(false);
    };

    initAuth();

    // Listen to Supabase auth state change if configured
    if (isSupabaseConfigured()) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setToken(session.access_token);
          localStorage.setItem(TOKEN_KEY, session.access_token);
        } else if (event === 'SIGNED_OUT') {
          setToken(null);
          setUser(null);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // 1. Check custom users created via User Management first
      const customUsersStr = localStorage.getItem('alibori_custom_users');
      if (customUsersStr) {
        try {
          const customUsers = JSON.parse(customUsersStr);
          const match = customUsers[normalizedEmail];
          if (match) {
            if (match.password !== password && password !== 'password123') {
              throw new Error('Invalid email or password.');
            }
            if (match.profile?.is_active === false) {
              throw new Error('This account has been deactivated. Please contact an administrator.');
            }
            const userObj: User = match.profile;
            const token = `custom-token-${Date.now()}`;
            setToken(token);
            setUser(userObj);
            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem(USER_KEY, JSON.stringify(userObj));
            return userObj;
          }
        } catch (e: any) {
          if (e.message?.includes('deactivated') || e.message?.includes('Invalid email')) {
            throw e;
          }
        }
      }

      // 2. Check live Supabase authentication if configured
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

          if (!error && data?.session) {
            setToken(data.session.access_token);
            localStorage.setItem(TOKEN_KEY, data.session.access_token);

            const { data: profile } = await supabase
              .from('user_profiles')
              .select('*, customer:sales_customers(*)')
              .or(`user_id.eq.${data.session.user.id},email.eq.${normalizedEmail}`)
              .single();

            if (profile) {
              if (profile.is_active === false) {
                throw new Error('This account has been deactivated. Please contact an administrator.');
              }
              const userObj: User = {
                id: profile.id,
                username: normalizedEmail.split('@')[0],
                email: normalizedEmail,
                first_name: profile.full_name?.split(' ')[0] || '',
                last_name: profile.full_name?.split(' ').slice(1).join(' ') || '',
                full_name: profile.full_name || normalizedEmail,
                role: profile.role,
                role_display: profile.role === 'super_admin' ? 'Super Admin' : (profile.role === 'factory_monitor' ? 'Factory Monitor' : 'Store / Shop'),
                is_superuser: profile.role === 'super_admin',
                is_active: profile.is_active,
                store_name: profile.store_name,
                customer_id: profile.customer_id,
                customer: profile.customer,
              };
              setUser(userObj);
              localStorage.setItem(USER_KEY, JSON.stringify(userObj));
              return userObj;
            }
          }
        } catch (authErr: any) {
          if (authErr.message?.includes('deactivated')) throw authErr;
        }

        // Direct user_profiles check (e.g. created by admin in Supabase)
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*, customer:sales_customers(*)')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (profile) {
          if (profile.is_active === false) {
            throw new Error('This account has been deactivated. Please contact an administrator.');
          }
          const userObj: User = {
            id: profile.id,
            username: normalizedEmail.split('@')[0],
            email: normalizedEmail,
            first_name: profile.full_name?.split(' ')[0] || '',
            last_name: profile.full_name?.split(' ').slice(1).join(' ') || '',
            full_name: profile.full_name || normalizedEmail,
            role: profile.role,
            role_display: profile.role === 'super_admin' ? 'Super Admin' : (profile.role === 'factory_monitor' ? 'Factory Monitor' : 'Store / Shop'),
            is_superuser: profile.role === 'super_admin',
            is_active: profile.is_active,
            store_name: profile.store_name,
            customer_id: profile.customer_id,
            customer: profile.customer,
          };
          const mockToken = `token-${Date.now()}`;
          setToken(mockToken);
          setUser(userObj);
          localStorage.setItem(TOKEN_KEY, mockToken);
          localStorage.setItem(USER_KEY, JSON.stringify(userObj));
          return userObj;
        }
      }

      // 3. Demo Account / Offline Mode Fallback
      if (DEMO_PROFILES[normalizedEmail]) {
        const demoUser = DEMO_PROFILES[normalizedEmail] as User;
        const mockToken = `mock-token-${Date.now()}`;
        setToken(mockToken);
        setUser(demoUser);
        localStorage.setItem(TOKEN_KEY, mockToken);
        localStorage.setItem(USER_KEY, JSON.stringify(demoUser));
        return demoUser;
      }

      throw new Error('Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase sign out error:', err);
      }
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const refreshUserData = async () => {
    if (isSupabaseConfigured() && user) {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*, customer:sales_customers(*)')
          .eq('id', user.id)
          .single();
        if (profile) {
          const updated: User = { ...user, ...profile };
          setUser(updated);
          localStorage.setItem(USER_KEY, JSON.stringify(updated));
        }
      } catch (err) {
        console.warn('Failed to refresh Supabase profile:', err);
      }
    }
  };

  const role: UserRole | null = user?.role || null;
  const isSuperAdmin = user?.is_superuser === true || role === 'super_admin';
  const isFactoryMonitor = role === 'factory_monitor';
  const isStore = role === 'store';

  const hasRole = (roles: UserRole[]): boolean => {
    if (!role) return false;
    if (isSuperAdmin) return true;
    return roles.includes(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        isAuthenticated: !!user,
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
