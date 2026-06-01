'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  section?: string;
}

const NAV: NavItem[] = [
  {
    section: 'Overzicht',
    href: '/projecten',
    label: 'Projecten',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="3" width="14" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M5 1v4M11 1v4M1 7h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/analyse',
    label: 'Analyse',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 12 L5 8 L8 10 L11 5 L14 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="14" cy="7" r="1.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    section: 'Modules',
    href: '/boringen',
    label: 'Boringen',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v12M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <ellipse cx="8" cy="13" rx="4" ry="1.5" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    href: '/duikers',
    label: 'Duikers',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="6" width="14" height="4" rx="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M4 6V4a2 2 0 014 0v2M8 6V4a2 2 0 014 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/proefsleuven',
    label: 'Proefsleuven',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 14 L5 6 L11 6 L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 10h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/omgevingsmanagement',
    label: 'Omgeving',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
        <div className="sidebar-content">
          {NAV.map((item, idx) => (
            <div key={item.href}>
              {item.section && (
                <div className="sb-section-label">{item.section}</div>
              )}
              {!item.section && idx > 0 && NAV[idx - 1].section && null}
              <Link
                href={item.href}
                className={`sb-item${pathname.startsWith(item.href) ? ' active' : ''}`}
              >
                <span className="sb-icon">{item.icon}</span>
                <span className="sb-label">{item.label}</span>
              </Link>
            </div>
          ))}
        </div>
      </nav>

      <button
        className="sb-toggle"
        onClick={() => {
          setCollapsed(c => !c);
          document.body.classList.toggle('sidebar-collapsed', !collapsed);
        }}
        title={collapsed ? 'Uitklappen' : 'Inklappen'}
      >
        {collapsed ? '›' : '‹'}
      </button>
    </>
  );
}
