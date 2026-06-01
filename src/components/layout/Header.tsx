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

export function HVPLogo({ size = 36 }: { size?: number }) {
  const r = 11;
  const cx1 = 13, cy1 = 13;
  const cx2 = 31, cy2 = 13;
  const cx3 = 22, cy3 = 27;

  return (
    <svg width={size} height={size * 0.88} viewBox="0 0 44 39" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* H - top left */}
      <circle cx={cx1} cy={cy1} r={r + 1.5} fill="#1A0505"/>
      <circle cx={cx1} cy={cy1} r={r} fill="#8B1418"/>
      <circle cx={cx1} cy={cy1} r={r - 1.5} fill="#9E1A1E"/>
      <circle cx={cx1} cy={cy1} r={r - 3} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.8"/>
      <circle cx={cx1} cy={cy1} r={r - 4.5} fill="#8B1418"/>
      <text x={cx1} y={cy1 + 4} textAnchor="middle" fontFamily="Georgia, serif" fontSize="10" fontWeight="700" fill="#9DB5C8" letterSpacing="-0.3">H</text>

      {/* P - top right */}
      <circle cx={cx2} cy={cy2} r={r + 1.5} fill="#1A0505"/>
      <circle cx={cx2} cy={cy2} r={r} fill="#8B1418"/>
      <circle cx={cx2} cy={cy2} r={r - 1.5} fill="#9E1A1E"/>
      <circle cx={cx2} cy={cy2} r={r - 3} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.8"/>
      <circle cx={cx2} cy={cy2} r={r - 4.5} fill="#8B1418"/>
      <text x={cx2} y={cy2 + 4} textAnchor="middle" fontFamily="Georgia, serif" fontSize="10" fontWeight="700" fill="#9DB5C8" letterSpacing="-0.3">P</text>

      {/* V - bottom center */}
      <circle cx={cx3} cy={cy3} r={r + 1.5} fill="#1A0505"/>
      <circle cx={cx3} cy={cy3} r={r} fill="#8B1418"/>
      <circle cx={cx3} cy={cy3} r={r - 1.5} fill="#9E1A1E"/>
      <circle cx={cx3} cy={cy3} r={r - 3} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.8"/>
      <circle cx={cx3} cy={cy3} r={r - 4.5} fill="#8B1418"/>
      <text x={cx3} y={cy3 + 4} textAnchor="middle" fontFamily="Georgia, serif" fontSize="10" fontWeight="700" fill="#9DB5C8" letterSpacing="-0.3">V</text>
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
        <HVPLogo size={36} />
        <span>HVP<span style={{ fontWeight: 400, color: 'var(--accent)' }}>Board</span></span>
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
