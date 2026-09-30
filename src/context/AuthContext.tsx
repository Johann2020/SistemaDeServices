import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  tenantId: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  googleClientId: string;
  loginWithGoogle: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleClientId, setGoogleClientId] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const config = await api.auth.config();
        setGoogleClientId(config.clientId || '');
      } catch {}

      try {
        const { user: me } = await api.auth.me();
        setUser(me);
      } catch {}

      setLoading(false);
    };
    init();
  }, []);

  const loginWithGoogle = useCallback(async (code: string) => {
    try {
      const redirectUri = `${window.location.origin}`;
      const { user: me } = await api.auth.google(code, redirectUri);
      setUser(me);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de autenticación' };
    }
  }, []);

  const logout = useCallback(async () => {
    try { await api.auth.logout(); } catch {}
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, googleClientId, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado con un AuthProvider');
  }
  return context;
};
