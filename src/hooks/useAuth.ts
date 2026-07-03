'use client';

import { useState, useEffect } from 'react';

const KEY = 'hvpboard_auth';

// Wachtwoord voor de login-gate. Wijzigen? Vervang de waarde hieronder en upload dit bestand.
// (Optioneel te overriden in Vercel via NEXT_PUBLIC_APP_PASSWORD; die wint dan.)
// Let op: dit is een client-side check — de waarde is zichtbaar in de browserbundle.
const PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD || 'A3d7hH1124r8L';

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
