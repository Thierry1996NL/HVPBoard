'use client';

import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
  '/projecten':           'Projecten',
  '/planning':            'Planning',
  '/analyse':             'Analyse',
  '/boringen':            'Boringen',
  '/duikers':             'Duikers',
  '/proefsleuven':        'Proefsleuven',
  '/omgevingsmanagement': 'Omgevingsmanagement',
};

/* Logo wordt alleen in Sidebar gebruikt — exporteren voor hergebruik */
export function HVPLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.84} viewBox="0 0 50 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="rg1" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#B52030"/>
          <stop offset="60%" stopColor="#8B1520"/>
          <stop offset="100%" stopColor="#5C0C12"/>
        </radialGradient>
      </defs>
      {/* H */}
      <circle cx="14" cy="14" r="14" fill="#120005"/>
      <circle cx="14" cy="14" r="12.5" fill="url(#rg1)"/>
      <circle cx="14" cy="14" r="10" fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="1"/>
      <circle cx="14" cy="14" r="7.5" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="0.6"/>
      <text x="14" y="18.5" textAnchor="middle" fontFamily="Georgia, serif" fontSize="11" fontWeight="700" fill="#8EB0C8">H</text>
      {/* P */}
      <circle cx="36" cy="14" r="14" fill="#120005"/>
      <circle cx="36" cy="14" r="12.5" fill="url(#rg1)"/>
      <circle cx="36" cy="14" r="10" fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="1"/>
      <circle cx="36" cy="14" r="7.5" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="0.6"/>
      <text x="36" y="18.5" textAnchor="middle" fontFamily="Georgia, serif" fontSize="11" fontWeight="700" fill="#8EB0C8">P</text>
      {/* V */}
      <circle cx="25" cy="29" r="14" fill="#120005"/>
      <circle cx="25" cy="29" r="12.5" fill="url(#rg1)"/>
      <circle cx="25" cy="29" r="10" fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="1"/>
      <circle cx="25" cy="29" r="7.5" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="0.6"/>
      <text x="25" y="33.5" textAnchor="middle" fontFamily="Georgia, serif" fontSize="11" fontWeight="700" fill="#8EB0C8">V</text>
    </svg>
  );
}

export default function Header() {
  const pathname = usePathname();
  const title = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname.startsWith(key)
  )?.[1] ?? '';

  return (
    <header className="site-header">
      <h1 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.2px', margin: 0 }}>
        {title}
      </h1>

      <div className="hdr-spacer" />

      <span style={{ fontSize: 11, color: 'var(--text-4)' }}>
        {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
      </span>

      <div className="hdr-sep" />
      <div className="user-avatar" title="HVP">HV</div>
    </header>
  );
}
