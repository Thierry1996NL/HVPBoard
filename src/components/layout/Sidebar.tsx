'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  section?: string;
  icon: React.ReactNode;
}

const NAV: NavItem[] = [
  {
    section: 'Overzicht',
    href: '/projecten',
    label: 'Projecten',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    href: '/planning',
    label: 'Planning',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="3" width="14" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M5 1v4M11 1v4M1 7h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/analyse',
    label: 'Analyse',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M2 13 L5 8 L8 10 L11 5 L14 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="14" cy="7" r="1.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    section: 'Modules',
    href: '/boringen',
    label: 'Boringen',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v12M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <ellipse cx="8" cy="13" rx="4" ry="1.5" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    href: '/duikers',
    label: 'Duikers',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="6" width="14" height="4" rx="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M4 6V4a2 2 0 014 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/proefsleuven',
    label: 'Proefsleuven',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M2 14L5 6h6l3 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 10h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/omgevingsmanagement',
    label: 'Omgeving',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M8 2C5.2 2 3 4.2 3 7c0 3.5 5 9 5 9s5-5.5 5-9c0-2.8-2.2-5-5-5z" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="8" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <nav className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        {/* Merk-indicator bovenin */}
        <div style={{
          padding: '0.875rem 1rem 0.625rem',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflow: 'hidden',
        }}>
          <div style={{
            width: 6, height: 6,
            borderRadius: '50%',
            background: '#00F5B4',
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.25)',
            whiteSpace: 'nowrap',
            transition: 'opacity 0.15s',
            opacity: collapsed ? 0 : 1,
          }}>
            Prescan &amp; Ontwerp
          </span>
        </div>

        <div className="sidebar-content">
          {NAV.map((item) => (
            <div key={item.href}>
              {item.section && (
                <div className="sb-section-label">{item.section}</div>
              )}
              <Link
                href={item.href}
                className={`sb-item${pathname.startsWith(item.href) ? ' active' : ''}`}
              >
                <span className="sb-icon">{item.icon}</span>
                <span className="sb-label">{item.label}</span>
              </Link>
            </div>
          ))}

          <div className="sb-divider" style={{ margin: '0.75rem 1rem' }} />

          {/* Versie-info */}
          <div style={{
            padding: '0.375rem 1rem',
            fontSize: 9,
            color: 'rgba(255,255,255,0.18)',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            transition: 'opacity 0.15s',
            opacity: collapsed ? 0 : 1,
          }}>
            HVP Board · 1.0
          </div>
        </div>
      </nav>

      <button
        className="sb-toggle"
        onClick={() => {
          setCollapsed(c => !c);
          document.body.classList.toggle('sidebar-collapsed', !collapsed);
        }}
        title={collapsed ? 'Uitklappen' : 'Inklappen'}
        style={{ fontSize: 11, fontWeight: 500 }}
      >
        {collapsed ? '›' : '‹'}
      </button>
    </>
  );
}
