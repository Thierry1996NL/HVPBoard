'use client';

import { useState, useMemo, useRef } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useToast } from '@/components/ui/ToastProvider';
import StatusBadge from '@/components/ui/StatusBadge';
import { COLS, STATUS_VALUES, statusClass } from '@/lib/constants';
import { FASEN } from '@/lib/constants';
import { getProjectNaam, getEngineer, getProgressPercent, wekenResterend, calcHealth } from '@/lib/utils';
import type { StatusValue } from '@/types';

type HealthFilter = '' | 'groen' | 'oranje' | 'rood';

function getColName(idx: number): string {
  return COLS.find(c => c.i === idx)?.n ?? `Col ${idx}`;
}

export default function PlanningPage() {
  const { projects, loading, updateCell } = useProjects();
  const mode = 'editor';
  const toast = useToast();

  const [healthFilter, setHealthFilter] = useState<HealthFilter>('');
  const [engineerFilter, setEngineerFilter] = useState('');
  const [search, setSearch] = useState('');
  const [listView, setListView] = useState(false);
  const [picker, setPicker] = useState<{ rowIdx: number; colIdx: number; x: number; y: number } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Vaste fase — boringen voortgang
  const currentFase = FASEN[0];

  const engineers = useMemo(() => {
    const s = new Set<string>();
    projects.forEach(p => { const e = getEngineer(p.cel_data); if (e) s.add(e); });
    return Array.from(s).sort();
  }, [projects]);

  const alertCounts = useMemo(() => {
    const c = { groen: 0, oranje: 0, rood: 0 };
    projects.forEach(p => {
      if (p.projectnaam === '__config__') return;
      const h = calcHealth(p.cel_data, currentFase);
      if (h === 'groen') c.groen++;
      else if (h === 'oranje') c.oranje++;
      else if (h === 'rood') c.rood++;
    });
    return c;
  }, [projects, currentFase]);

  const filtered = useMemo(() => {
    return projects.filter(p => {
      if (p.projectnaam === '__config__') return false;
      if (engineerFilter && getEngineer(p.cel_data) !== engineerFilter) return false;
      if (healthFilter && calcHealth(p.cel_data, currentFase) !== healthFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return getProjectNaam(p.cel_data).toLowerCase().includes(q) || (p.cel_data['0'] ?? '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [projects, healthFilter, engineerFilter, search, currentFase]);

  const applyStatus = async (status: StatusValue) => {
    if (!picker) return;
    try {
      await updateCell(picker.rowIdx, picker.colIdx, status);
      toast('Status bijgewerkt', 'success');
    } catch (ex) {
      toast((ex as Error).message, 'error');
    }
    setPicker(null);
  };

  if (loading) return <div className="page-content"><div className="loading-bar" /></div>;

  return (
    <div className="page-content">
      {/* Alert tiles */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '0.875rem', flexWrap: 'wrap' }}>
        {([
          { h: 'rood' as HealthFilter, label: 'Kritiek', count: alertCounts.rood, fg: 'var(--b-fg)', bg: 'var(--b-bg)', border: 'var(--b-mid)' },
          { h: 'oranje' as HealthFilter, label: 'Attentie', count: alertCounts.oranje, fg: 'var(--r-fg)', bg: 'var(--r-bg)', border: 'var(--r-mid)' },
          { h: 'groen' as HealthFilter, label: 'Op schema', count: alertCounts.groen, fg: 'var(--g-fg)', bg: 'var(--g-bg)', border: 'var(--g-mid)' },
        ]).map(item => (
          <button key={item.h} onClick={() => setHealthFilter(healthFilter === item.h ? '' : item.h)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 'var(--r-lg)', border: `1px solid ${healthFilter === item.h ? item.fg : item.border}`, background: item.bg, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: item.fg }}>{item.count}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: item.fg }}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="controls-bar">
        <select className="field-input" style={{ width: 'auto', minWidth: 140, padding: '4px 28px 4px 10px' }} value={engineerFilter} onChange={e => setEngineerFilter(e.target.value)}>
          <option value="">Alle engineers</option>
          {engineers.map(e => <option key={e}>{e}</option>)}
        </select>
        <div className="search-wrap">
          <span className="search-icon"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" /><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span>
          <input className="search-input" placeholder="Zoeken..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className={`tab${!listView ? ' active' : ''}`} style={{ fontSize: 11 }} onClick={() => setListView(false)}>⊞ Matrix</button>
        <button className={`tab${listView ? ' active' : ''}`} style={{ fontSize: 11 }} onClick={() => setListView(true)}>≡ Lijst</button>
      </div>

      {/* Matrix */}
      {!listView && (
        <div className="table-wrap">
          <div className="tbl-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 180 }}>Project</th>
                  <th>Engineer</th>
                  <th style={{ minWidth: 80 }}>Voortgang</th>
                  {currentFase.statCols.map(ci => (
                    <th key={ci} title={getColName(ci)} style={{ maxWidth: 90 }}>
                      {getColName(ci).replace(/\[.*?\]\s*/, '').slice(0, 16)}{getColName(ci).length > 16 ? '…' : ''}
                    </th>
                  ))}
                  <th>Datum</th>
                  <th>Weken</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={currentFase.statCols.length + 5}><div className="empty-state"><strong>Geen projecten</strong>Pas de filters aan.</div></td></tr>
                ) : filtered.map(p => {
                  const cd = p.cel_data;
                  const health = calcHealth(cd, currentFase);
                  const progress = getProgressPercent(cd, currentFase.statCols);
                  const wk = currentFase.wekenResterend > 0 ? wekenResterend(cd[String(currentFase.wekenResterend)]) : null;
                  const datum = currentFase.overgangsdatum > 0 ? cd[String(currentFase.overgangsdatum)] : null;
                  const hColor = health === 'groen' ? 'var(--g-fg)' : health === 'oranje' ? 'var(--r-fg)' : health === 'rood' ? 'var(--b-fg)' : 'var(--text-3)';
                  return (
                    <tr key={p.row_idx}>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: hColor, flexShrink: 0 }} /><span style={{ fontWeight: 500 }}>{getProjectNaam(cd, p.row_idx)}</span></div></td>
                      <td style={{ color: 'var(--text-2)', fontSize: 11 }}>{getEngineer(cd) || '—'}</td>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div className="progress-bar" style={{ width: 50 }}><div className="progress-fill" style={{ width: `${progress}%` }} /></div><span style={{ fontSize: 10, color: 'var(--text-3)' }}>{progress}%</span></div></td>
                      {currentFase.statCols.map(ci => (
                        <td key={ci} className={mode === 'editor' ? 'editable' : ''} onClick={mode === 'editor' ? (e) => { const rect = (e.target as HTMLElement).getBoundingClientRect(); setPicker({ rowIdx: p.row_idx, colIdx: ci, x: rect.left, y: rect.bottom + 4 }); } : undefined}>
                          <StatusBadge status={(cd[String(ci)] ?? '') as StatusValue} />
                        </td>
                      ))}
                      <td style={{ fontSize: 11, color: 'var(--text-2)' }}>{datum || '—'}</td>
                      <td>{wk !== null ? <span className={`wk-chip ${wk < 0 ? 'wk-over' : wk <= 4 ? 'wk-warn' : 'wk-ok'}`}>{wk}w</span> : <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* List view */}
      {listView && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {filtered.map(p => {
            const cd = p.cel_data;
            const health = calcHealth(cd, currentFase);
            const wk = currentFase.wekenResterend > 0 ? wekenResterend(cd[String(currentFase.wekenResterend)]) : null;
            const progress = getProgressPercent(cd, currentFase.statCols);
            const done = currentFase.statCols.filter(c => cd[String(c)] === 'Gereed').length;
            const hColor = health === 'groen' ? 'var(--g-fg)' : health === 'oranje' ? 'var(--r-fg)' : health === 'rood' ? 'var(--b-fg)' : 'var(--text-3)';
            return (
              <div key={p.row_idx} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${hColor}`, borderRadius: 'var(--r-lg)', padding: '0.75rem 1.125rem', boxShadow: 'var(--sh-sm)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getProjectNaam(cd, p.row_idx)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{getEngineer(cd) || '—'} · {done}/{currentFase.statCols.length} taken gereed</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {wk !== null && <span className={`wk-chip ${wk < 0 ? 'wk-over' : wk <= 4 ? 'wk-warn' : 'wk-ok'}`}>{wk}w</span>}
                  <div className="progress-bar" style={{ width: 80 }}><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', minWidth: 28 }}>{progress}%</span>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="empty-state"><strong>Geen projecten</strong>Pas de filters aan.</div>}
        </div>
      )}

      {/* Status picker */}
      {picker && (
        <div ref={pickerRef} className="status-picker" style={{ position: 'fixed', left: picker.x, top: picker.y, zIndex: 200 }}>
          {STATUS_VALUES.map(s => (
            <button key={s} className="sp-option" onClick={() => applyStatus(s)}>
              <span className={`badge badge-${statusClass(s)}`} style={{ width: 8, height: 8, padding: 0, minWidth: 8, borderRadius: '50%' }} />{s}
            </button>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 0', paddingTop: 4 }}>
            <button className="sp-option" style={{ color: 'var(--text-3)' }} onClick={() => applyStatus('' as StatusValue)}>Wissen</button>
          </div>
        </div>
      )}
    </div>
  );
}
