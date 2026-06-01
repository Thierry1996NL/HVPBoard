'use client';

import { useState, useMemo } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { useModuleData } from '@/hooks/useModuleData';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import { STATUS_VALUES, statusClass } from '@/lib/constants';
import type { StatusValue } from '@/types';

interface Proefsleuv {
  id: string;
  werkpakket_id: number;
  proefsleuv_nr: string;
  type?: string;
  locatie?: string;
  lengte_m?: number;
  breedte_m?: number;
  diepte_m?: number;
  aannemer?: string;
  startdatum?: string;
  einddatum?: string;
  opmerkingen?: string;
  status: StatusValue;
}

const TYPES = ['Proefsleuv', 'Inspectieput', 'Proefput', 'Sleuf onderzoek', 'Anders'];

export default function ProefsleuvenPage() {
  const mode = 'editor';
  const toast = useToast();
  const { data, projects, loading, save, remove } = useModuleData<Proefsleuv>('proefsleuven', 'proefsleuv_nr');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [sortCol, setSortCol] = useState<keyof Proefsleuv | null>(null);
  const [sortDir, setSortDir] = useState(1);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Proefsleuv>>({ status: 'Nog te starten', type: 'Proefsleuv' });

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
        return [d.proefsleuv_nr, d.type, d.locatie, d.aannemer].some(v => (v ?? '').toLowerCase().includes(q));
      }
      return true;
    });
    if (sortCol) r = [...r].sort((a, b) => {
      const av = String(a[sortCol] ?? ''), bv = String(b[sortCol] ?? '');
      return av < bv ? -sortDir : av > bv ? sortDir : 0;
    });
    return r;
  }, [data, search, filterStatus, filterProject, sortCol, sortDir]);

  const sort = (col: keyof Proefsleuv) => {
    if (sortCol === col) setSortDir(d => -d); else { setSortCol(col); setSortDir(1); }
  };

  const openModal = (id?: string) => {
    if (id) { const d = data.find(x => x.id === id); setForm(d ? { ...d } : {}); setEditId(id); }
    else { setForm({ status: 'Nog te starten', type: 'Proefsleuv' }); setEditId(null); }
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.proefsleuv_nr?.trim()) { toast('PS nr. is verplicht', 'error'); return; }
    if (!form.werkpakket_id) { toast('Kies een project', 'error'); return; }
    try {
      await save(editId, form as Partial<Proefsleuv>);
      toast(editId ? '✓ Opgeslagen' : '✓ Proefsleuv toegevoegd', 'success');
      setModal(false);
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  const handleDelete = async () => {
    if (!editId || !confirm('Verwijderen?')) return;
    try { await remove(editId); toast('✓ Verwijderd', 'success'); setModal(false); }
    catch (e) { toast((e as Error).message, 'error'); }
  };

  if (loading) return <div className="page-content"><div className="loading-bar" /></div>;

  return (
    <div className="page-content">
      <div className="stats-bar">
        <div className="stat-card"><span className="stat-num">{stats.total}</span><span className="stat-label">Proefsleuven</span></div>
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
          <option value="">Alle statussen</option>{STATUS_VALUES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px', minWidth: 160 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">Alle projecten</option>{projects.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => openModal()}>+ Proefsleuv toevoegen</button>
      </div>
      <div className="table-wrap"><div className="tbl-scroll">
        <table>
          <thead><tr>
            {([['proefsleuv_nr','PS nr.'],['type','Type'],['locatie','Locatie'],['lengte_m','L (m)'],['breedte_m','B (m)'],['diepte_m','D (m)'],['aannemer','Aannemer'],['status','Status']] as [keyof Proefsleuv, string][]).map(([col, label]) => (
              <th key={col} className="sortable" onClick={() => sort(col)}>{label}{sortCol === col ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}</th>
            ))}
            <th>Project</th><th></th>
          </tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={10}><div className="empty-state"><strong>Geen proefsleuven gevonden</strong></div></td></tr>
            ) : rows.map(d => (
              <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => openModal(d.id)}>
                <td style={{ fontWeight: 600 }}>{d.proefsleuv_nr}</td>
                <td>{d.type || '—'}</td>
                <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.locatie || '—'}</td>
                <td>{d.lengte_m ?? '—'}</td><td>{d.breedte_m ?? '—'}</td><td>{d.diepte_m ?? '—'}</td>
                <td>{d.aannemer || '—'}</td>
                <td><StatusBadge status={d.status} /></td>
                <td style={{ fontSize: 11, color: 'var(--text-2)' }}>{projects.find(p => p.id === d.werkpakket_id)?.label ?? '—'}</td>
                <td onClick={e => e.stopPropagation()}><button className="btn" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => openModal(d.id)}>✎</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Proefsleuv bewerken' : 'Proefsleuv toevoegen'}
        footer={<>
          {editId && <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={handleDelete}>Verwijderen</button>}
          <button className="btn" onClick={() => setModal(false)}>Annuleren</button>
          <button className="btn btn-primary" onClick={handleSave}>Opslaan</button>
        </>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
          <F label="PS nr. *"><input className="field-input" value={form.proefsleuv_nr ?? ''} onChange={e => setForm(f => ({ ...f, proefsleuv_nr: e.target.value }))} placeholder="PS-01" /></F>
          <F label="Project *"><select className="field-input" value={form.werkpakket_id ?? ''} onChange={e => setForm(f => ({ ...f, werkpakket_id: parseInt(e.target.value) }))}><option value="">— Kies project —</option>{projects.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></F>
          <F label="Type"><select className="field-input" value={form.type ?? 'Proefsleuv'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></F>
          <F label="Locatie" span><input className="field-input" value={form.locatie ?? ''} onChange={e => setForm(f => ({ ...f, locatie: e.target.value }))} placeholder="bijv. Parallelweg Noord" /></F>
          <F label="Lengte (m)"><input className="field-input" type="number" step="0.1" value={form.lengte_m ?? ''} onChange={e => setForm(f => ({ ...f, lengte_m: parseFloat(e.target.value) || undefined }))} /></F>
          <F label="Breedte (m)"><input className="field-input" type="number" step="0.1" value={form.breedte_m ?? ''} onChange={e => setForm(f => ({ ...f, breedte_m: parseFloat(e.target.value) || undefined }))} /></F>
          <F label="Diepte (m)"><input className="field-input" type="number" step="0.01" value={form.diepte_m ?? ''} onChange={e => setForm(f => ({ ...f, diepte_m: parseFloat(e.target.value) || undefined }))} /></F>
          <F label="Aannemer"><input className="field-input" value={form.aannemer ?? ''} onChange={e => setForm(f => ({ ...f, aannemer: e.target.value }))} /></F>
          <F label="Startdatum"><input className="field-input" type="date" value={form.startdatum ?? ''} onChange={e => setForm(f => ({ ...f, startdatum: e.target.value }))} /></F>
          <F label="Einddatum"><input className="field-input" type="date" value={form.einddatum ?? ''} onChange={e => setForm(f => ({ ...f, einddatum: e.target.value }))} /></F>
          <F label="Status" span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STATUS_VALUES.map(s => (
                <button key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))}
                  className={`badge badge-${statusClass(s)}`}
                  style={{ cursor: 'pointer', border: form.status === s ? '2px solid currentColor' : '1px solid transparent', padding: '4px 10px', fontSize: 11, fontWeight: 600 }}>{s}</button>
              ))}
            </div>
          </F>
          <F label="Opmerkingen" span><textarea className="field-input" rows={2} value={form.opmerkingen ?? ''} onChange={e => setForm(f => ({ ...f, opmerkingen: e.target.value }))} style={{ resize: 'vertical' }} /></F>
        </div>
      </Modal>
    </div>
  );
}

function F({ label, children, span }: { label: string; children: React.ReactNode; span?: boolean }) {
  return <div style={{ gridColumn: span ? '1 / -1' : undefined }}><label className="field-label">{label}</label>{children}</div>;
}
