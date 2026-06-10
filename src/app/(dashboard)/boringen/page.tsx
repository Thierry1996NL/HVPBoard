'use client';

import { useState, useMemo, useEffect, Fragment } from 'react';
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
  /* Engineering-traject */
  intake_compleet?: boolean;
  startdatum_engineering?: string;
  deadline_engineering?: string;
  engineering_afgerond?: boolean;
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

function Check({ v }: { v?: boolean }) {
  return v
    ? <span style={{ color: '#1A7F3C', fontWeight: 700, fontSize: 13 }}>✓</span>
    : <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>;
}

type InlineOpt = { value: string | number; label: string };

/* Inline-bewerkbare tabelcel. Klik opent een invoerveld; opslaan gebeurt direct.
   'bool' wisselt meteen bij klik. Klik op editbare cel opent niet het detailpaneel. */
function InlineCell({
  type, value, display, onSave, options, tdStyle,
}: {
  type: 'text' | 'number' | 'date' | 'select' | 'bool';
  value: string | number | boolean | undefined;
  display: React.ReactNode;
  onSave: (v: string | number | boolean | undefined) => void;
  options?: InlineOpt[];
  tdStyle?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);

  if (type === 'bool') {
    return (
      <td className="inline-cell" title="Klik om te wisselen"
        style={{ textAlign: 'center', cursor: 'pointer', ...tdStyle }}
        onClick={e => { e.stopPropagation(); onSave(!value); }}>
        {display}
      </td>
    );
  }

  if (!editing) {
    return (
      <td className="inline-cell" title="Klik om te bewerken"
        style={{ cursor: 'pointer', ...tdStyle }}
        onClick={e => { e.stopPropagation(); setEditing(true); }}>
        {display}
      </td>
    );
  }

  const numericSelect = type === 'select' && typeof options?.[0]?.value === 'number';
  const commit = (raw: string) => {
    setEditing(false);
    let next: string | number | undefined;
    if (raw === '') next = undefined;
    else if (type === 'number' || numericSelect) next = Number(raw);
    else next = raw;
    if (String(next ?? '') !== String(value ?? '')) onSave(next);
  };
  const openPicker = (el: HTMLInputElement) => {
    try { (el as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch { /* icoon werkt nog */ }
  };

  return (
    <td className="inline-cell editing" style={{ ...tdStyle }} onClick={e => e.stopPropagation()}>
      {type === 'select' ? (
        <select className="inline-edit" autoFocus defaultValue={String(value ?? '')}
          onChange={e => commit(e.target.value)} onBlur={() => setEditing(false)}>
          {options?.map(o => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
        </select>
      ) : type === 'date' ? (
        <input className="inline-edit" type="date" autoFocus defaultValue={value ? String(value) : ''}
          onChange={e => commit(e.target.value)} onBlur={() => setEditing(false)}
          onFocus={e => openPicker(e.currentTarget)} onClick={e => openPicker(e.currentTarget)} />
      ) : (
        <input className="inline-edit" type={type === 'number' ? 'number' : 'text'} autoFocus
          defaultValue={value !== undefined ? String(value) : ''}
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
            else if (e.key === 'Escape') { e.preventDefault(); setEditing(false); }
          }} />
      )}
    </td>
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

      {/* ── Sectie 2b: Engineering ─────────────────────────────────────────── */}
      <Section title="Engineering">
        <Grid>
          <Row label="Intake compleet"        value={boring.intake_compleet ? 'Ja' : 'Nee'} />
          <Row label="Engineering afgerond"   value={boring.engineering_afgerond ? 'Ja' : 'Nee'} />
          <Row label="Startdatum engineering" value={boring.startdatum_engineering
            ? new Date(boring.startdatum_engineering).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : undefined} />
          <Row label="Deadline engineering"   value={boring.deadline_engineering
            ? new Date(boring.deadline_engineering).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : undefined} />
          <Row label="Weken resterend" value={(() => {
            if (boring.engineering_afgerond) return 'Afgerond';
            if (!boring.deadline_engineering) return undefined;
            const w = Math.round((new Date(boring.deadline_engineering).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7));
            return w < 0 ? `${Math.abs(w)} weken te laat` : `${w} weken`;
          })()} span />
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

/* Bouwt opties voor een inline-select; voegt standaard een lege ('—') optie toe. */
const toOpts = (arr: string[], empty = true): InlineOpt[] =>
  (empty ? [{ value: '', label: '—' }] : []).concat(arr.map(s => ({ value: s, label: s })));

/* Verplaatsbare kolommen: id's, standaardvolgorde en opslag-sleutel. */
type ColId =
  | 'boring_nr' | 'project' | 'werkpakket_nr' | 'locatie' | 'lengte_m'
  | 'type_boring' | 'klasse' | 'aannemer' | 'status_ontwerp' | 'status_werkterrein'
  | 'status_berekening' | 'planning_apds' | 'intake_compleet' | 'startdatum_engineering'
  | 'deadline_engineering' | 'weken_resterend' | 'engineering_afgerond';

const DEFAULT_COL_ORDER: ColId[] = [
  'boring_nr', 'project', 'werkpakket_nr', 'locatie', 'lengte_m', 'type_boring', 'klasse',
  'aannemer', 'status_ontwerp', 'status_werkterrein', 'status_berekening', 'planning_apds',
  'intake_compleet', 'startdatum_engineering', 'deadline_engineering', 'weken_resterend',
  'engineering_afgerond',
];
const COL_ORDER_KEY = 'hvp_boringen_colorder_v1';
/* Sentinel voor de gecombineerde KPI-kaart Issue/Vertraagd. */
const ISSUE_FILTER = '__issue_vertraagd__';

const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const statusPill = (s?: string) => {
  const c = STATUS_COLORS[s ?? ''];
  return c
    ? <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>{s}</span>
    : <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>;
};

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

  /* Kolomvolgorde (versleepbaar), bewaard in de browser. */
  const [columnOrder, setColumnOrder] = useState<ColId[]>(DEFAULT_COL_ORDER);
  const [dragCol, setDragCol]         = useState<ColId | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ColId | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COL_ORDER_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as ColId[];
      const known = saved.filter(id => DEFAULT_COL_ORDER.includes(id));
      const missing = DEFAULT_COL_ORDER.filter(id => !known.includes(id));
      setColumnOrder([...known, ...missing]);
    } catch { /* negeer onleesbare opslag */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(COL_ORDER_KEY, JSON.stringify(columnOrder)); } catch { /* negeer */ }
  }, [columnOrder]);

  const onColDragStart = (e: React.DragEvent, id: ColId) => {
    setDragCol(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const onColDragOver = (e: React.DragEvent, id: ColId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== dragOverCol) setDragOverCol(id);
  };
  const onColDrop = (e: React.DragEvent, id: ColId) => {
    e.preventDefault();
    const from = dragCol;
    setDragCol(null);
    setDragOverCol(null);
    if (!from || from === id) return;
    setColumnOrder(prev => {
      const arr = [...prev];
      const fi = arr.indexOf(from), ti = arr.indexOf(id);
      if (fi < 0 || ti < 0) return prev;
      arr.splice(fi, 1);
      arr.splice(ti, 0, from);
      return arr;
    });
  };
  const onColDragEnd = () => { setDragCol(null); setDragOverCol(null); };
  const resetColumns = () => setColumnOrder(DEFAULT_COL_ORDER);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [editId, setEditId]     = useState<string | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState<Partial<Boring>>({ status: 'Nog te starten', status_ontwerp: 'Niet gestart', vervallen: false });

  const detailBoring  = data.find(d => d.id === detailId);
  const detailProject = detailBoring ? projects.find(p => p.id === detailBoring.werkpakket_id)?.label : undefined;
  const projectOpts: InlineOpt[] = projects.map(p => ({ value: p.id, label: p.label }));

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

  /* Welke KPI-kaart is op dit moment actief als filter? */
  const activeKpi: string =
    showVervallen                       ? 'vervallen'
    : filterStatus === ''               ? 'actief'
    : filterStatus === 'Vrijgegeven'    ? 'vrijgegeven'
    : filterStatus === 'Goedgekeurd'    ? 'goedgekeurd'
    : filterStatus === 'Ter controle'   ? 'ter_controle'
    : filterStatus === ISSUE_FILTER     ? 'issue'
    : '';   /* dropdown op een andere status → geen kaart gemarkeerd */

  /* Klik op een KPI-kaart: zet het bijbehorende filter, of schakel terug naar 'Actief'. */
  const selectKpi = (card: string) => {
    if (card === 'actief')    { setFilterStatus(''); setShowVervallen(false); return; }
    if (card === 'vervallen') { setFilterStatus(''); setShowVervallen(v => !v); return; }
    const map: Record<string, string> = {
      vrijgegeven: 'Vrijgegeven', goedgekeurd: 'Goedgekeurd',
      ter_controle: 'Ter controle', issue: ISSUE_FILTER,
    };
    const target = map[card];
    setShowVervallen(false);
    setFilterStatus(prev => prev === target ? '' : target);
  };

  const rows = useMemo(() => {
    let r = data.filter(d => {
      if (!showVervallen && d.vervallen) return false;
      if (showVervallen && !d.vervallen) return false;
      if (filterProject && String(d.werkpakket_id) !== filterProject) return false;
      if (filterType    && d.type_boring !== filterType) return false;
      if (filterKlasse  && d.klasse !== filterKlasse) return false;
      if (filterAannemer && d.aannemer !== filterAannemer) return false;
      if (filterStatus) {
        if (filterStatus === ISSUE_FILTER) {
          if (!['Issue', 'Vertraagd'].includes(d.status_ontwerp ?? '')) return false;
        } else if (d.status_ontwerp !== filterStatus) return false;
      }
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

  /* Inline opslaan van één veld direct vanuit de tabel. */
  const saveField = async (id: string, patch: Partial<Boring>) => {
    let next = patch;
    if ('status_ontwerp' in patch) {
      const os = patch.status_ontwerp ?? '';
      let appStatus = 'Nog te starten';
      if (os === 'Vrijgegeven' || os === 'Goedgekeurd') appStatus = 'Gereed';
      else if (os === 'Ter controle') appStatus = 'Review';
      else if (os === 'Gestart')      appStatus = 'Loopt';
      else if (os === 'Issue' || os === 'Vertraagd') appStatus = 'Geblokkeerd';
      next = { ...patch, status: appStatus };
    }
    try { await save(id, next); }
    catch (e) { toast((e as Error).message, 'error'); }
  };

  if (loading) return <div className="page-content"><div className="loading-bar" /></div>;

  /* Kolomdefinities: label + (optioneel) sorteerveld + celweergave. Header en cellen komen hieruit. */
  const columns: Record<ColId, { label: string; sortKey?: keyof Boring; cell: (d: Boring) => React.ReactNode }> = {
    boring_nr: { label: 'Boor nr', sortKey: 'boring_nr', cell: d => (
      <InlineCell type="text" value={d.boring_nr} tdStyle={{ fontWeight: 600 }}
        display={<span>{d.boring_nr || '—'}</span>}
        onSave={v => saveField(d.id, { boring_nr: (v ?? '') as string })} />
    ) },
    project: { label: 'Project', cell: d => (
      <InlineCell type="select" value={d.werkpakket_id} options={projectOpts}
        tdStyle={{ fontSize: 12, color: 'var(--text-2)' }}
        display={<span>{projects.find(p => p.id === d.werkpakket_id)?.label ?? '—'}</span>}
        onSave={v => saveField(d.id, { werkpakket_id: v as number })} />
    ) },
    werkpakket_nr: { label: 'WP', sortKey: 'werkpakket_nr', cell: d => (
      <InlineCell type="text" value={d.werkpakket_nr} tdStyle={{ color: 'var(--text-3)', fontSize: 11 }}
        display={<span>{d.werkpakket_nr || '—'}</span>}
        onSave={v => saveField(d.id, { werkpakket_nr: v as string | undefined })} />
    ) },
    locatie: { label: 'Locatie', sortKey: 'locatie', cell: d => (
      <InlineCell type="text" value={d.locatie} tdStyle={{ color: 'var(--text-2)' }}
        display={<span style={{ display: 'block', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.locatie || '—'}</span>}
        onSave={v => saveField(d.id, { locatie: v as string | undefined })} />
    ) },
    lengte_m: { label: 'L (m)', sortKey: 'lengte_m', cell: d => (
      <InlineCell type="number" value={d.lengte_m} tdStyle={{ fontVariantNumeric: 'tabular-nums' }}
        display={<span>{d.lengte_m ?? '—'}</span>}
        onSave={v => saveField(d.id, { lengte_m: v as number | undefined })} />
    ) },
    type_boring: { label: 'Type', sortKey: 'type_boring', cell: d => (
      <InlineCell type="select" value={d.type_boring} options={toOpts(TYPES_BORING)}
        display={<span>{d.type_boring || '—'}</span>}
        onSave={v => saveField(d.id, { type_boring: v as string | undefined })} />
    ) },
    klasse: { label: 'Klasse', sortKey: 'klasse', cell: d => (
      <InlineCell type="select" value={d.klasse} options={toOpts(KLASSEN)}
        display={d.klasse
          ? <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'var(--surface3)', border: '0.5px solid var(--border)' }}>{d.klasse}</span>
          : <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>}
        onSave={v => saveField(d.id, { klasse: v as string | undefined })} />
    ) },
    aannemer: { label: 'Aannemer', sortKey: 'aannemer', cell: d => (
      <InlineCell type="select" value={d.aannemer} options={toOpts(AANNEMERS)}
        tdStyle={{ fontSize: 12, color: 'var(--text-2)' }}
        display={<span>{d.aannemer || '—'}</span>}
        onSave={v => saveField(d.id, { aannemer: v as string | undefined })} />
    ) },
    status_ontwerp: { label: 'HDD Ontwerp', sortKey: 'status_ontwerp', cell: d => (
      <InlineCell type="select" value={d.status_ontwerp} options={toOpts(ONTWERP_STATUS)}
        display={statusPill(d.status_ontwerp)}
        onSave={v => saveField(d.id, { status_ontwerp: v as string | undefined })} />
    ) },
    status_werkterrein: { label: 'Werkterrein', sortKey: 'status_werkterrein', cell: d => (
      <InlineCell type="select" value={d.status_werkterrein} options={toOpts(OVERIGE_STATUS)}
        display={statusPill(d.status_werkterrein)}
        onSave={v => saveField(d.id, { status_werkterrein: v as string | undefined })} />
    ) },
    status_berekening: { label: 'Berekening', sortKey: 'status_berekening', cell: d => (
      <InlineCell type="select" value={d.status_berekening} options={toOpts(OVERIGE_STATUS)}
        display={statusPill(d.status_berekening)}
        onSave={v => saveField(d.id, { status_berekening: v as string | undefined })} />
    ) },
    planning_apds: { label: 'Planning APD', sortKey: 'planning_apds', cell: d => (
      <InlineCell type="date" value={d.planning_apds} tdStyle={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}
        display={<span>{fmtDate(d.planning_apds)}</span>}
        onSave={v => saveField(d.id, { planning_apds: v as string | undefined })} />
    ) },
    intake_compleet: { label: 'Intake compleet', cell: d => (
      <InlineCell type="bool" value={d.intake_compleet}
        display={<Check v={d.intake_compleet} />}
        onSave={v => saveField(d.id, { intake_compleet: v as boolean })} />
    ) },
    startdatum_engineering: { label: 'Startdatum engineering', sortKey: 'startdatum_engineering', cell: d => (
      <InlineCell type="date" value={d.startdatum_engineering} tdStyle={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}
        display={<span>{fmtDate(d.startdatum_engineering)}</span>}
        onSave={v => saveField(d.id, { startdatum_engineering: v as string | undefined })} />
    ) },
    deadline_engineering: { label: 'Deadline engineering', sortKey: 'deadline_engineering', cell: d => (
      <InlineCell type="date" value={d.deadline_engineering} tdStyle={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}
        display={<span>{fmtDate(d.deadline_engineering)}</span>}
        onSave={v => saveField(d.id, { deadline_engineering: v as string | undefined })} />
    ) },
    weken_resterend: { label: 'Weken resterend', cell: d => {
      const engKlaar = !!d.engineering_afgerond;
      const wkRest = d.deadline_engineering
        ? Math.round((new Date(d.deadline_engineering).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7))
        : null;
      return (
        <td style={{ whiteSpace: 'nowrap' }} title="Automatisch berekend uit de deadline — klik opent het detailpaneel">
          {engKlaar
            ? <span className="wk-chip wk-ok">afgerond</span>
            : wkRest === null
              ? <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>
              : wkRest < 0
                ? <span className="wk-chip wk-warn">{Math.abs(wkRest)}w te laat</span>
                : wkRest <= 4
                  ? <span className="wk-chip wk-soon">{wkRest}w</span>
                  : <span className="wk-chip wk-ok">{wkRest}w</span>}
        </td>
      );
    } },
    engineering_afgerond: { label: 'Engineering afgerond', cell: d => (
      <InlineCell type="bool" value={d.engineering_afgerond}
        display={<Check v={d.engineering_afgerond} />}
        onSave={v => saveField(d.id, { engineering_afgerond: v as boolean })} />
    ) },
  };

  return (
    <div className="page-content">

      {/* KPI balk */}
      <div className="stats-bar">
        <button type="button" className={`stat-card stat-btn${activeKpi === 'actief' ? ' active' : ''}`} onClick={() => selectKpi('actief')}><span className="stat-num">{stats.totaal}</span><span className="stat-label">Actief</span></button>
        <button type="button" className={`stat-card stat-btn stat-G${activeKpi === 'vrijgegeven' ? ' active' : ''}`} onClick={() => selectKpi('vrijgegeven')}><span className="stat-num">{stats.vrijgegeven}</span><span className="stat-label">Vrijgegeven</span></button>
        <button type="button" className={`stat-card stat-btn stat-G${activeKpi === 'goedgekeurd' ? ' active' : ''}`} onClick={() => selectKpi('goedgekeurd')}><span className="stat-num">{stats.goedgekeurd}</span><span className="stat-label">Goedgekeurd</span></button>
        <button type="button" className={`stat-card stat-btn stat-R${activeKpi === 'ter_controle' ? ' active' : ''}`} onClick={() => selectKpi('ter_controle')}><span className="stat-num">{stats.ter_controle}</span><span className="stat-label">Ter controle</span></button>
        <button type="button" className={`stat-card stat-btn stat-B${activeKpi === 'issue' ? ' active' : ''}`} onClick={() => selectKpi('issue')}><span className="stat-num">{stats.issue}</span><span className="stat-label">Issue / Vertraagd</span></button>
        <button type="button" className={`stat-card stat-btn${activeKpi === 'vervallen' ? ' active' : ''}`} style={activeKpi === 'vervallen' ? undefined : { opacity: 0.55 }} onClick={() => selectKpi('vervallen')}><span className="stat-num">{stats.vervallen}</span><span className="stat-label">Vervallen</span></button>
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
        <button className="btn" onClick={resetColumns} style={{ fontSize: 11 }} title="Zet de kolomvolgorde terug naar standaard">↺ Kolommen</button>
        <button className="btn btn-primary" onClick={() => openEdit()}>+ Boring toevoegen</button>
      </div>

      {/* Tabel */}
      <div className="table-wrap">
        <div className="tbl-scroll">
          <table>
            <thead>
              <tr>
                {columnOrder.map(id => {
                  const col = columns[id];
                  const sortable = !!col.sortKey;
                  const cls = ['col-draggable'];
                  if (sortable) cls.push('sortable');
                  if (dragCol === id) cls.push('dragging');
                  if (dragOverCol === id && dragCol && dragCol !== id) cls.push('drag-over');
                  return (
                    <th key={id} className={cls.join(' ')} draggable
                      title="Sleep om te verplaatsen"
                      onDragStart={e => onColDragStart(e, id)}
                      onDragOver={e => onColDragOver(e, id)}
                      onDrop={e => onColDrop(e, id)}
                      onDragEnd={onColDragEnd}
                      onClick={sortable ? () => sort(col.sortKey!) : undefined}>
                      {col.label}{sortable ? srt(col.sortKey!) : null}
                    </th>
                  );
                })}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={18}><div className="empty-state"><strong>Geen boringen gevonden</strong>Pas de filters aan.</div></td></tr>
              ) : rows.map(d => (
                  <tr key={d.id} onClick={() => setDetailId(d.id)}
                    style={{ cursor: 'pointer', opacity: d.vervallen ? 0.4 : 1 }}>
                    {columnOrder.map(id => <Fragment key={id}>{columns[id].cell(d)}</Fragment>)}
                    <td onClick={e => e.stopPropagation()}>
                      <button className="btn" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => openEdit(d.id)}>✎</button>
                    </td>
                  </tr>
              ))}
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
          <F label="Planning APD's"><DateInput value={form.planning_apds} onChange={v => setForm(f => ({ ...f, planning_apds: v }))} /></F>
          <div style={{ gridColumn: '1/-1', height: '0.5px', background: 'var(--border)' }} />
          <F label="Intake compleet"><label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 6 }}><input type="checkbox" checked={form.intake_compleet ?? false} onChange={e => setForm(f => ({ ...f, intake_compleet: e.target.checked }))} style={{ width: 15, height: 15 }} /><span style={{ fontSize: 12 }}>Ja, intake is compleet</span></label></F>
          <F label="Engineering afgerond"><label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 6 }}><input type="checkbox" checked={form.engineering_afgerond ?? false} onChange={e => setForm(f => ({ ...f, engineering_afgerond: e.target.checked }))} style={{ width: 15, height: 15 }} /><span style={{ fontSize: 12 }}>Ja, engineering afgerond</span></label></F>
          <F label="Startdatum engineering"><DateInput value={form.startdatum_engineering} onChange={v => setForm(f => ({ ...f, startdatum_engineering: v }))} /></F>
          <F label="Deadline engineering"><DateInput value={form.deadline_engineering} onChange={v => setForm(f => ({ ...f, deadline_engineering: v }))} /></F>
          <div style={{ gridColumn: '1/-1', height: '0.5px', background: 'var(--border)' }} />
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

/* Datumveld dat de kalender opent zodra je érgens in het veld klikt (geen tekst typen nodig). */
function DateInput({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  const openPicker = (el: HTMLInputElement) => {
    try { (el as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch { /* oudere browser: icoon werkt nog */ }
  };
  return (
    <input
      className="field-input"
      type="date"
      value={value ?? ''}
      style={{ cursor: 'pointer' }}
      onClick={e => openPicker(e.currentTarget)}
      onFocus={e => openPicker(e.currentTarget)}
      onChange={e => onChange(e.target.value || undefined)}
    />
  );
}
