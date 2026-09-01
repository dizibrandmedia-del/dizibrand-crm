import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isConsultant: boolean;
  login: (emailOrToken: string, passwordOrUser?: string | User) => Promise<User>;
  setAuthSession: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('dizibrand_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('dizibrand_token');
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.auth.me()
        .then((res) => {
          setUser(res.user);
          localStorage.setItem('dizibrand_user', JSON.stringify(res.user));
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const setAuthSession = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('dizibrand_token', newToken);
    localStorage.setItem('token', newToken);
    localStorage.setItem('dizibrand_user', JSON.stringify(newUser));
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const login = async (emailOrToken: string, passwordOrUser?: string | User): Promise<User> => {
    if (typeof passwordOrUser === 'object') {
      setAuthSession(emailOrToken, passwordOrUser);
      return passwordOrUser;
    }

    const res = await api.auth.login({ email: emailOrToken, password: passwordOrUser || '' });
    setAuthSession(res.token, res.user);
    return res.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('dizibrand_token');
    localStorage.removeItem('dizibrand_user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await api.auth.me();
      setUser(res.user);
      localStorage.setItem('dizibrand_user', JSON.stringify(res.user));
    } catch (e) {
      console.error('Failed to refresh user profile:', e);
    }
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isConsultant = user?.role === 'CONSULTANT';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isSuperAdmin,
        isConsultant,
        login,
        setAuthSession,
        logout,
        refreshUser,
      }}
    >
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
