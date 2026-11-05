import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, ApiError, post, put, sessionStore } from '../services/api';
import { User, Video } from '../types';

type Context = {
  user: User | null;
  ready: boolean;
  revision: number;
  historyRevision: number;
  refreshHistory: () => void;
  message: string;
  notify: (s: string) => void;
  login: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => void;
  setUser: (u: User) => void;
  react: (v: Video, kind: 'like' | 'save') => Promise<void>;
};
const AppContext = createContext<Context>(null!);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const [historyRevision, setHistoryRevision] = useState(0);
  const refreshHistory = useCallback(() => setHistoryRevision((value) => value + 1), []);
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = useCallback((s: string) => {
    setMessage(s);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(''), 4000);
  }, []);
  useEffect(() => {
    (async () => {
      try {
        if (await sessionStore.read()) setUser(await api<User>('/me'));
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) await sessionStore.write(null);
        else notify((e as Error).message);
      } finally {
        setReady(true);
      }
    })();
    return () => clearTimeout(timer.current);
  }, []);
  const refresh = useCallback(() => setRevision((x) => x + 1), []);
  async function login(email: string, password: string, name?: string) {
    const result = await post<{ token: string; user: User }>(
      name ? '/auth/register' : '/auth/login',
      { email, password, ...(name ? { name } : {}) },
    );
    await sessionStore.write(result.token);
    setUser(result.user);
    refresh();
  }
  async function logout() {
    try {
      await post('/auth/logout', {});
    } catch {}
    await sessionStore.write(null);
    setUser(null);
    refresh();
  }
  async function react(v: Video, kind: 'like' | 'save') {
    if (!user) {
      notify('Đăng nhập ở mục Cá nhân để lưu và tương tác nhé.');
      return;
    }
    await put(`/videos/${v.id}/${kind}`, { active: !v[kind === 'like' ? 'liked' : 'saved'] });
    refresh();
  }
  return (
    <AppContext.Provider
      value={{
        user,
        ready,
        revision,
        historyRevision,
        refreshHistory,
        message,
        notify,
        login,
        logout,
        refresh,
        setUser,
        react,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
export const useApp = () => useContext(AppContext);

export function useResource<T>(
  path: string,
  initial: T,
  {
    cache = false,
    enabled = true,
    scope = 'default',
  }: { cache?: boolean; enabled?: boolean; scope?: 'default' | 'history' } = {},
) {
  const { revision, user, historyRevision } = useApp();
  const scopedRevision = scope === 'history' ? historyRevision : 0;
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  useEffect(() => {
    if (!enabled) {
      setData(initial);
      setLoading(false);
      setError('');
      setOffline(false);
      return;
    }
    let alive = true;
    // Cache is partitioned by account; private feeds never leak across sessions.
    const key = `luma.cache.${user?.id ?? 'guest'}.${path}`;
    setLoading(true);
    setError('');
    setOffline(false);
    (async () => {
      try {
        const result = await api<T>(path);
        if (alive) {
          setData(result);
          if (cache) await AsyncStorage.setItem(key, JSON.stringify(result)).catch(() => {});
        }
      } catch (e) {
        if (!alive) return;
        let cached: T | null = null;
        if (cache) {
          try {
            const stored = await AsyncStorage.getItem(key);
            if (stored) cached = JSON.parse(stored) as T;
          } catch {}
        }
        if (!alive) return;
        if (cached !== null) {
          setData(cached);
          setOffline(true);
        } else {
          setData(initial);
          setError((e as Error).message);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [path, revision, user?.id, retryKey, enabled, scopedRevision]);
  return { data, setData, loading, error, offline, reload: () => setRetryKey((x) => x + 1) };
}
