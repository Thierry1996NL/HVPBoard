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

/* HPV logo — drie overlappende cirkels, exact naar origineel */
export function HVPLogo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.84}
      viewBox="0 0 50 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="rg1" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#B52030"/>
          <stop offset="60%" stopColor="#8B1520"/>
          <stop offset="100%" stopColor="#5C0C12"/>
        </radialGradient>
        <radialGradient id="rg2" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#B52030"/>
          <stop offset="60%" stopColor="#8B1520"/>
          <stop offset="100%" stopColor="#5C0C12"/>
        </radialGradient>
        <radialGradient id="rg3" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#B52030"/>
          <stop offset="60%" stopColor="#8B1520"/>
          <stop offset="100%" stopColor="#5C0C12"/>
        </radialGradient>
      </defs>

      {/* H — links boven */}
      <circle cx="14" cy="14" r="14" fill="#120005"/>
      <circle cx="14" cy="14" r="12.5" fill="url(#rg1)"/>
      <circle cx="14" cy="14" r="10"   fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="1"/>
      <circle cx="14" cy="14" r="7.5"  fill="none" stroke="rgba(0,0,0,0.25)"       strokeWidth="0.6"/>
      <text x="14" y="18.5" textAnchor="middle"
            fontFamily="Georgia, 'Times New Roman', serif"
            fontSize="11" fontWeight="700"
            fill="#8EB0C8" letterSpacing="0">H</text>

      {/* P — rechts boven */}
      <circle cx="36" cy="14" r="14" fill="#120005"/>
      <circle cx="36" cy="14" r="12.5" fill="url(#rg2)"/>
      <circle cx="36" cy="14" r="10"   fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="1"/>
      <circle cx="36" cy="14" r="7.5"  fill="none" stroke="rgba(0,0,0,0.25)"       strokeWidth="0.6"/>
      <text x="36" y="18.5" textAnchor="middle"
            fontFamily="Georgia, 'Times New Roman', serif"
            fontSize="11" fontWeight="700"
            fill="#8EB0C8" letterSpacing="0">P</text>

      {/* V — midden onder */}
      <circle cx="25" cy="29" r="14" fill="#120005"/>
      <circle cx="25" cy="29" r="12.5" fill="url(#rg3)"/>
      <circle cx="25" cy="29" r="10"   fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="1"/>
      <circle cx="25" cy="29" r="7.5"  fill="none" stroke="rgba(0,0,0,0.25)"       strokeWidth="0.6"/>
      <text x="25" y="33.5" textAnchor="middle"
            fontFamily="Georgia, 'Times New Roman', serif"
            fontSize="11" fontWeight="700"
            fill="#8EB0C8" letterSpacing="0">V</text>
    </svg>
  );
}

export default function Header() {
  const pathname = usePathname();
  const title = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname.startsWith(key)
  )?.[1] ?? 'HVP Board';

  return (
    <header className="site-header">
      <div className="logo">
        <HVPLogo size={38} />
        <span>
          HVP<span style={{ fontWeight: 400, color: 'var(--accent)' }}>Board</span>
        </span>
      </div>

      <div className="hdr-sep" />
      <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{title}</span>

      <div className="hdr-spacer" />

      <span style={{ fontSize: 11, color: 'var(--text-4)' }}>
        {new Date().toLocaleDateString('nl-NL', {
          weekday: 'long', day: 'numeric', month: 'long',
        })}
      </span>

      <div className="hdr-sep" />
      <div className="user-avatar" title="HVP">HV</div>
    </header>
  );
}
