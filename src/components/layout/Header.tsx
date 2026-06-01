'use client';

import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
  '/projecten':          'Projecten',
  '/planning':           'Planning',
  '/analyse':            'Analyse',
  '/boringen':           'Boringen',
  '/duikers':            'Duikers',
  '/proefsleuven':       'Proefsleuven',
  '/omgevingsmanagement':'Omgevingsmanagement',
};

/* Borevexa boorkop-icoon (altijd donkere achtergrond per brand guide) */
function BorevexaIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <rect width="44" height="44" rx="10" fill="#0D1520"/>
      <line x1="4" y1="17" x2="40" y2="17" stroke="white" strokeWidth="1" opacity=".38"/>
      <line x1="5"  y1="17" x2="2"  y2="20" stroke="white" strokeWidth=".8" opacity=".28"/>
      <line x1="10" y1="17" x2="7"  y2="20" stroke="white" strokeWidth=".8" opacity=".28"/>
      <line x1="15" y1="17" x2="12" y2="20" stroke="white" strokeWidth=".8" opacity=".28"/>
      <line x1="20" y1="17" x2="17" y2="20" stroke="white" strokeWidth=".8" opacity=".28"/>
      <line x1="25" y1="17" x2="22" y2="20" stroke="white" strokeWidth=".8" opacity=".28"/>
      <line x1="30" y1="17" x2="27" y2="20" stroke="white" strokeWidth=".8" opacity=".28"/>
      <line x1="35" y1="17" x2="32" y2="20" stroke="white" strokeWidth=".8" opacity=".28"/>
      <line x1="40" y1="17" x2="37" y2="20" stroke="white" strokeWidth=".8" opacity=".28"/>
      <line x1="9" y1="8" x2="9" y2="17" stroke="white" strokeWidth="1" strokeDasharray="2 1.5" opacity=".35"/>
      <circle cx="9" cy="17" r="2.2" fill="#00F5B4"/>
      <path d="M9 17 C18 34 28 36 31 36" stroke="white" strokeWidth="2.8" fill="none" strokeDasharray="9 4" strokeLinecap="round"/>
      <rect x="29.5" y="33.8" width="5" height="4.4" rx="1.2" fill="#7FFBDB"/>
      <polygon points="34.5,33.8 43,36 34.5,36" fill="#7FFBDB"/>
      <polygon points="34.5,38.2 43,36 34.5,36" fill="#7FFBDB"/>
      <polygon points="38,34.8 43,36 38,37.2" fill="#00F5B4"/>
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
      {/* Logo */}
      <div className="logo">
        <BorevexaIcon size={28} />
        <span>
          HVP<span style={{ fontWeight: 400, color: 'var(--accent)' }}>Board</span>
        </span>
      </div>

      {/* Huidige pagina */}
      <div className="hdr-sep" />
      <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{title}</span>

      <div className="hdr-spacer" />

      {/* Datum */}
      <span style={{ fontSize: 11, color: 'var(--text-4)' }}>
        {new Date().toLocaleDateString('nl-NL', {
          weekday: 'long', day: 'numeric', month: 'long',
        })}
      </span>

      <div className="hdr-sep" />

      {/* Avatar */}
      <div className="user-avatar" title="HVP">HV</div>
    </header>
  );
}
