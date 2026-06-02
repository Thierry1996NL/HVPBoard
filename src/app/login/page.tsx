'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { HVPLogo } from '@/components/layout/Header';

export default function LoginPage() {
  const { authenticated, login } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authenticated === true) {
      router.replace('/projecten');
    }
  }, [authenticated, router]);

  const handleSubmit = () => {
    setLoading(true);
    setError(false);

    setTimeout(() => {
      const ok = login(password);
      if (ok) {
        router.replace('/projecten');
      } else {
        setError(true);
        setPassword('');
        setLoading(false);
      }
    }, 400);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  if (authenticated === null) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F0F4F8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '0.5px solid #E5E7EB',
        borderRadius: 16,
        boxShadow: '0 16px 48px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
        padding: '2.5rem 2rem',
        width: '100%',
        maxWidth: 340,
      }}>
        {/* Logo + naam */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', gap: 12 }}>
          <HVPLogo size={56} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: '#0D1520', letterSpacing: '-0.3px' }}>
              <span style={{ fontWeight: 600 }}>HVP</span><span style={{ fontWeight: 400, color: '#9CA3AF' }}> HDD Dashboard</span>
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
              Projectbeheer &amp; voortgang
            </div>
          </div>
        </div>

        {/* Wachtwoord veld */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#6B7280',
            marginBottom: 6,
          }}>
            Wachtwoord
          </label>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false); }}
            onKeyDown={handleKey}
            placeholder="••••"
            autoFocus
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `0.5px solid ${error ? '#FECACA' : '#D1D5DB'}`,
              borderRadius: 7,
              fontSize: 16,
              fontFamily: 'inherit',
              color: '#0D1520',
              background: error ? '#FEF2F2' : '#FFFFFF',
              outline: 'none',
              letterSpacing: '0.3em',
              transition: 'border-color 0.12s, background 0.12s',
            }}
          />
          {error && (
            <div style={{
              fontSize: 12,
              color: '#991B1B',
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}>
              Onjuist wachtwoord
            </div>
          )}
        </div>

        {/* Inlogknop */}
        <button
          onClick={handleSubmit}
          disabled={loading || !password}
          style={{
            width: '100%',
            padding: '10px',
            background: loading || !password ? '#9CA3AF' : '#1E2B3C',
            color: '#fff',
            border: 'none',
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: loading || !password ? 'not-allowed' : 'pointer',
            transition: 'background 0.12s',
            letterSpacing: '0.01em',
          }}
        >
          {loading ? 'Bezig...' : 'Inloggen'}
        </button>
      </div>
    </div>
  );
}
