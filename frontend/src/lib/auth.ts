import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

// Module-level token so api.ts can read it synchronously
let _accessToken: string | null = null;

export function getAccessToken(): string | null {
  return _accessToken;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAuth = useCallback(() => {
    _accessToken = null;
    setToken(null);
    setUser(null);
    localStorage.removeItem('fuega-refresh-token');
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback((expiresInMs: number) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    // Refresh 60 seconds before expiry, minimum 10 seconds
    const delay = Math.max(expiresInMs - 60_000, 10_000);
    refreshTimerRef.current = setTimeout(async () => {
      const refreshToken = localStorage.getItem('fuega-refresh-token');
      if (!refreshToken) {
        clearAuth();
        return;
      }
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) throw new Error('Refresh failed');
        const data = await res.json();
        _accessToken = data.access_token;
        setToken(data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('fuega-refresh-token', data.refresh_token);
        }
        // Default to 30 minutes if no expires_in
        scheduleRefresh((data.expires_in || 1800) * 1000);
      } catch {
        clearAuth();
      }
    }, delay);
  }, [clearAuth]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Login failed');
    }
    const data = await res.json();
    _accessToken = data.access_token;
    setToken(data.access_token);
    setUser(data.user);
    if (data.refresh_token) {
      localStorage.setItem('fuega-refresh-token', data.refresh_token);
    }
    scheduleRefresh((data.expires_in || 1800) * 1000);
  }, [scheduleRefresh]);

  const register = useCallback(async (email: string, password: string, full_name: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    const data = await res.json();
    _accessToken = data.access_token;
    setToken(data.access_token);
    setUser(data.user);
    if (data.refresh_token) {
      localStorage.setItem('fuega-refresh-token', data.refresh_token);
    }
    scheduleRefresh((data.expires_in || 1800) * 1000);
  }, [scheduleRefresh]);

  const logout = useCallback(() => {
    clearAuth();
    window.location.href = '/login';
  }, [clearAuth]);

  // On mount: try to restore session from refresh token
  useEffect(() => {
    const refreshToken = localStorage.getItem('fuega-refresh-token');
    if (!refreshToken) {
      setIsLoading(false);
      return;
    }
    fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Refresh failed');
        return res.json();
      })
      .then((data) => {
        _accessToken = data.access_token;
        setToken(data.access_token);
        setUser(data.user);
        if (data.refresh_token) {
          localStorage.setItem('fuega-refresh-token', data.refresh_token);
        }
        scheduleRefresh((data.expires_in || 1800) * 1000);
      })
      .catch(() => {
        clearAuth();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [clearAuth, scheduleRefresh]);

  const value: AuthState = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    login,
    register,
    logout,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export const useAuth = () => useContext(AuthContext);
