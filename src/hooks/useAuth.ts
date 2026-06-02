'use client';

import { useState, useEffect } from 'react';

const KEY = 'hvpboard_auth';
const PASSWORD = '0000';

export function useAuth() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    setAuthenticated(stored === 'true');
  }, []);

  const login = (password: string): boolean => {
    if (password === PASSWORD) {
      localStorage.setItem(KEY, 'true');
      setAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(KEY);
    setAuthenticated(false);
  };

  return { authenticated, login, logout };
}
