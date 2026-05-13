import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { clearSession, loadStoredSession, saveSession } from './session';
import { setSessionAccessors } from '../api/client';
import type { User } from '../types/user';

type AuthState = {
  user: User | null;
  token: string | null;
  ready: boolean;
  setAuth: (t: string, u: User) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthCtx = React.createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    tokenRef.current = null;
    await clearSession();
  }, []);

  const setAuth = useCallback(async (t: string, u: User) => {
    setToken(t);
    setUser(u);
    tokenRef.current = t;
    await saveSession(t, JSON.stringify(u));
  }, []);

  useEffect(() => {
    setSessionAccessors({
      getToken: () => tokenRef.current,
      onUnauthorized: () => {
        void clearSession().then(() => {
          tokenRef.current = null;
          setToken(null);
          setUser(null);
        });
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- wire once; accessors use refs
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await loadStoredSession();
        if (raw.token && raw.userJson) {
          setToken(raw.token);
          tokenRef.current = raw.token;
          setUser(JSON.parse(raw.userJson) as User);
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const value = useMemo(
    (): AuthState => ({
      user,
      token,
      ready,
      setAuth,
      logout,
    }),
    [logout, ready, setAuth, token, user],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth requires AuthProvider');
  return v;
}
