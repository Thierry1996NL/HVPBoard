'use client';

import { useState, useMemo } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { useModuleData } from '@/hooks/useModuleData';
import Modal from '@/components/ui/Modal';

/* ── Types ──────────────────────────────────────────────────────────────────── */
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
  status: string;
  vervallen?: boolean;
}

/* ── Status kleur-codering (exact zoals Excel) ──────────────────────────────── */
const STATUS_COLORS: Record<string, { bg: string; fg: string; pct: number; label: string }> = {
  'Issue':        { bg: '#D70015', fg: '#fff',     pct: 0,   label: 'Issue' },
  'Gestart':      { bg: '#F5A623', fg: '#fff',     pct: 25,  label: 'Gestart' },
  'Afgekeurd':    { bg: '#E8830A', fg: '#fff',     pct: 40,  label: 'Afgekeurd' },
  'Ter controle': { bg: '#F5C842', fg: '#1A1A1A',  pct: 50,  label: 'Ter controle' },
  'Goedgekeurd':  { bg: '#8BC34A', fg: '#fff',     pct: 75,  label: 'Goedgekeurd' },
  'Vrijgegeven':  { bg: '#1A7F3C', fg: '#fff',     pct: 100, label: 'Vrijgegeven' },
  'Vertraagd':    { bg: '#D70015', fg: '#fff',     pct: 0,   label: 'Vertraagd' },
  'Vervallen':    { bg: '#EBEBEB', fg: '#6E6E73',  pct: 0,   label: 'Vervallen' },
  'Niet gestart': { bg: '#F5F5F7', fg: '#6E6E73',  pct: 0,   label: 'Niet gestart' },
};

function StatusPill({ status }: { status?: string }) {
  if (!status) return <span style={{ color: '#9CA3AF', fontSize: 11 }}>—</span>;
  const c = STATUS_COLORS[status] ?? { bg: '#F3F4F6', fg: '#374151', pct: 0, label: status };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
      background: c.bg, color: c.fg, fontSize: 11, fontWeight: 600,
      padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  );
}

function TekBar({ pct }: { pct?: number }) {
  if (pct == null) return <span style={{ color: '#9CA3AF', fontSize: 11 }}>—</span>;
  const p = Math.round(pct * 100);
  const c = STATUS_COLORS[
    p === 100 ? 'Vrijgegeven' : p >= 75 ? 'Goedgekeurd' : p >= 50 ? 'Ter controle' : p > 0 ? 'Gestart' : 'Niet gestart'
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#E5E7EB', overflow: 'hidden', minWidth: 80 }}>
        <div style={{ width: `${p}%`, height: '100%', background: c.bg, borderRadius: 3, transition: 'width .3s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: c.bg, minWidth: 34 }}>{p}%</span>
    </div>
  );
}

/* ── Detail modal ───────────────────────────────────────────────────────────── */
function BoringDetail({
  boring, project, onClose, onEdit,
}: {
  boring: Boring;
  project?: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  const vervallen = boring.vervallen;

  return (
    <Modal open onClose={onClose} maxWidth={680}
      title={`${boring.boring_nr}${vervallen ? ' — Vervallen' : ''}${boring.prioritering ? ` ⚑ ${boring.prioritering}` : ''}`}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: 11, color: '#9CA3AF', flex: 1 }}>{project}</span>
          <button className="btn" onClick={onClose}>Sluiten</button>
          <button className="btn btn-primary" onClick={onEdit} style={{ marginLeft: 8 }}>✎ Bewerken</button>
        </div>
      }>

      {/* ── Sectie 1: HDD Gegevens ─────────────────────────────────────────── */}
      <Section title="HDD Gegevens">
        <Grid>
          <Row label="Boor nummer"   value={boring.boring_nr} bold />
          <Row label="Werkpakket"    value={boring.werkpakket_nr} />
          <Row label="Locatie"       value={boring.locatie} span />
          <Row label="Lengte HDD"    value={boring.lengte_m != null ? `${boring.lengte_m} m` : undefined} />
          <Row label="Type"          value={boring.type_boring} />
          <Row label="Klasse"        value={boring.klasse} chip />
          <Row label="Aannemer"      value={boring.aannemer} />
        </Grid>
      </Section>

      {/* ── Sectie 2: Planning ────────────────────────────────────────────── */}
      <Section title="Planning">
        <Grid>
          <Row label="APD verantw."  value={boring.apd_verantw} chip />
          <Row label="Planning APD's" value={boring.planning_apds
            ? new Date(boring.planning_apds).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : undefined} />
          <Row label="Oplevering Toolgate" value={boring.oplevering_toolgate
            ? new Date(boring.oplevering_toolgate).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : undefined} />
        </Grid>
      </Section>

      {/* ── Sectie 3: Tekenwerk & Status ─────────────────────────────────── */}
      <Section title="Tekenwerk & Status">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>

          <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>HDD Ontwerp</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StatusPill status={boring.status_ontwerp} />
              <TekBar pct={boring.hdd_tek_pct} />
            </div>
          </div>

          <StatusRow label="Werkterrein inrichting" status={boring.status_werkterrein} />
          <StatusRow label="Berekening"             status={boring.status_berekening} />
        </div>
      </Section>

      {/* ── Sectie 4: Referenties ─────────────────────────────────────────── */}
      <Section title="Referenties">
        <Grid>
          <Row label="Proefsleuf nr."      value={boring.proefsleuf_nr} />
          <Row label="Sondering nr."       value={boring.sondering_nr} />
          <Row label="Bundel configuratie" value={boring.bundel_configuratie} span />
        </Grid>
      </Section>

      {/* ── Sectie 5: Opmerkingen ─────────────────────────────────────────── */}
      {boring.opmerkingen && (
        <Section title="Opmerkingen">
          <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.6, margin: 0,
            background: '#FFFBEB', border: '0.5px solid #FDE68A', borderRadius: 8,
            padding: '0.75rem 1rem', whiteSpace: 'pre-wrap' }}>
            {boring.opmerkingen}
          </p>
        </Section>
      )}
    </Modal>
  );
}

/* ── Hulpcomponenten detail ──────────────────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.125rem' }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
        color: '#9CA3AF', marginBottom: '0.625rem', paddingBottom: '0.375rem',
        borderBottom: '0.5px solid #E5E7EB' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 160px 1fr', gap: '0.5rem 0.75rem', alignItems: 'center' }}>{children}</div>;
}

function Row({ label, value, bold, span, chip }: { label: string; value?: string | null; bold?: boolean; span?: boolean; chip?: boolean }) {
  return (
    <>
      <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500, gridColumn: span ? '1' : undefined }}>{label}</span>
      <span style={{
        fontSize: 12, fontWeight: bold ? 700 : 500, color: value ? '#0D1520' : '#D1D5DB',
        gridColumn: span ? '2 / -1' : undefined,
      }}>
        {chip && value ? (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 6,
            background: '#F3F4F6', color: '#374151', border: '0.5px solid #E5E7EB' }}>{value}</span>
        ) : (value || '—')}
      </span>
    </>
  );
}

function StatusRow({ label, status }: { label: string; status?: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>{label}</span>
      <StatusPill status={status} />
    </div>
  );
}

/* ── Constanten ─────────────────────────────────────────────────────────────── */
const TYPES_BORING   = ['Gyro', 'Walk-over', 'Walkover', 'Nanodrill', 'Avegaar', 'Anders'];
const KLASSEN        = ['9T', '17T', '27T', '50T', '>50T', '120T'];
const AANNEMERS      = ['Heijmans', 'Heijmans DTE', 'Heijmans (Nano)', 'Pol', 'Voskuilen', 'Van Voskuilen', 'Pol/Voskuilen', 'Anders'];
const ONTWERP_STATUS = ['Niet gestart', 'Gestart', 'Ter controle', 'Goedgekeurd', 'Vrijgegeven', 'Issue', 'Vertraagd', 'Vervallen'];
const OVERIGE_STATUS = ['Niet gestart', 'Gestart', 'Ter controle', 'Goedgekeurd', 'Vrijgegeven', 'Voldoet', 'N.v.t.', 'Vervallen'];

/* ── Hoofd-pagina ───────────────────────────────────────────────────────────── */
export default function BoringenPage() {
  const toast = useToast();
  const { data, projects, loading, save, remove } = useModuleData<Boring>('boringen', 'boring_nr');

  const [search, setSearch]                 = useState('');
  const [filterProject, setFilterProject]   = useState('');
  const [filterType, setFilterType]         = useState('');
  const [filterKlasse, setFilterKlasse]     = useState('');
  const [filterAannemer, setFilterAannemer] = useState('');
  const [filterStatus, setFilterStatus]     = useState('');
  const [showVervallen, setShowVervallen]   = useState(false);
  const [sortCol, setSortCol]               = useState<keyof Boring | null>(null);
  const [sortDir, setSortDir]               = useState(1);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [editId, setEditId]     = useState<string | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState<Partial<Boring>>({ status: 'Nog te starten', status_ontwerp: 'Niet gestart', vervallen: false });

  const detailBoring  = data.find(d => d.id === detailId);
  const detailProject = detailBoring ? projects.find(p => p.id === detailBoring.werkpakket_id)?.label : undefined;

  const stats = useMemo(() => {
    const a = data.filter(d => !d.vervallen);
    return {
      totaal:       a.length,
      vrijgegeven:  a.filter(d => d.status_ontwerp === 'Vrijgegeven').length,
      goedgekeurd:  a.filter(d => d.status_ontwerp === 'Goedgekeurd').length,
      ter_controle: a.filter(d => d.status_ontwerp === 'Ter controle').length,
      issue:        a.filter(d => ['Issue','Vertraagd'].includes(d.status_ontwerp??'')).length,
      vervallen:    data.filter(d => d.vervallen).length,
    };
  }, [data]);

  const rows = useMemo(() => {
    let r = data.filter(d => {
      if (!showVervallen && d.vervallen) return false;
      if (showVervallen && !d.vervallen) return false;
      if (filterProject && String(d.werkpakket_id) !== filterProject) return false;
      if (filterType    && d.type_boring !== filterType) return false;
      if (filterKlasse  && d.klasse !== filterKlasse) return false;
      if (filterAannemer && d.aannemer !== filterAannemer) return false;
      if (filterStatus  && d.status_ontwerp !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return [d.boring_nr, d.werkpakket_nr, d.locatie, d.aannemer, d.bundel_configuratie]
          .some(v => (v ?? '').toLowerCase().includes(q));
      }
      return true;
    });
    if (sortCol) r = [...r].sort((a, b) => {
      const av = String(a[sortCol] ?? ''), bv = String(b[sortCol] ?? '');
      return av < bv ? -sortDir : av > bv ? sortDir : 0;
    });
    return r;
  }, [data, search, filterProject, filterType, filterKlasse, filterAannemer, filterStatus, showVervallen, sortCol, sortDir]);

  const sort = (col: keyof Boring) => {
    if (sortCol === col) setSortDir(d => -d); else { setSortCol(col); setSortDir(1); }
  };
  const srt = (col: keyof Boring) => sortCol === col ? (sortDir > 0 ? ' ↑' : ' ↓') : '';

  const openEdit = (id?: string) => {
    const d = id ? data.find(x => x.id === id) : undefined;
    setForm(d ? { ...d } : { status: 'Nog te starten', status_ontwerp: 'Niet gestart', vervallen: false });
    setEditId(id ?? null);
    setDetailId(null);
    setEditModal(true);
  };

  const handleSave = async () => {
    if (!form.boring_nr?.trim()) { toast('Boor nr. is verplicht', 'error'); return; }
    if (!form.werkpakket_id)     { toast('Kies een project', 'error'); return; }
    const os = form.status_ontwerp ?? '';
    let appStatus = 'Nog te starten';
    if (os === 'Vrijgegeven' || os === 'Goedgekeurd') appStatus = 'Gereed';
    else if (os === 'Ter controle') appStatus = 'Review';
    else if (os === 'Gestart')      appStatus = 'Loopt';
    else if (os === 'Issue' || os === 'Vertraagd') appStatus = 'Geblokkeerd';
    try {
      await save(editId, { ...form, status: appStatus, vervallen: form.vervallen ?? false } as Partial<Boring>);
      toast(editId ? '✓ Opgeslagen' : '✓ Boring toegevoegd', 'success');
      setEditModal(false);
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  const handleDelete = async () => {
    if (!editId || !confirm('Boring verwijderen?')) return;
    try { await remove(editId); toast('✓ Verwijderd', 'success'); setEditModal(false); }
    catch (e) { toast((e as Error).message, 'error'); }
  };

  if (loading) return <div className="page-content"><div className="loading-bar" /></div>;

  return (
    <div className="page-content">

      {/* KPI balk */}
      <div className="stats-bar">
        <div className="stat-card"><span className="stat-num">{stats.totaal}</span><span className="stat-label">Actief</span></div>
        <div className="stat-card stat-G"><span className="stat-num">{stats.vrijgegeven}</span><span className="stat-label">Vrijgegeven</span></div>
        <div className="stat-card stat-G"><span className="stat-num">{stats.goedgekeurd}</span><span className="stat-label">Goedgekeurd</span></div>
        <div className="stat-card stat-R"><span className="stat-num">{stats.ter_controle}</span><span className="stat-label">Ter controle</span></div>
        <div className="stat-card stat-B"><span className="stat-num">{stats.issue}</span><span className="stat-label">Issue / Vertraagd</span></div>
        <div className="stat-card" style={{ opacity: 0.55 }}><span className="stat-num">{stats.vervallen}</span><span className="stat-label">Vervallen</span></div>
      </div>

      {/* Controls */}
      <div className="controls-bar">
        <div className="search-wrap">
          <span className="search-icon"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></span>
          <input className="search-input" placeholder="Zoeken..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px', minWidth: 140 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">Alle projecten</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Alle statussen</option>
          {ONTWERP_STATUS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Alle types</option>
          {TYPES_BORING.map(t => <option key={t}>{t}</option>)}
        </select>
        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }} value={filterKlasse} onChange={e => setFilterKlasse(e.target.value)}>
          <option value="">Alle klassen</option>
          {KLASSEN.map(k => <option key={k}>{k}</option>)}
        </select>
        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }} value={filterAannemer} onChange={e => setFilterAannemer(e.target.value)}>
          <option value="">Alle aannemers</option>
          {AANNEMERS.map(a => <option key={a}>{a}</option>)}
        </select>
        <button className={`tab${showVervallen ? ' active' : ''}`} onClick={() => setShowVervallen(v => !v)} style={{ fontSize: 11 }}>
          {showVervallen ? '✕ Vervallen' : 'Toon vervallen'}
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => openEdit()}>+ Boring toevoegen</button>
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
                <th className="sortable" onClick={() => sort('planning_apds')}>Planning APD{srt('planning_apds')}</th>
                <th className="sortable" onClick={() => sort('planning_apds')}>Weken</th>
                <th>Bundel</th>
                <th>Project</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={16}><div className="empty-state"><strong>Geen boringen gevonden</strong>Pas de filters aan.</div></td></tr>
              ) : rows.map(d => {
                const sc = STATUS_COLORS[d.status_ontwerp ?? ''];
                return (
                  <tr key={d.id} onClick={() => setDetailId(d.id)}
                    style={{ cursor: 'pointer', opacity: d.vervallen ? 0.4 : 1 }}>
                    <td style={{ fontWeight: 600 }}>{d.boring_nr}</td>
                    <td style={{ color: 'var(--text-3)', fontSize: 11 }}>{d.werkpakket_nr || '—'}</td>
                    <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-2)' }}>{d.locatie || '—'}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{d.lengte_m ?? '—'}</td>
                    <td>{d.type_boring || '—'}</td>
                    <td>
                      {d.klasse ? <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                        background: 'var(--surface3)', border: '0.5px solid var(--border)' }}>{d.klasse}</span> : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{d.aannemer || '—'}</td>
                    <td>
                      {sc ? (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                          background: sc.bg, color: sc.fg, whiteSpace: 'nowrap' }}>{d.status_ontwerp}</span>
                      ) : <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>}
                    </td>
                    <td><TekBar pct={d.hdd_tek_pct} /></td>
                    <td>
                      {(() => { const c = STATUS_COLORS[d.status_werkterrein ?? '']; return c
                        ? <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: c.bg, color: c.fg }}>{d.status_werkterrein}</span>
                        : <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>; })()}
                    </td>
                    <td>
                      {(() => { const c = STATUS_COLORS[d.status_berekening ?? '']; return c
                        ? <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: c.bg, color: c.fg }}>{d.status_berekening}</span>
                        : <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>; })()}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                      {d.planning_apds ? new Date(d.planning_apds).toLocaleDateString('nl-NL', {day:'2-digit',month:'2-digit',year:'numeric'}) : '—'}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.bundel_configuratie || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{projects.find(p => p.id === d.werkpakket_id)?.label ?? '—'}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="btn" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => openEdit(d.id)}>✎</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {detailId && detailBoring && (
        <BoringDetail boring={detailBoring} project={detailProject}
          onClose={() => setDetailId(null)}
          onEdit={() => openEdit(detailId)} />
      )}

      {/* Edit modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)}
        title={editId ? `${form.boring_nr ?? 'Boring'} bewerken` : 'Boring toevoegen'}
        maxWidth={600}
        footer={<>
          {editId && <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={handleDelete}>Verwijderen</button>}
          <button className="btn" onClick={() => setEditModal(false)}>Annuleren</button>
          <button className="btn btn-primary" onClick={handleSave}>Opslaan</button>
        </>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
          <F label="Boor nr. *"><input className="field-input" value={form.boring_nr ?? ''} placeholder="HDD-001" onChange={e => setForm(f => ({ ...f, boring_nr: e.target.value }))} /></F>
          <F label="Project *"><select className="field-input" value={form.werkpakket_id ?? ''} onChange={e => setForm(f => ({ ...f, werkpakket_id: parseInt(e.target.value) }))}><option value="">— Kies project —</option>{projects.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></F>
          <F label="Werkpakket nr."><input className="field-input" value={form.werkpakket_nr ?? ''} placeholder="WP01" onChange={e => setForm(f => ({ ...f, werkpakket_nr: e.target.value }))} /></F>
          <F label="APD verantw."><input className="field-input" value={form.apd_verantw ?? ''} placeholder="ApD-1" onChange={e => setForm(f => ({ ...f, apd_verantw: e.target.value }))} /></F>
          <F label="Locatie" span><input className="field-input" value={form.locatie ?? ''} onChange={e => setForm(f => ({ ...f, locatie: e.target.value }))} /></F>
          <F label="Lengte HDD (m)"><input className="field-input" type="number" value={form.lengte_m ?? ''} onChange={e => setForm(f => ({ ...f, lengte_m: parseFloat(e.target.value) || undefined }))} /></F>
          <F label="Type boring"><select className="field-input" value={form.type_boring ?? ''} onChange={e => setForm(f => ({ ...f, type_boring: e.target.value }))}><option value="">— Kies type —</option>{TYPES_BORING.map(t => <option key={t}>{t}</option>)}</select></F>
          <F label="Klasse"><select className="field-input" value={form.klasse ?? ''} onChange={e => setForm(f => ({ ...f, klasse: e.target.value }))}><option value="">—</option>{KLASSEN.map(k => <option key={k}>{k}</option>)}</select></F>
          <F label="Aannemer"><select className="field-input" value={form.aannemer ?? ''} onChange={e => setForm(f => ({ ...f, aannemer: e.target.value }))}><option value="">—</option>{AANNEMERS.map(a => <option key={a}>{a}</option>)}</select></F>
          <F label="Bundel configuratie" span><input className="field-input" value={form.bundel_configuratie ?? ''} placeholder="1x200mm + 1x160mm" onChange={e => setForm(f => ({ ...f, bundel_configuratie: e.target.value }))} /></F>
          <div style={{ gridColumn: '1/-1', height: '0.5px', background: 'var(--border)' }} />
          <F label="HDD Ontwerp status" span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ONTWERP_STATUS.map(s => {
                const c = STATUS_COLORS[s];
                const active = form.status_ontwerp === s;
                return (
                  <button key={s} type="button" onClick={() => setForm(f => ({ ...f, status_ontwerp: s }))}
                    style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
                      border: active ? '2px solid transparent' : '1px solid #E5E7EB',
                      background: active && c ? c.bg : '#F9FAFB',
                      color: active && c ? c.fg : '#374151' }}>
                    {s}
                  </button>
                );
              })}
            </div>
          </F>
          <F label="HDD tek %"><select className="field-input" value={form.hdd_tek_pct ?? ''} onChange={e => setForm(f => ({ ...f, hdd_tek_pct: e.target.value ? parseFloat(e.target.value) : undefined }))}><option value="">—</option><option value="0">0%</option><option value="0.25">25%</option><option value="0.5">50%</option><option value="0.75">75%</option><option value="1">100%</option></select></F>
          <F label="Werkterrein"><select className="field-input" value={form.status_werkterrein ?? ''} onChange={e => setForm(f => ({ ...f, status_werkterrein: e.target.value }))}><option value="">—</option>{OVERIGE_STATUS.map(s => <option key={s}>{s}</option>)}</select></F>
          <F label="Berekening"><select className="field-input" value={form.status_berekening ?? ''} onChange={e => setForm(f => ({ ...f, status_berekening: e.target.value }))}><option value="">—</option>{OVERIGE_STATUS.map(s => <option key={s}>{s}</option>)}</select></F>
          <F label="Planning APD's"><input className="field-input" type="date" value={form.planning_apds ?? ''} onChange={e => setForm(f => ({ ...f, planning_apds: e.target.value }))} /></F>
          <F label="Proefsleuf nr."><input className="field-input" value={form.proefsleuf_nr ?? ''} onChange={e => setForm(f => ({ ...f, proefsleuf_nr: e.target.value }))} /></F>
          <F label="Sondering nr."><input className="field-input" value={form.sondering_nr ?? ''} onChange={e => setForm(f => ({ ...f, sondering_nr: e.target.value }))} /></F>
          <F label="Prioritering"><input className="field-input" value={form.prioritering ?? ''} placeholder="bijv. PRIO" onChange={e => setForm(f => ({ ...f, prioritering: e.target.value }))} /></F>
          <F label="Vervallen"><label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 6 }}><input type="checkbox" checked={form.vervallen ?? false} onChange={e => setForm(f => ({ ...f, vervallen: e.target.checked }))} style={{ width: 15, height: 15 }} /><span style={{ fontSize: 12 }}>Ja, boring is vervallen</span></label></F>
          <F label="Opmerkingen" span><textarea className="field-input" rows={3} value={form.opmerkingen ?? ''} onChange={e => setForm(f => ({ ...f, opmerkingen: e.target.value }))} style={{ resize: 'vertical' }} /></F>
        </div>
      </Modal>
    </div>
  );
}

function F({ label, children, span }: { label: string; children: React.ReactNode; span?: boolean }) {
  return <div style={{ gridColumn: span ? '1 / -1' : undefined }}><label className="field-label">{label}</label>{children}</div>;
}
