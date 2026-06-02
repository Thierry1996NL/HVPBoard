'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useProjects } from '@/hooks/useProjects';
import { useToast } from '@/components/ui/ToastProvider';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import { STATUS_VALUES, statusClass } from '@/lib/constants';
import { getProjectNaam, getEngineer, getProjectStatus, getProgressPercent } from '@/lib/utils';
import type { Werkpakket, CelData, StatusValue } from '@/types';



export default function ProjectenPage() {
  const router = useRouter();
  
  const mode = 'editor';
  const { projects, loading, updateCell, createProject, deleteProject } = useProjects();
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
    projects.forEach(p => { const e = getEngineer(p.cel_data); if (e) set.add(e); });
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

      if (filterEngineer && getEngineer(cd) !== filterEngineer) return false;
      if (filterStatus && getProjectStatus(cd) !== filterStatus) return false;

      if (search) {
        const q = search.toLowerCase();
        const searchable = [cd['0'], cd['1'], cd['2'], cd['5'], cd['8']].join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      return true;
    });
  }, [projects, search, filterEngineer, filterStatus, showArchief]);

  // KPI counts
  const kpi = useMemo(() => {
    const counts = { total: rows.length, G: 0, L: 0, R: 0, B: 0 };
    rows.forEach(p => {
      const s = getProjectStatus(p.cel_data);
      if (s === 'Gereed') counts.G++;
      else if (s === 'Loopt') counts.L++;
      else if (s === 'Review') counts.R++;
      else if (s === 'Geblokkeerd') counts.B++;
    });
    return counts;
  }, [rows]);

  // Vaste basiskolommen — geen fase-filtering meer
  const visibleCols = [
    { i: 0, n: 'Proj. nr int.' },
    { i: 2, n: 'Projectnaam' },
    { i: 5, n: 'WP nr' },
    { i: 8, n: 'Engineer' },
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
          <span className="stat-num">{kpi.G}</span>
          <span className="stat-label">Gereed</span>
        </div>
        <div className="stat-card stat-L">
          <span className="stat-num">{kpi.L}</span>
          <span className="stat-label">Loopt</span>
        </div>
        <div className="stat-card stat-R">
          <span className="stat-num">{kpi.R}</span>
          <span className="stat-label">Review</span>
        </div>
        <div className="stat-card stat-B">
          <span className="stat-num">{kpi.B}</span>
          <span className="stat-label">Geblokkeerd</span>
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
            <option value="">Alle engineers</option>
            {engineers.map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          {/* Status filter */}
          <select
            className="field-input"
            style={{ width: 'auto', minWidth: 140, padding: '4px 28px 4px 10px' }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">Alle statussen</option>
            {STATUS_VALUES.map(s => <option key={s} value={s}>{s}</option>)}
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
                <th>Voortgang</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.length + 3}>
                    <div className="empty-state">
                      <strong>Geen projecten gevonden</strong>
                      Pas de filters aan of maak een nieuw project aan.
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map(p => {
                  const cd = p.cel_data;
                  const progress = getProgressPercent(cd, []);
                  const overallStatus = getProjectStatus(cd);

                  return (
                    <tr key={p.row_idx} style={{ cursor: 'pointer' }} onClick={() => router.push(`/project/${p.row_idx}`)}>
                      {visibleCols.map(col => {
                        const val = cd[String(col.i)] ?? '';
                        const isStatus = isStatusCol(col.i);

                        return (
                          <td
                            key={col.i}
                            className={isStatus && mode === 'editor' ? 'editable' : ''}
                            onClick={isStatus ? (e) => { e.stopPropagation(); openPicker(e, p.row_idx, col.i); } : undefined}
                          >
                            {isStatus ? (
                              <StatusBadge status={val as StatusValue} />
                            ) : (
                              <span>{val || <span style={{ color: 'var(--text-3)' }}>—</span>}</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Progress */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${progress}%` }} />
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text-3)', minWidth: 26 }}>{progress}%</span>
                        </div>
                      </td>

                      {/* Overall status */}
                      <td><StatusBadge status={overallStatus} /></td>

                      {/* Actions */}
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn"
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            onClick={() => router.push(`/project/${p.row_idx}`)}
                          >
                            Detail
                          </button>
                          {mode === 'editor' && (
                            <button
                              className="btn"
                              style={{ padding: '3px 8px', fontSize: 11 }}
                              onClick={() => openProjectModal(p.row_idx)}
                            >
                              ✎
                            </button>
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
