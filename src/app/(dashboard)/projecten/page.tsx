'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useProjects } from '@/hooks/useProjects';
import { useToast } from '@/components/ui/ToastProvider';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import { STATUS_VALUES, statusClass } from '@/lib/constants';
import { getProjectNaam, getEngineer, getProjectStatus, getProgressPercent } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { boringHealth, type BoringProces, type Health } from '@/lib/proces';
import type { Werkpakket, CelData, StatusValue } from '@/types';

interface BoringRow extends BoringProces {
  werkpakket_id: number;
  status_ontwerp?: string;
}

export interface ProjectSummary {
  totaal: number;
  health: Health;
  groen: number;
  geel: number;
  rood: number;
  gereed: number;
  vervallen: number;
}

/* Samenvatting per project op basis van de boringen + het stappen-proces. */
function useBoringSummaries() {
  const [boringen, setBoringen] = useState<BoringRow[]>([]);
  useEffect(() => {
    createClient()
      .from('boringen')
      .select('werkpakket_id, status_ontwerp, stappen, engineering_afgerond, vervallen')
      .then(({ data }) => setBoringen((data ?? []) as BoringRow[]));
  }, []);

  return useMemo(() => {
    const map = new Map<number, ProjectSummary>();
    const byProject = new Map<number, BoringRow[]>();
    for (const b of boringen) {
      if (!byProject.has(b.werkpakket_id)) byProject.set(b.werkpakket_id, []);
      byProject.get(b.werkpakket_id)!.push(b);
    }
    byProject.forEach((bors, pid) => {
      const active = bors.filter(b => !b.vervallen);
      const vervallen = bors.length - active.length;
      const gereed = active.filter(b => b.engineering_afgerond).length;
      let groen = 0, geel = 0, rood = 0;
      for (const b of active) {
        const h = boringHealth(b);
        if (h === 'rood') rood++; else if (h === 'geel') geel++; else groen++;
      }
      const health: Health = rood > 0 ? 'rood' : geel > 0 ? 'geel' : 'groen';
      map.set(pid, { totaal: active.length, health, groen, geel, rood, gereed, vervallen });
    });
    return map;
  }, [boringen]);
}

export default function ProjectenPage() {
  const router = useRouter();
  
  const mode = 'editor';
  const { projects, loading, updateCell, createProject, deleteProject } = useProjects();
  const boringSummaries = useBoringSummaries();
  const toast = useToast();

  // Filters
  const [search, setSearch] = useState('');
  const [filterEngineer, setFilterEngineer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showArchief, setShowArchief] = useState(false);

  // Status picker
  const [picker, setPicker] = useState<{ rowIdx: number; colIdx: number; x: number; y: number } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Project modal
  const [projectModal, setProjectModal] = useState<{ open: boolean; rowIdx: number | null }>({ open: false, rowIdx: null });
  const [formData, setFormData] = useState<CelData>({});

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (picker && pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPicker(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [picker]);

  // Engineers list
  const engineers = useMemo(() => {
    const set = new Set<string>();
    projects.forEach(p => { const e = p.cel_data['179'] || getEngineer(p.cel_data); if (e) set.add(e); });
    return Array.from(set).sort();
  }, [projects]);

  // Filtered rows
  const rows = useMemo(() => {
    return projects.filter(p => {
      const cd = p.cel_data;
      if (cd['2'] === '__config__' || p.projectnaam === '__config__') return false;

      const isArchief = cd['archief'] === '1';
      if (!showArchief && isArchief) return false;
      if (showArchief && !isArchief) return false;

      if (filterEngineer && (cd['179'] || getEngineer(cd)) !== filterEngineer) return false;
      if (filterStatus && (boringSummaries.get(p.row_idx)?.health ?? 'groen') !== filterStatus) return false;

      if (search) {
        const q = search.toLowerCase();
        const searchable = [cd['0'], cd['1'], cd['2'], cd['5'], cd['8']].join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      return true;
    });
  }, [projects, search, filterEngineer, filterStatus, showArchief, boringSummaries]);

  // KPI: stoplicht-rollup per project (consistent met Boringen-module)
  const kpi = useMemo(() => {
    const counts = { total: rows.length, groen: 0, geel: 0, rood: 0 };
    rows.forEach(p => {
      const bs = boringSummaries.get(p.row_idx);
      const h = bs?.health ?? 'groen';
      if (h === 'rood') counts.rood++;
      else if (h === 'geel') counts.geel++;
      else counts.groen++;
    });
    return counts;
  }, [rows, boringSummaries]);

  // Vaste basiskolommen — geen fase-filtering meer
  const visibleCols = [
    { i: 0, n: 'Proj. nr int.' },
    { i: 2, n: 'Projectnaam' },
    { i: 5, n: 'WP nr' },
    { i: 179, n: 'Projectleider' },
  ];

  const isStatusCol = (_colIdx: number) => false;

  const openPicker = (e: React.MouseEvent, rowIdx: number, colIdx: number) => {
    if (mode !== 'editor') return;
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPicker({ rowIdx, colIdx, x: rect.left, y: rect.bottom + window.scrollY + 4 });
  };

  const applyStatus = async (status: StatusValue) => {
    if (!picker) return;
    try {
      await updateCell(picker.rowIdx, picker.colIdx, status);
      toast('Status bijgewerkt', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    setPicker(null);
  };

  const openProjectModal = (rowIdx: number | null) => {
    if (rowIdx === null) {
      setFormData({});
    } else {
      const p = projects.find(x => x.row_idx === rowIdx);
      setFormData(p?.cel_data ?? {});
    }
    setProjectModal({ open: true, rowIdx });
  };

  const saveProject = async () => {
    try {
      if (projectModal.rowIdx === null) {
        await createProject(formData);
        toast('Project aangemaakt', 'success');
      } else {
        // Update each field that changed
        const p = projects.find(x => x.row_idx === projectModal.rowIdx);
        if (p) {
          for (const [k, v] of Object.entries(formData)) {
            if (p.cel_data[k] !== v) await updateCell(projectModal.rowIdx!, parseInt(k), v);
          }
          toast('Project bijgewerkt', 'success');
        }
      }
      setProjectModal({ open: false, rowIdx: null });
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  if (loading) return <div className="page-content"><div className="loading-bar" /></div>;

  return (
    <div className="page-content">
      {/* KPI bar */}
      <div className="stats-bar">
        <div className="stat-card">
          <span className="stat-num">{kpi.total}</span>
          <span className="stat-label">Projecten</span>
        </div>
        <div className="stat-card stat-G">
          <span className="stat-num">{kpi.groen}</span>
          <span className="stat-label">Op schema</span>
        </div>
        <div className="stat-card stat-R">
          <span className="stat-num">{kpi.geel}</span>
          <span className="stat-label">Aandacht</span>
        </div>
        <div className="stat-card stat-B">
          <span className="stat-num">{kpi.rood}</span>
          <span className="stat-label">Te laat</span>
        </div>
      </div>

      {/* Controls */}
      <div className="controls-bar">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          {/* Search */}
          <div className="search-wrap">
            <span className="search-icon">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <input
              className="search-input"
              placeholder="Zoeken..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Engineer filter */}
          <select
            className="field-input"
            style={{ width: 'auto', minWidth: 140, padding: '4px 28px 4px 10px' }}
            value={filterEngineer}
            onChange={e => setFilterEngineer(e.target.value)}
          >
            <option value="">Alle projectleiders</option>
            {engineers.map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          {/* Stoplicht-filter (uit de boringen) */}
          <select
            className="field-input"
            style={{ width: 'auto', minWidth: 140, padding: '4px 28px 4px 10px' }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">Alle statussen</option>
            <option value="groen">Op schema</option>
            <option value="geel">Aandacht</option>
            <option value="rood">Te laat</option>
          </select>

          {/* Archief toggle */}
          <button
            className={`tab${showArchief ? ' active' : ''}`}
            onClick={() => setShowArchief(v => !v)}
          >
            {showArchief ? 'Archief ✓' : 'Archief'}
          </button>

          {mode === 'editor' && (
            <button className="btn btn-primary" onClick={() => openProjectModal(null)}>
              + Nieuw project
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <div className="tbl-scroll">
          <table>
            <thead>
              <tr>
                {visibleCols.map(col => (
                  <th key={col.i}>{col.n}</th>
                ))}
                <th>Boringen</th>
                <th style={{ textAlign: 'center' }}>Op schema</th>
                <th style={{ textAlign: 'center' }}>Aandacht</th>
                <th style={{ textAlign: 'center' }}>Te laat</th>
                <th>Gereed</th>
                <th style={{ textAlign: 'center' }}>Vervallen</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.length + 7}>
                    <div className="empty-state">
                      <strong>Geen projecten gevonden</strong>
                      Pas de filters aan of maak een nieuw project aan.
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map(p => {
                  const cd = p.cel_data;
                  const bs = boringSummaries.get(p.row_idx);
                  const projGereed = cd['gereed'] === '1';
                  const gereedPct = bs && bs.totaal > 0 ? Math.round((bs.gereed / bs.totaal) * 100) : null;

                  const teller = (aantal: number, bucket: 'groen' | 'geel' | 'rood', kleur: string) => (
                    <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      {bs && aantal > 0 ? (
                        <button
                          onClick={() => router.push(`/lemmer?wp=${p.row_idx}&health=${bucket}`)}
                          title="Open in Boringen — gefilterd"
                          style={{ cursor: 'pointer', border: 'none', background: 'transparent', fontSize: 14, fontWeight: 700, color: kleur, padding: '2px 8px', borderRadius: 6 }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2, #f1f5f9)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >{aantal}</button>
                      ) : <span style={{ color: 'var(--text-4)', fontSize: 13 }}>{bs ? '0' : '—'}</span>}
                    </td>
                  );

                  const toggleGereed = async () => {
                    try {
                      await updateCell(p.row_idx, 'gereed' as unknown as number, projGereed ? '0' : '1');
                      toast(projGereed ? 'Project weer open' : '✓ Project gereed', 'success');
                    } catch (e) { toast((e as Error).message, 'error'); }
                  };

                  return (
                    <tr key={p.row_idx} style={{ cursor: 'pointer', opacity: projGereed ? 0.55 : 1, background: projGereed ? 'var(--n-bg, #f1f5f9)' : undefined }} onClick={() => router.push(`/project/${p.row_idx}`)}>
                      {visibleCols.map(col => {
                        const val = col.i === 179 ? (cd['179'] || cd['8'] || '') : (cd[String(col.i)] ?? '');
                        const isStatus = isStatusCol(col.i);
                        return (
                          <td key={col.i}
                            className={isStatus && mode === 'editor' ? 'editable' : ''}
                            onClick={isStatus ? (e) => { e.stopPropagation(); openPicker(e, p.row_idx, col.i); } : undefined}>
                            {isStatus ? <StatusBadge status={val as StatusValue} /> : <span>{val || <span style={{ color: 'var(--text-3)' }}>—</span>}</span>}
                          </td>
                        );
                      })}

                      {/* Boringen totaal */}
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {bs ? (
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{bs.totaal}</span>
                        ) : <span style={{ color: 'var(--text-4)' }}>—</span>}
                      </td>

                      {/* Stoplicht-tellers — klikbaar naar de Boringen-module */}
                      {teller(bs?.groen ?? 0, 'groen', 'var(--g-fg)')}
                      {teller(bs?.geel ?? 0, 'geel', 'var(--r-fg)')}
                      {teller(bs?.rood ?? 0, 'rood', 'var(--b-fg)')}

                      {/* Boringen gereed — percentagebalk */}
                      <td>
                        {gereedPct !== null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={`${bs!.gereed} van ${bs!.totaal} gereed`}>
                            <div style={{ width: 48, height: 4, borderRadius: 2, background: '#E5E7EB', overflow: 'hidden' }}>
                              <div style={{ width: `${gereedPct}%`, height: '100%', borderRadius: 2, background: 'var(--g-fg)' }} />
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-2)', minWidth: 28 }}>{gereedPct}%</span>
                          </div>
                        ) : <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>}
                      </td>

                      {/* Vervallen boringen */}
                      <td style={{ textAlign: 'center' }}>
                        {bs && bs.vervallen > 0
                          ? <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)' }}>{bs.vervallen}</span>
                          : <span style={{ color: 'var(--text-4)', fontSize: 13 }}>{bs ? '0' : '—'}</span>}
                      </td>

                      {/* Actions */}
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <button className="btn" onClick={toggleGereed}
                            title={projGereed ? 'Project weer openen' : 'Project markeren als gereed'}
                            style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600,
                              ...(projGereed ? { background: 'var(--g-bg)', color: 'var(--g-fg)', borderColor: 'var(--g-mid, var(--g-fg))' } : {}) }}>
                            {projGereed ? '✓ Gereed' : 'Gereed'}
                          </button>
                          <button className="btn" style={{ padding: '3px 8px', fontSize: 11 }}
                            onClick={() => router.push(`/project/${p.row_idx}`)}>Detail</button>
                          {mode === 'editor' && (
                            <button className="btn" style={{ padding: '3px 8px', fontSize: 11 }}
                              onClick={() => openProjectModal(p.row_idx)}>✎</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status picker dropdown */}
      {picker && (
        <div
          ref={pickerRef}
          className="status-picker"
          style={{ position: 'fixed', left: picker.x, top: picker.y }}
        >
          {STATUS_VALUES.map(s => (
            <button
              key={s}
              className="sp-option"
              onClick={() => applyStatus(s)}
            >
              <span className={`badge badge-${statusClass(s)}`} style={{ minWidth: 8, height: 8, padding: 0, borderRadius: '50%', width: 8 }} />
              {s}
            </button>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', margin: '4px -4px', paddingTop: 4 }}>
            <button
              className="sp-option"
              onClick={() => applyStatus('' as StatusValue)}
              style={{ color: 'var(--text-3)' }}
            >
              Wissen
            </button>
          </div>
        </div>
      )}

      {/* Project modal */}
      <Modal
        open={projectModal.open}
        onClose={() => setProjectModal({ open: false, rowIdx: null })}
        title={projectModal.rowIdx === null ? 'Nieuw project' : 'Project bewerken'}
        footer={
          <>
            {projectModal.rowIdx !== null && (
              <button
                className="btn btn-danger"
                style={{ marginRight: 'auto' }}
                onClick={async () => {
                  if (!confirm('Project verwijderen?')) return;
                  try {
                    await deleteProject(projectModal.rowIdx!);
                    setProjectModal({ open: false, rowIdx: null });
                    toast('Project verwijderd', 'success');
                  } catch (e) {
                    toast((e as Error).message, 'error');
                  }
                }}
              >
                Verwijderen
              </button>
            )}
            <button className="btn" onClick={() => setProjectModal({ open: false, rowIdx: null })}>Annuleren</button>
            <button className="btn btn-primary" onClick={saveProject}>Opslaan</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {[
            { i: 0, label: 'Projectnummer intern' },
            { i: 1, label: 'Projectnummer extern' },
            { i: 2, label: 'Projectnaam' },
            { i: 5, label: 'WP nummer' },
            { i: 3, label: 'APD Bouwdeel' },
            { i: 4, label: 'Liander Tracédeel' },
            { i: 8, label: 'Engineer' },
            { i: 179, label: 'Projectleider' },
            { i: 180, label: 'Uitvoerder' },
            { i: 181, label: 'Werkvoorbereider' },
          ].map(({ i, label }) => (
            <div key={i} className="field" style={{ marginBottom: 0 }}>
              <label className="field-label">{label}</label>
              <input
                className="field-input"
                value={formData[String(i)] ?? ''}
                onChange={e => setFormData(d => ({ ...d, [String(i)]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
