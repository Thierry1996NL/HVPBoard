'use client';

import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
  '/projecten': 'Projecten',
  '/planning': 'Planning',
  '/analyse': 'Analyse',
  '/boringen': 'Boringen',
  '/duikers': 'Duikers',
  '/proefsleuven': 'Proefsleuven',
  '/omgevingsmanagement': 'Omgevingsmanagement',
};

export default function Header() {
  const pathname = usePathname();

  const title = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname.startsWith(key)
  )?.[1] ?? 'HVP Board';

  return (
    <header className="site-header">
      <div className="logo">
        <div className="logo-icon">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect x="1" y="1" width="3.5" height="3.5" rx="0.8" fill="white"/>
            <rect x="5.5" y="1" width="3.5" height="3.5" rx="0.8" fill="white" opacity="0.7"/>
            <rect x="1" y="5.5" width="3.5" height="3.5" rx="0.8" fill="white" opacity="0.7"/>
            <rect x="5.5" y="5.5" width="3.5" height="3.5" rx="0.8" fill="white" opacity="0.5"/>
          </svg>
        </div>
        HVP Board
      </div>

      <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{title}</span>

      <div className="hdr-spacer" />

      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
        {new Date().toLocaleDateString('nl-NL', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        })}
      </div>

      <div className="user-avatar" title="Editor modus">
        HV
      </div>
    </header>
  );
}
