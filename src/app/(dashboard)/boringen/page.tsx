'use client';

import { useState, useMemo } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { useModuleData } from '@/hooks/useModuleData';
import Modal from '@/components/ui/Modal';
import { STATUS_VALUES, statusClass } from '@/lib/constants';
import type { StatusValue } from '@/types';

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface Boring {
  id: string;
  werkpakket_id: number;
  boring_nr: string;
  werkpakket_nr?: string;
  locatie?: string;
  lengte_m?: number;
  type_boring?: string;
  aannemer?: string;
  klasse?: string;
  prioritering?: string;
  oplevering_toolgate?: string;
  planning_apds?: string;
  apd_verantw?: string;
  status_ontwerp?: string;
  hdd_tek_pct?: number;
  status_werkterrein?: string;
  status_berekening?: string;
  proefsleuf_nr?: string;
  sondering_nr?: string;
  bundel_configuratie?: string;
  opmerkingen?: string;
  status: StatusValue;
  vervallen?: boolean;
}

/* ── Constanten ─────────────────────────────────────────────────────────────── */
const TYPES_BORING   = ['Gyro', 'Walk-over', 'Walkover', 'Nanodrill', 'Avegaar', 'Anders'];
const KLASSEN        = ['9T', '17T', '27T', '50T', '>50T', '120T'];
const AANNEMERS      = ['Heijmans', 'Heijmans DTE', 'Heijmans (Nano)', 'Pol', 'Voskuilen', 'Van Voskuilen', 'Pol/Voskuilen', 'Anders'];
const ONTWERP_STATUS = ['Niet gestart', 'Gestart', 'Ter controle', 'Goedgekeurd', 'Vrijgegeven', 'Issue', 'Vertraagd', 'Vervallen'];
const OVERIGE_STATUS = ['Niet gestart', 'Gestart', 'Ter controle', 'Goedgekeurd', 'Vrijgegeven', 'Voldoet', 'N.v.t.', 'Vervallen'];

/* Badge voor HDD-specifieke statussen */
function OntwerpBadge({ status }: { status?: string }) {
  if (!status) return <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>;
  const s = status.toLowerCase();
  let fg = 'var(--n-fg)', bg = 'var(--n-bg)', border = 'var(--n-mid)';
  if (s === 'vrijgegeven')      { fg = 'var(--g-fg)';  bg = 'var(--g-bg)';  border = 'var(--g-mid)'; }
  else if (s === 'goedgekeurd') { fg = 'var(--g-fg)';  bg = 'var(--g-bg)';  border = 'var(--g-mid)'; }
  else if (s === 'ter controle'){ fg = 'var(--r-fg)';  bg = 'var(--r-bg)';  border = 'var(--r-mid)'; }
  else if (s === 'gestart')     { fg = 'var(--l-fg)';  bg = 'var(--l-bg)';  border = 'var(--l-mid)'; }
  else if (s === 'issue' || s === 'vertraagd') { fg = 'var(--b-fg)'; bg = 'var(--b-bg)'; border = 'var(--b-mid)'; }
  else if (s === 'vervallen')   { fg = 'var(--text-4)'; bg = 'var(--surface3)'; border = 'var(--border)'; }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 500,
      padding: '2px 8px', borderRadius: 20, letterSpacing: '0.01em', whiteSpace: 'nowrap',
      color: fg, background: bg, border: `0.5px solid ${border}` }}>
      {status}
    </span>
  );
}

/* Voortgangsbalk voor tek % */
function TekBar({ pct }: { pct?: number }) {
  if (pct == null) return <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>;
  const p = Math.round(pct * 100);
  const color = p === 100 ? 'var(--g-fg)' : p >= 75 ? 'var(--l-fg)' : p >= 50 ? 'var(--r-fg)' : 'var(--b-fg)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 44, height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ width: `${p}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 10, color, minWidth: 26, fontWeight: 500 }}>{p}%</span>
    </div>
  );
}

/* ── Pagina ─────────────────────────────────────────────────────────────────── */
export default function BoringenPage() {
  const toast = useToast();
  const { data, projects, loading, save, remove } = useModuleData<Boring>('boringen', 'boring_nr');

  const [search, setSearch]               = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterType, setFilterType]       = useState('');
  const [filterKlasse, setFilterKlasse]   = useState('');
  const [filterAannemer, setFilterAannemer] = useState('');
  const [filterStatus, setFilterStatus]   = useState('');
  const [showVervallen, setShowVervallen] = useState(false);
  const [sortCol, setSortCol]             = useState<keyof Boring | null>(null);
  const [sortDir, setSortDir]             = useState(1);
  const [modal, setModal]                 = useState(false);
  const [editId, setEditId]               = useState<string | null>(null);
  const [form, setForm]                   = useState<Partial<Boring>>({
    status: 'Nog te starten', status_ontwerp: 'Niet gestart', vervallen: false
  });

  /* KPI's */
  const stats = useMemo(() => {
    const active = data.filter(d => !d.vervallen);
    return {
      totaal:       active.length,
      vrijgegeven:  active.filter(d => d.status_ontwerp === 'Vrijgegeven').length,
      ter_controle: active.filter(d => d.status_ontwerp === 'Ter controle').length,
      goedgekeurd:  active.filter(d => d.status_ontwerp === 'Goedgekeurd').length,
      issue:        active.filter(d => ['Issue','Vertraagd'].includes(d.status_ontwerp??'')).length,
      vervallen:    data.filter(d => d.vervallen).length,
    };
  }, [data]);

  /* Gefilterde rijen */
  const rows = useMemo(() => {
    let r = data.filter(d => {
      if (!showVervallen && d.vervallen) return false;
      if (showVervallen && !d.vervallen) return false;
      if (filterProject && String(d.werkpakket_id) !== filterProject) return false;
      if (filterType && d.type_boring !== filterType) return false;
      if (filterKlasse && d.klasse !== filterKlasse) return false;
      if (filterAannemer && d.aannemer !== filterAannemer) return false;
      if (filterStatus && d.status_ontwerp !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return [d.boring_nr, d.werkpakket_nr, d.locatie, d.aannemer, d.bundel_configuratie]
          .some(v => (v ?? '').toLowerCase().includes(q));
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
  }, [data, search, filterProject, filterType, filterKlasse, filterAannemer, filterStatus, showVervallen, sortCol, sortDir]);

  const sort = (col: keyof Boring) => {
    if (sortCol === col) setSortDir(d => -d);
    else { setSortCol(col); setSortDir(1); }
  };
  const srt = (col: keyof Boring) => sortCol === col ? (sortDir > 0 ? ' ↑' : ' ↓') : '';

  const openModal = (id?: string) => {
    if (id) {
      const d = data.find(x => x.id === id);
      setForm(d ? { ...d } : {});
      setEditId(id);
    } else {
      setForm({ status: 'Nog te starten', status_ontwerp: 'Niet gestart', vervallen: false });
      setEditId(null);
    }
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.boring_nr?.trim()) { toast('Boor nr. is verplicht', 'error'); return; }
    if (!form.werkpakket_id)     { toast('Kies een project', 'error'); return; }
    // Afleiden app-status van ontwerp-status
    const os = form.status_ontwerp ?? '';
    let appStatus: StatusValue = 'Nog te starten';
    if (os === 'Vrijgegeven' || os === 'Goedgekeurd') appStatus = 'Gereed';
    else if (os === 'Ter controle') appStatus = 'Review';
    else if (os === 'Gestart')      appStatus = 'Loopt';
    else if (os === 'Issue' || os === 'Vertraagd') appStatus = 'Geblokkeerd';
    try {
      await save(editId, { ...form, status: appStatus, vervallen: form.vervallen ?? false } as Partial<Boring>);
      toast(editId ? '✓ Opgeslagen' : '✓ Boring toegevoegd', 'success');
      setModal(false);
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  const handleDelete = async () => {
    if (!editId || !confirm('Boring verwijderen?')) return;
    try { await remove(editId); toast('✓ Verwijderd', 'success'); setModal(false); }
    catch (e) { toast((e as Error).message, 'error'); }
  };

  if (loading) return <div className="page-content"><div className="loading-bar" /></div>;

  return (
    <div className="page-content">

      {/* KPI balk */}
      <div className="stats-bar">
        <div className="stat-card">
          <span className="stat-num">{stats.totaal}</span>
          <span className="stat-label">Actief</span>
        </div>
        <div className="stat-card stat-G">
          <span className="stat-num">{stats.vrijgegeven}</span>
          <span className="stat-label">Vrijgegeven</span>
        </div>
        <div className="stat-card stat-G">
          <span className="stat-num">{stats.goedgekeurd}</span>
          <span className="stat-label">Goedgekeurd</span>
        </div>
        <div className="stat-card stat-R">
          <span className="stat-num">{stats.ter_controle}</span>
          <span className="stat-label">Ter controle</span>
        </div>
        <div className="stat-card stat-B">
          <span className="stat-num">{stats.issue}</span>
          <span className="stat-label">Issue / Vertraagd</span>
        </div>
        <div className="stat-card" style={{ opacity: 0.55 }}>
          <span className="stat-num">{stats.vervallen}</span>
          <span className="stat-label">Vervallen</span>
        </div>
      </div>

      {/* Controls */}
      <div className="controls-bar">
        <div className="search-wrap">
          <span className="search-icon">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
          <input className="search-input" placeholder="Zoeken op nr, locatie, bundel..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px', minWidth: 140 }}
          value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">Alle projecten</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>

        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }}
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Alle statussen</option>
          {ONTWERP_STATUS.map(s => <option key={s}>{s}</option>)}
        </select>

        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }}
          value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Gyro + Walk-over</option>
          {TYPES_BORING.map(t => <option key={t}>{t}</option>)}
        </select>

        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }}
          value={filterKlasse} onChange={e => setFilterKlasse(e.target.value)}>
          <option value="">Alle klassen</option>
          {KLASSEN.map(k => <option key={k}>{k}</option>)}
        </select>

        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }}
          value={filterAannemer} onChange={e => setFilterAannemer(e.target.value)}>
          <option value="">Alle aannemers</option>
          {AANNEMERS.map(a => <option key={a}>{a}</option>)}
        </select>

        <button className={`tab${showVervallen ? ' active' : ''}`}
          onClick={() => setShowVervallen(v => !v)} style={{ fontSize: 11 }}>
          {showVervallen ? '✕ Vervallen' : 'Toon vervallen'}
        </button>

        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => openModal()}>+ Boring toevoegen</button>
      </div>

      {/* Tabel */}
      <div className="table-wrap">
        <div className="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th className="sortable" onClick={() => sort('boring_nr')}>Boor nr{srt('boring_nr')}</th>
                <th className="sortable" onClick={() => sort('werkpakket_nr')}>WP{srt('werkpakket_nr')}</th>
                <th className="sortable" onClick={() => sort('locatie')}>Locatie{srt('locatie')}</th>
                <th className="sortable" onClick={() => sort('lengte_m')}>L (m){srt('lengte_m')}</th>
                <th className="sortable" onClick={() => sort('type_boring')}>Type{srt('type_boring')}</th>
                <th className="sortable" onClick={() => sort('klasse')}>Klasse{srt('klasse')}</th>
                <th className="sortable" onClick={() => sort('aannemer')}>Aannemer{srt('aannemer')}</th>
                <th className="sortable" onClick={() => sort('status_ontwerp')}>HDD Ontwerp{srt('status_ontwerp')}</th>
                <th>Tek %</th>
                <th className="sortable" onClick={() => sort('status_werkterrein')}>Werkterrein{srt('status_werkterrein')}</th>
                <th className="sortable" onClick={() => sort('status_berekening')}>Berekening{srt('status_berekening')}</th>
                <th className="sortable" onClick={() => sort('oplevering_toolgate')}>Toolgate{srt('oplevering_toolgate')}</th>
                <th>Bundel</th>
                <th>Project</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={15}>
                  <div className="empty-state">
                    <strong>Geen boringen gevonden</strong>
                    Pas de filters aan of voeg een boring toe.
                  </div>
                </td></tr>
              ) : rows.map(d => (
                <tr key={d.id}
                  onClick={() => openModal(d.id)}
                  style={{ cursor: 'pointer', opacity: d.vervallen ? 0.45 : 1 }}>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{d.boring_nr}</td>
                  <td style={{ color: 'var(--text-3)', fontSize: 11 }}>{d.werkpakket_nr || '—'}</td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-2)' }}>
                    {d.locatie || '—'}
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{d.lengte_m ?? '—'}</td>
                  <td>{d.type_boring || '—'}</td>
                  <td>
                    {d.klasse ? (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                        background: 'var(--surface3)', color: 'var(--text-2)', border: '0.5px solid var(--border)' }}>
                        {d.klasse}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{d.aannemer || '—'}</td>
                  <td><OntwerpBadge status={d.status_ontwerp} /></td>
                  <td><TekBar pct={d.hdd_tek_pct} /></td>
                  <td><OntwerpBadge status={d.status_werkterrein} /></td>
                  <td><OntwerpBadge status={d.status_berekening} /></td>
                  <td style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {d.oplevering_toolgate
                      ? new Date(d.oplevering_toolgate).toLocaleDateString('nl-NL', {day:'2-digit',month:'2-digit',year:'numeric'})
                      : '—'}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-3)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {d.bundel_configuratie || '—'}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {projects.find(p => p.id === d.werkpakket_id)?.label ?? '—'}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => openModal(d.id)}>✎</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editId ? `${form.boring_nr ?? 'Boring'} bewerken` : 'Boring toevoegen'}
        maxWidth={600}
        footer={<>
          {editId && <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={handleDelete}>Verwijderen</button>}
          <button className="btn" onClick={() => setModal(false)}>Annuleren</button>
          <button className="btn btn-primary" onClick={handleSave}>Opslaan</button>
        </>}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>

          <F label="Boor nr. *">
            <input className="field-input" value={form.boring_nr ?? ''} placeholder="HDD-001"
              onChange={e => setForm(f => ({ ...f, boring_nr: e.target.value }))} />
          </F>
          <F label="Project *">
            <select className="field-input" value={form.werkpakket_id ?? ''}
              onChange={e => setForm(f => ({ ...f, werkpakket_id: parseInt(e.target.value) }))}>
              <option value="">— Kies project —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </F>

          <F label="Werkpakket nr.">
            <input className="field-input" value={form.werkpakket_nr ?? ''} placeholder="WP01"
              onChange={e => setForm(f => ({ ...f, werkpakket_nr: e.target.value }))} />
          </F>
          <F label="APD verantwoordelijk">
            <input className="field-input" value={form.apd_verantw ?? ''} placeholder="ApD-1"
              onChange={e => setForm(f => ({ ...f, apd_verantw: e.target.value }))} />
          </F>

          <F label="Locatie" span>
            <input className="field-input" value={form.locatie ?? ''} placeholder="bijv. RSAKK - DR01"
              onChange={e => setForm(f => ({ ...f, locatie: e.target.value }))} />
          </F>

          <F label="Lengte HDD (m)">
            <input className="field-input" type="number" value={form.lengte_m ?? ''}
              onChange={e => setForm(f => ({ ...f, lengte_m: parseFloat(e.target.value) || undefined }))} />
          </F>
          <F label="Type boring">
            <select className="field-input" value={form.type_boring ?? ''}
              onChange={e => setForm(f => ({ ...f, type_boring: e.target.value }))}>
              <option value="">— Kies type —</option>
              {TYPES_BORING.map(t => <option key={t}>{t}</option>)}
            </select>
          </F>

          <F label="Klasse">
            <select className="field-input" value={form.klasse ?? ''}
              onChange={e => setForm(f => ({ ...f, klasse: e.target.value }))}>
              <option value="">— Kies klasse —</option>
              {KLASSEN.map(k => <option key={k}>{k}</option>)}
            </select>
          </F>
          <F label="Aannemer">
            <select className="field-input" value={form.aannemer ?? ''}
              onChange={e => setForm(f => ({ ...f, aannemer: e.target.value }))}>
              <option value="">— Kies aannemer —</option>
              {AANNEMERS.map(a => <option key={a}>{a}</option>)}
            </select>
          </F>

          <F label="Bundel configuratie" span>
            <input className="field-input" value={form.bundel_configuratie ?? ''} placeholder="bijv. 1x200mm + 1x160mm"
              onChange={e => setForm(f => ({ ...f, bundel_configuratie: e.target.value }))} />
          </F>

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ height: '0.5px', background: 'var(--border)', margin: '0.25rem 0 0.875rem' }} />
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-4)', marginBottom: '0.875rem' }}>
              Voortgang & Status
            </div>
          </div>

          <F label="HDD Ontwerp status">
            <select className="field-input" value={form.status_ontwerp ?? 'Niet gestart'}
              onChange={e => setForm(f => ({ ...f, status_ontwerp: e.target.value }))}>
              {ONTWERP_STATUS.map(s => <option key={s}>{s}</option>)}
            </select>
          </F>
          <F label="HDD tek %">
            <select className="field-input" value={form.hdd_tek_pct ?? ''}
              onChange={e => setForm(f => ({ ...f, hdd_tek_pct: e.target.value ? parseFloat(e.target.value) : undefined }))}>
              <option value="">—</option>
              <option value="0">0% — Niet gestart</option>
              <option value="0.25">25% — Gestart</option>
              <option value="0.5">50% — In behandeling</option>
              <option value="0.75">75% — Ter controle</option>
              <option value="1">100% — Vrijgegeven</option>
            </select>
          </F>

          <F label="Werkterrein inrichting">
            <select className="field-input" value={form.status_werkterrein ?? ''}
              onChange={e => setForm(f => ({ ...f, status_werkterrein: e.target.value }))}>
              <option value="">—</option>
              {OVERIGE_STATUS.map(s => <option key={s}>{s}</option>)}
            </select>
          </F>
          <F label="Berekening">
            <select className="field-input" value={form.status_berekening ?? ''}
              onChange={e => setForm(f => ({ ...f, status_berekening: e.target.value }))}>
              <option value="">—</option>
              {OVERIGE_STATUS.map(s => <option key={s}>{s}</option>)}
            </select>
          </F>

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ height: '0.5px', background: 'var(--border)', margin: '0.25rem 0 0.875rem' }} />
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-4)', marginBottom: '0.875rem' }}>
              Planning & Referenties
            </div>
          </div>

          <F label="Oplevering Toolgate Liander">
            <input className="field-input" type="date" value={form.oplevering_toolgate ?? ''}
              onChange={e => setForm(f => ({ ...f, oplevering_toolgate: e.target.value }))} />
          </F>
          <F label="Planning APD's">
            <input className="field-input" type="date" value={form.planning_apds ?? ''}
              onChange={e => setForm(f => ({ ...f, planning_apds: e.target.value }))} />
          </F>

          <F label="Proefsleuf nr.">
            <input className="field-input" value={form.proefsleuf_nr ?? ''}
              onChange={e => setForm(f => ({ ...f, proefsleuf_nr: e.target.value }))} />
          </F>
          <F label="Sondering nr.">
            <input className="field-input" value={form.sondering_nr ?? ''}
              onChange={e => setForm(f => ({ ...f, sondering_nr: e.target.value }))} />
          </F>

          <F label="Prioritering">
            <input className="field-input" value={form.prioritering ?? ''} placeholder="bijv. PRIO"
              onChange={e => setForm(f => ({ ...f, prioritering: e.target.value }))} />
          </F>
          <F label="Boring is vervallen">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 6 }}>
              <input type="checkbox" checked={form.vervallen ?? false}
                onChange={e => setForm(f => ({ ...f, vervallen: e.target.checked }))}
                style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Ja, boring is vervallen</span>
            </label>
          </F>

          <F label="Opmerkingen" span>
            <textarea className="field-input" rows={3} value={form.opmerkingen ?? ''}
              onChange={e => setForm(f => ({ ...f, opmerkingen: e.target.value }))}
              style={{ resize: 'vertical' }} />
          </F>
        </div>
      </Modal>
    </div>
  );
}

function F({ label, children, span }: { label: string; children: React.ReactNode; span?: boolean }) {
  return (
    <div style={{ gridColumn: span ? '1 / -1' : undefined }}>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
