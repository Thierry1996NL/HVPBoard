'use client';

import { useState, useMemo } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { useModuleData } from '@/hooks/useModuleData';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import { STATUS_VALUES, statusClass } from '@/lib/constants';
import type { StatusValue } from '@/types';

interface Omgeving {
  id: string;
  werkpakket_id: number;
  onderwerp: string;
  taak?: string;
  bureau?: string;
  opdracht_datum?: string;
  plandatum?: string;
  rapport_datum?: string;
  gereed?: boolean;
  opmerkingen?: string;
  status: StatusValue;
}

const TAKEN_MAP: Record<string, string[]> = {
  Natuurtoets: ['Ecologische quickscan', 'Vervolgonderzoek', 'Natura 2000 toets', 'AERIUS berekening', 'Voortoets'],
  Archeologie: ['Bureauonderzoek', 'Inventariserend veldonderzoek', 'Proefsleuvenonderzoek', 'Definitief onderzoek'],
  Bodem: ['Historisch onderzoek', 'Verkennend bodemonderzoek', 'Nader bodemonderzoek', 'Saneringsplan', 'BUS melding'],
  'NGE/OO': ['Quickscan NGE', 'Detectieonderzoek', 'Begeleiding graafwerk', 'Opsporingsrapport'],
  Geotechnisch: ['Grondonderzoek', 'Thermische grondweerstand', 'Grondwateronderzoek', 'Geotechnisch advies'],
  Vergunningen: ['AVOI-vergunning', 'Omgevingsvergunning', 'CROW-500 melding', 'Watervergunning', 'Kapvergunning'],
};

const ONDERWERPEN = Object.keys(TAKEN_MAP);

export default function OmgevingsmanagementPage() {
  const mode = 'editor';
  const toast = useToast();
  const { data, projects, loading, save, remove } = useModuleData<Omgeving>('omgevingsmanagement', 'onderwerp');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterOnderwerp, setFilterOnderwerp] = useState('');
  const [filterGereed, setFilterGereed] = useState<'all' | 'gereed' | 'open'>('all');
  const [sortCol, setSortCol] = useState<keyof Omgeving | null>(null);
  const [sortDir, setSortDir] = useState(1);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Omgeving>>({ status: 'Nog te starten', onderwerp: ONDERWERPEN[0] });

  const stats = useMemo(() => ({
    total: data.length,
    G: data.filter(d => d.status === 'Gereed').length,
    L: data.filter(d => d.status === 'Loopt').length,
    R: data.filter(d => d.status === 'Review').length,
    B: data.filter(d => d.status === 'Geblokkeerd').length,
    gereed: data.filter(d => d.gereed).length,
  }), [data]);

  const rows = useMemo(() => {
    let r = data.filter(d => {
      if (filterStatus && d.status !== filterStatus) return false;
      if (filterProject && String(d.werkpakket_id) !== filterProject) return false;
      if (filterOnderwerp && d.onderwerp !== filterOnderwerp) return false;
      if (filterGereed === 'gereed' && !d.gereed) return false;
      if (filterGereed === 'open' && d.gereed) return false;
      if (search) {
        const q = search.toLowerCase();
        return [d.onderwerp, d.taak, d.bureau].some(v => (v ?? '').toLowerCase().includes(q));
      }
      return true;
    });
    if (sortCol) r = [...r].sort((a, b) => {
      const av = String(a[sortCol] ?? ''), bv = String(b[sortCol] ?? '');
      return av < bv ? -sortDir : av > bv ? sortDir : 0;
    });
    return r;
  }, [data, search, filterStatus, filterProject, filterOnderwerp, filterGereed, sortCol, sortDir]);

  const sort = (col: keyof Omgeving) => {
    if (sortCol === col) setSortDir(d => -d); else { setSortCol(col); setSortDir(1); }
  };

  const openModal = (id?: string) => {
    if (id) { const d = data.find(x => x.id === id); setForm(d ? { ...d } : {}); setEditId(id); }
    else { setForm({ status: 'Nog te starten', onderwerp: ONDERWERPEN[0] }); setEditId(null); }
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.onderwerp) { toast('Onderwerp is verplicht', 'error'); return; }
    if (!form.werkpakket_id) { toast('Kies een project', 'error'); return; }
    try {
      await save(editId, form as Partial<Omgeving>);
      toast(editId ? '✓ Opgeslagen' : '✓ Item toegevoegd', 'success');
      setModal(false);
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  const handleDelete = async () => {
    if (!editId || !confirm('Verwijderen?')) return;
    try { await remove(editId); toast('✓ Verwijderd', 'success'); setModal(false); }
    catch (e) { toast((e as Error).message, 'error'); }
  };

  const takenForOnderwerp = TAKEN_MAP[form.onderwerp ?? ''] ?? [];

  if (loading) return <div className="page-content"><div className="loading-bar" /></div>;

  return (
    <div className="page-content">
      <div className="stats-bar">
        <div className="stat-card"><span className="stat-num">{stats.total}</span><span className="stat-label">Totaal</span></div>
        <div className="stat-card stat-G"><span className="stat-num">{stats.G}</span><span className="stat-label">Gereed</span></div>
        <div className="stat-card stat-L"><span className="stat-num">{stats.L}</span><span className="stat-label">Loopt</span></div>
        <div className="stat-card stat-R"><span className="stat-num">{stats.R}</span><span className="stat-label">Review</span></div>
        <div className="stat-card stat-B"><span className="stat-num">{stats.B}</span><span className="stat-label">Geblokkeerd</span></div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--accent)' }}>
          <span className="stat-num">{stats.gereed}</span><span className="stat-label">Afgerond</span>
        </div>
      </div>
      <div className="controls-bar">
        <div className="search-wrap">
          <span className="search-icon"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" /><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span>
          <input className="search-input" placeholder="Zoeken..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }} value={filterOnderwerp} onChange={e => setFilterOnderwerp(e.target.value)}>
          <option value="">Alle onderwerpen</option>{ONDERWERPEN.map(o => <option key={o}>{o}</option>)}
        </select>
        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Alle statussen</option>{STATUS_VALUES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px', minWidth: 140 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">Alle projecten</option>{projects.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }} value={filterGereed} onChange={e => setFilterGereed(e.target.value as 'all' | 'gereed' | 'open')}>
          <option value="all">Alle taken</option>
          <option value="open">Nog open</option>
          <option value="gereed">Afgerond</option>
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => openModal()}>+ Taak toevoegen</button>
      </div>

      <div className="table-wrap"><div className="tbl-scroll">
        <table>
          <thead><tr>
            {([['onderwerp','Onderwerp'],['taak','Taak'],['bureau','Bureau'],['opdracht_datum','Opdracht'],['plandatum','Plandatum'],['rapport_datum','Rapport'],['status','Status'],['gereed','Afgerond']] as [keyof Omgeving, string][]).map(([col, label]) => (
              <th key={col} className="sortable" onClick={() => sort(col)}>{label}{sortCol === col ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}</th>
            ))}
            <th>Project</th><th></th>
          </tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={10}><div className="empty-state"><strong>Geen items gevonden</strong></div></td></tr>
            ) : rows.map(d => (
              <tr key={d.id} style={{ cursor: 'pointer', opacity: d.gereed ? 0.65 : 1 }} onClick={() => openModal(d.id)}>
                <td style={{ fontWeight: 600 }}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, background: 'var(--accent)', color: '#fff', fontWeight: 600 }}>{d.onderwerp}</span>
                </td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.taak || '—'}</td>
                <td>{d.bureau || '—'}</td>
                <td style={{ fontSize: 12 }}>{d.opdracht_datum ? new Date(d.opdracht_datum).toLocaleDateString('nl-NL') : '—'}</td>
                <td style={{ fontSize: 12 }}>{d.plandatum ? new Date(d.plandatum).toLocaleDateString('nl-NL') : '—'}</td>
                <td style={{ fontSize: 12 }}>{d.rapport_datum ? new Date(d.rapport_datum).toLocaleDateString('nl-NL') : '—'}</td>
                <td><StatusBadge status={d.status} /></td>
                <td><span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', background: d.gereed ? 'var(--g-fg)' : 'var(--border)', border: '1px solid var(--border)' }} title={d.gereed ? 'Afgerond' : 'Nog open'} /></td>
                <td style={{ fontSize: 11, color: 'var(--text-2)' }}>{projects.find(p => p.id === d.werkpakket_id)?.label ?? '—'}</td>
                <td onClick={e => e.stopPropagation()}><button className="btn" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => openModal(d.id)}>✎</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Taak bewerken' : 'Taak toevoegen'}
        footer={<>
          {editId && <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={handleDelete}>Verwijderen</button>}
          <button className="btn" onClick={() => setModal(false)}>Annuleren</button>
          <button className="btn btn-primary" onClick={handleSave}>Opslaan</button>
        </>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
          <F label="Onderwerp *">
            <select className="field-input" value={form.onderwerp ?? ''} onChange={e => setForm(f => ({ ...f, onderwerp: e.target.value, taak: '' }))}>
              <option value="">— Kies onderwerp —</option>{ONDERWERPEN.map(o => <option key={o}>{o}</option>)}
            </select>
          </F>
          <F label="Taak">
            <select className="field-input" value={form.taak ?? ''} onChange={e => setForm(f => ({ ...f, taak: e.target.value }))} disabled={!form.onderwerp}>
              <option value="">— Kies taak —</option>{takenForOnderwerp.map(t => <option key={t}>{t}</option>)}
            </select>
          </F>
          <F label="Project *">
            <select className="field-input" value={form.werkpakket_id ?? ''} onChange={e => setForm(f => ({ ...f, werkpakket_id: parseInt(e.target.value) }))}><option value="">— Kies project —</option>{projects.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
          </F>
          <F label="Bureau / opdrachtnemer"><input className="field-input" value={form.bureau ?? ''} onChange={e => setForm(f => ({ ...f, bureau: e.target.value }))} /></F>
          <F label="Opdrachtdatum"><input className="field-input" type="date" value={form.opdracht_datum ?? ''} onChange={e => setForm(f => ({ ...f, opdracht_datum: e.target.value }))} /></F>
          <F label="Plandatum"><input className="field-input" type="date" value={form.plandatum ?? ''} onChange={e => setForm(f => ({ ...f, plandatum: e.target.value }))} /></F>
          <F label="Rapportdatum"><input className="field-input" type="date" value={form.rapport_datum ?? ''} onChange={e => setForm(f => ({ ...f, rapport_datum: e.target.value }))} /></F>
          <F label="Status">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 4 }}>
              {STATUS_VALUES.map(s => (
                <button key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))}
                  className={`badge badge-${statusClass(s)}`}
                  style={{ cursor: 'pointer', border: form.status === s ? '2px solid currentColor' : '1px solid transparent', padding: '4px 10px', fontSize: 11, fontWeight: 600 }}>{s}</button>
              ))}
            </div>
          </F>
          <F label="Taak afgerond" span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }}>
              <input type="checkbox" checked={form.gereed ?? false} onChange={e => setForm(f => ({ ...f, gereed: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
              <span style={{ fontSize: 13 }}>Onderzoek / taak is afgerond</span>
            </label>
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
