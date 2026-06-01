'use client';

import { useState, useMemo } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { useModuleData } from '@/hooks/useModuleData';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import { STATUS_VALUES, statusClass } from '@/lib/constants';
import type { StatusValue } from '@/types';

interface Boring {
  id: string;
  werkpakket_id: number;
  boring_nr: string;
  type_boring?: string;
  locatie?: string;
  lengte_m?: number;
  diameter_mm?: number;
  diepte_m?: number;
  aannemer?: string;
  startdatum?: string;
  einddatum?: string;
  vergunning_nodig?: boolean;
  opmerkingen?: string;
  status: StatusValue;
}

const TYPES = ['HDD', 'Gestuurde boring', 'Persing', 'Microtunneling', 'Anders'];

export default function BoringenPage() {
  const mode = 'editor';
  const toast = useToast();
  const { data, projects, loading, save, remove } = useModuleData<Boring>('boringen', 'boring_nr');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [sortCol, setSortCol] = useState<keyof Boring | null>(null);
  const [sortDir, setSortDir] = useState(1);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Boring>>({ status: 'Nog te starten', type_boring: 'HDD' });

  const stats = useMemo(() => ({
    total: data.length,
    G: data.filter(d => d.status === 'Gereed').length,
    L: data.filter(d => d.status === 'Loopt').length,
    R: data.filter(d => d.status === 'Review').length,
    B: data.filter(d => d.status === 'Geblokkeerd').length,
  }), [data]);

  const rows = useMemo(() => {
    let r = data.filter(d => {
      if (filterStatus && d.status !== filterStatus) return false;
      if (filterProject && String(d.werkpakket_id) !== filterProject) return false;
      if (search) {
        const q = search.toLowerCase();
        return [d.boring_nr, d.type_boring, d.locatie, d.aannemer].some(v => (v ?? '').toLowerCase().includes(q));
      }
      return true;
    });
    if (sortCol) {
      r = [...r].sort((a, b) => {
        const av = String(a[sortCol] ?? ''), bv = String(b[sortCol] ?? '');
        return av < bv ? -sortDir : av > bv ? sortDir : 0;
      });
    }
    return r;
  }, [data, search, filterStatus, filterProject, sortCol, sortDir]);

  const sort = (col: keyof Boring) => {
    if (sortCol === col) setSortDir(d => -d);
    else { setSortCol(col); setSortDir(1); }
  };

  const openModal = (id?: string) => {
    if (id) {
      const d = data.find(x => x.id === id);
      setForm(d ? { ...d } : {});
      setEditId(id);
    } else {
      setForm({ status: 'Nog te starten', type_boring: 'HDD' });
      setEditId(null);
    }
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.boring_nr?.trim()) { toast('Boring nr. is verplicht', 'error'); return; }
    if (!form.werkpakket_id) { toast('Kies een project', 'error'); return; }
    try {
      await save(editId, form as Partial<Boring>);
      toast(editId ? '✓ Opgeslagen' : '✓ Boring toegevoegd', 'success');
      setModal(false);
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  const handleDelete = async () => {
    if (!editId || !confirm('Boring verwijderen?')) return;
    try {
      await remove(editId);
      toast('✓ Verwijderd', 'success');
      setModal(false);
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  if (loading) return <div className="page-content"><div className="loading-bar" /></div>;

  return (
    <div className="page-content">
      <div className="stats-bar">
        <div className="stat-card"><span className="stat-num">{stats.total}</span><span className="stat-label">Boringen</span></div>
        <div className="stat-card stat-G"><span className="stat-num">{stats.G}</span><span className="stat-label">Gereed</span></div>
        <div className="stat-card stat-L"><span className="stat-num">{stats.L}</span><span className="stat-label">Loopt</span></div>
        <div className="stat-card stat-R"><span className="stat-num">{stats.R}</span><span className="stat-label">Review</span></div>
        <div className="stat-card stat-B"><span className="stat-num">{stats.B}</span><span className="stat-label">Geblokkeerd</span></div>
      </div>

      <div className="controls-bar">
        <div className="search-wrap">
          <span className="search-icon"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" /><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span>
          <input className="search-input" placeholder="Zoeken..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Alle statussen</option>
          {STATUS_VALUES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px', minWidth: 160 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">Alle projecten</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        {mode === 'editor' && <button className="btn btn-primary" onClick={() => openModal()}>+ Boring toevoegen</button>}
      </div>

      <div className="table-wrap">
        <div className="tbl-scroll">
          <table>
            <thead>
              <tr>
                {([['boring_nr','Boring nr.'],['type_boring','Type'],['locatie','Locatie'],['lengte_m','Lengte (m)'],['diameter_mm','⌀ (mm)'],['diepte_m','Diepte (m)'],['aannemer','Aannemer'],['status','Status']] as [keyof Boring, string][]).map(([col, label]) => (
                  <th key={col} className="sortable" onClick={() => sort(col)}>
                    {label}{sortCol === col ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
                <th>Project</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={10}><div className="empty-state"><strong>Geen boringen gevonden</strong>Voeg een boring toe.</div></td></tr>
              ) : rows.map(d => (
                <tr key={d.id} onClick={() => openModal(d.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600 }}>{d.boring_nr}</td>
                  <td>{d.type_boring || '—'}</td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.locatie || '—'}</td>
                  <td>{d.lengte_m ?? '—'}</td>
                  <td>{d.diameter_mm ?? '—'}</td>
                  <td>{d.diepte_m ?? '—'}</td>
                  <td>{d.aannemer || '—'}</td>
                  <td><StatusBadge status={d.status} /></td>
                  <td style={{ fontSize: 11, color: 'var(--text-2)' }}>{projects.find(p => p.id === d.werkpakket_id)?.label ?? '—'}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => openModal(d.id)}>✎</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editId ? 'Boring bewerken' : 'Boring toevoegen'}
        footer={
          <>
            {editId && <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={handleDelete}>Verwijderen</button>}
            <button className="btn" onClick={() => setModal(false)}>Annuleren</button>
            <button className="btn btn-primary" onClick={handleSave}>Opslaan</button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
          <Fld label="Boring nr. *"><input className="field-input" value={form.boring_nr ?? ''} onChange={e => setForm(f => ({ ...f, boring_nr: e.target.value }))} placeholder="B-01" /></Fld>
          <Fld label="Project *">
            <select className="field-input" value={form.werkpakket_id ?? ''} onChange={e => setForm(f => ({ ...f, werkpakket_id: parseInt(e.target.value) }))}>
              <option value="">— Kies project —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </Fld>
          <Fld label="Type">
            <select className="field-input" value={form.type_boring ?? 'HDD'} onChange={e => setForm(f => ({ ...f, type_boring: e.target.value }))}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Fld>
          <Fld label="Locatie" span><input className="field-input" value={form.locatie ?? ''} onChange={e => setForm(f => ({ ...f, locatie: e.target.value }))} placeholder="bijv. Kruising N381" /></Fld>
          <Fld label="Lengte (m)"><input className="field-input" type="number" value={form.lengte_m ?? ''} onChange={e => setForm(f => ({ ...f, lengte_m: parseFloat(e.target.value) || undefined }))} /></Fld>
          <Fld label="Diameter (mm)"><input className="field-input" type="number" value={form.diameter_mm ?? ''} onChange={e => setForm(f => ({ ...f, diameter_mm: parseFloat(e.target.value) || undefined }))} /></Fld>
          <Fld label="Diepte (m NAP)"><input className="field-input" type="number" step="0.01" value={form.diepte_m ?? ''} onChange={e => setForm(f => ({ ...f, diepte_m: parseFloat(e.target.value) || undefined }))} /></Fld>
          <Fld label="Aannemer"><input className="field-input" value={form.aannemer ?? ''} onChange={e => setForm(f => ({ ...f, aannemer: e.target.value }))} /></Fld>
          <Fld label="Startdatum"><input className="field-input" type="date" value={form.startdatum ?? ''} onChange={e => setForm(f => ({ ...f, startdatum: e.target.value }))} /></Fld>
          <Fld label="Einddatum"><input className="field-input" type="date" value={form.einddatum ?? ''} onChange={e => setForm(f => ({ ...f, einddatum: e.target.value }))} /></Fld>
          <Fld label="Status" span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STATUS_VALUES.map(s => (
                <button key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))}
                  className={`badge badge-${statusClass(s)}`}
                  style={{ cursor: 'pointer', border: form.status === s ? '2px solid currentColor' : '1px solid transparent', padding: '4px 10px', fontSize: 11, fontWeight: 600 }}>
                  {s}
                </button>
              ))}
            </div>
          </Fld>
          <Fld label="Opmerkingen" span><textarea className="field-input" rows={2} value={form.opmerkingen ?? ''} onChange={e => setForm(f => ({ ...f, opmerkingen: e.target.value }))} style={{ resize: 'vertical' }} /></Fld>
        </div>
      </Modal>
    </div>
  );
}

function Fld({ label, children, span }: { label: string; children: React.ReactNode; span?: boolean }) {
  return (
    <div style={{ gridColumn: span ? '1 / -1' : undefined }}>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
