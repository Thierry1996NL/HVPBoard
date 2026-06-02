'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HVPLogo } from './Header';

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
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>,
  },
  {
    href: '/planning',
    label: 'Planning',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 1v4M11 1v4M1 7h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  },
  {
    href: '/analyse',
    label: 'Analyse',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 13 L5 8 L8 10 L11 5 L14 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="14" cy="7" r="1.5" fill="currentColor"/></svg>,
  },
  {
    section: 'Modules',
    href: '/boringen',
    label: 'Boringen',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><ellipse cx="8" cy="13" rx="4" ry="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>,
  },

];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <nav className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        {/* Logo bovenin — vult de volledige hoogte */}
        <div style={{
          height: 'var(--hdr-h)',
          padding: '0 14px',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          <div style={{ flexShrink: 0 }}>
            <HVPLogo size={30} />
          </div>
          <div style={{
            overflow: 'hidden',
            transition: 'opacity 0.15s',
            opacity: collapsed ? 0 : 1,
            whiteSpace: 'nowrap',
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', letterSpacing: '-0.2px' }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>HVP</span><span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.38)', fontSize: 11 }}> HDD Dashboard</span>
            </div>
          </div>
        </div>

        <div className="sidebar-content">
          {NAV.map((item) => (
            <div key={item.href}>
              {item.section && <div className="sb-section-label">{item.section}</div>}
              <Link
                href={item.href}
                className={`sb-item${pathname.startsWith(item.href) ? ' active' : ''}`}
              >
                <span className="sb-icon">{item.icon}</span>
                <span className="sb-label">{item.label}</span>
              </Link>
            </div>
          ))}

          <div className="sb-divider" />

          <div style={{
            padding: '0.375rem 1rem',
            fontSize: 9,
            color: 'rgba(255,255,255,0.18)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            transition: 'opacity 0.15s',
            opacity: collapsed ? 0 : 1,
          }}>
            HVP HDD Dashboard · v1.0
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
