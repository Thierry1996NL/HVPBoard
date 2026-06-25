'use client';

import { useState, useMemo, useEffect, useCallback, Fragment } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';

/* ── Inline tabel-bouwstenen (zelfstandig, geen extra importbestand) ─────────── */
const STATUS_COLORS: Record<string, { bg: string; fg: string; pct: number; label: string }> = {
  'Issue':        { bg: '#D70015', fg: '#fff',    pct: 0,   label: 'Issue' },
  'Gestart':      { bg: '#F5A623', fg: '#fff',    pct: 25,  label: 'Gestart' },
  'Afgekeurd':    { bg: '#E8830A', fg: '#fff',    pct: 40,  label: 'Afgekeurd' },
  'Ter controle': { bg: '#F5C842', fg: '#1A1A1A', pct: 50,  label: 'Ter controle' },
  'Goedgekeurd':  { bg: '#8BC34A', fg: '#fff',    pct: 75,  label: 'Goedgekeurd' },
  'Vrijgegeven':  { bg: '#1A7F3C', fg: '#fff',    pct: 100, label: 'Vrijgegeven' },
  'Vertraagd':    { bg: '#D70015', fg: '#fff',    pct: 0,   label: 'Vertraagd' },
  'Voldoet':      { bg: '#8BC34A', fg: '#fff',    pct: 100, label: 'Voldoet' },
  'N.v.t.':       { bg: '#EBEBEB', fg: '#6E6E73', pct: 0,   label: 'N.v.t.' },
  'Vervallen':    { bg: '#EBEBEB', fg: '#6E6E73', pct: 0,   label: 'Vervallen' },
  'Niet gestart': { bg: '#F5F5F7', fg: '#6E6E73', pct: 0,   label: 'Niet gestart' },
};

const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const statusPill = (s?: string) => {
  const c = STATUS_COLORS[s ?? ''];
  return c
    ? <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>{s}</span>
    : <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>;
};

type InlineOpt = { value: string | number; label: string };

/* Bouwt opties voor een inline-select; voegt standaard een lege ('—') optie toe. */
const toOpts = (arr: string[], empty = true): InlineOpt[] =>
  (empty ? [{ value: '', label: '—' }] : []).concat(arr.map(s => ({ value: s, label: s })));

function Check({ v }: { v?: boolean }) {
  return v
    ? <span style={{ color: '#1A7F3C', fontWeight: 700, fontSize: 13 }}>✓</span>
    : <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>;
}

/* Datumveld dat de kalender opent zodra je érgens in het veld klikt. */
function DateInput({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  const open = (el: HTMLInputElement) => {
    try { (el as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch { /* oudere browser */ }
  };
  return (
    <input className="field-input" type="date" value={value ?? ''} style={{ cursor: 'pointer' }}
      onClick={e => open(e.currentTarget)} onFocus={e => open(e.currentTarget)}
      onChange={e => onChange(e.target.value || undefined)} />
  );
}

/* Inline-bewerkbare tabelcel. Klik opent een invoerveld; opslaan gebeurt direct.
   'bool' wisselt meteen bij klik. Klik op een editbare cel borrelt niet door naar de rij. */
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

  const numericSelect = type === 'select' && (options?.some(o => typeof o.value === 'number') ?? false);
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


/* ── Type ──────────────────────────────────────────────────────────────────── */
interface LemmerBoring {
  id: string;
  case_nr?: string;
  boring_nr: string;
  projectfase?: string;
  engineeringsfase?: string;
  werkpakket_nr?: string;
  locatie?: string;
  lengte_m?: number;
  type_boring?: string;
  aannemer?: string;
  klasse?: string;
  prioritering?: string;
  oplevering_toolgate?: string;
  aanlevering_compleet?: string;
  ter_controle_uitvoering?: string;
  retour_uitvoering?: string;
  opmerkingen_uitvoering?: string;
  schouw_uitgevoerd?: string;
  planning_apds?: string;
  tek_pct?: number;
  ontwerp_pct?: number;
  status_werkterrein?: string;
  status_berekening?: string;
  sondering_nr?: string;
  sondering_aangevraagd?: string;
  sondering_retour?: string;
  bundel_configuratie?: string;
  opmerkingen?: string;
  raakvlak?: string;
  opmerking_extra?: string;
  vervallen?: boolean;
  stappen?: Record<string, StapData>;
}

/* ── Keuzelijsten ─────────────────────────────────────────────────────────── */
const TYPES_BORING = ['Gyro', 'Walk-over', 'Walkover', 'Nanodrill', 'Nano-Drill', 'Avegaar', 'Anders'];
const KLASSEN      = ['9T', '17T', '27T', '50T', '>50T', '120T'];
const AANNEMERS    = ['Heijmans', 'Heijmans DTE', 'Voskuilen', 'Voskuilen / Heijmans', 'Pol', 'Anders'];
const STATUSSEN    = ['Niet gestart', 'Gestart', 'Ter controle', 'Goedgekeurd', 'Vrijgegeven', 'Voldoet', 'N.v.t.', 'Vervallen'];
const PCT_OPTS: InlineOpt[] = [
  { value: '', label: '—' }, { value: 0, label: '0%' }, { value: 0.25, label: '25%' },
  { value: 0.4, label: '40%' }, { value: 0.5, label: '50%' }, { value: 0.75, label: '75%' }, { value: 1, label: '100%' },
];
const pctLabel = (v?: number) => v == null ? '—' : `${Math.round(v * 100)}%`;

/* Vaste processtappen (HDD-engineering) — substappen per boring, gegroepeerd per fase. */
type ProcesStap = { id: string; nr: string; titel: string; wie: string; tijd: string };
const PROCES_FASEN: { fase: string; stappen: ProcesStap[] }[] = [
  { fase: 'Fase 0 — VO / tracé-engineering (HVP)', stappen: [
    { id: '1', nr: '1', titel: 'Check tracé & bepalen boorlijn', wie: 'Tracé-engineer (HVP)', tijd: '3–5 wd' },
  ] },
  { fase: 'Gate — Overdracht tracé → boring', stappen: [
    { id: 'G', nr: 'G', titel: 'Overdracht naar boorpartner (aanleverset 100% compleet)', wie: 'Tracé → Boor-engineer', tijd: '0,5 d' },
  ] },
  { fase: 'Fase 1 — DO / boor-engineering (boorpartner)', stappen: [
    { id: '2',  nr: '2',  titel: 'Haalbaarheidsstudie HDD (go/no-go)',          wie: 'Boor-engineer',            tijd: '3–5 wd' },
    { id: '3',  nr: '3',  titel: 'Concept boortekening',                         wie: 'Boor-engineer',            tijd: '5 wd' },
    { id: '4',  nr: '4',  titel: 'Beslismoment sonderingen (kritiek pad)',       wie: 'Boor-engineer / PL HVP',   tijd: '+3–4 wk' },
    { id: '5',  nr: '5',  titel: 'Concept D-GEO-berekening',                     wie: 'Boor-engineer',            tijd: '5 wd' },
    { id: '6',  nr: '6',  titel: 'Voorlopige inrichtingstekening werkterrein',   wie: 'Boor-engineer',            tijd: '3 wd' },
    { id: '7',  nr: '7',  titel: 'Toets concept boring',                         wie: 'Uitvoeringspartij',        tijd: '5–10 wd' },
    { id: '8',  nr: '8',  titel: 'Schouw',                                       wie: 'Schouwteam',               tijd: '5–10 wd' },
  ] },
  { fase: 'Fase 2 — Definitief maken & oplevering', stappen: [
    { id: '9',  nr: '9',  titel: 'Tekeningen aanpassen',                         wie: 'Boor-engineer',            tijd: '3 wd' },
    { id: '10', nr: '10', titel: 'Engineering aanvullen & definitief maken',     wie: 'Boor-engineer',            tijd: '5 wd' },
    { id: '11', nr: '11', titel: 'Akkoord definitieve boring',                   wie: 'Uitvoeringspartij',        tijd: '5–10 wd' },
    { id: '12', nr: '12', titel: 'Definitieve oplevering (gereed voor uitvoering)', wie: 'Boor-engineer',         tijd: '1 d' },
  ] },
];
const ALLE_STAPPEN: ProcesStap[] = PROCES_FASEN.flatMap(f => f.stappen);
const STAP_STATUS = ['Niet gestart', 'Loopt', 'Gereed', 'N.v.t.'];
const STAP_KLEUR: Record<string, string> = { 'Gereed': '#1A7F3C', 'Loopt': '#F5A623', 'N.v.t.': '#9CA3AF', 'Niet gestart': '#D1D5DB' };
/* Per stap, per boring: status + eigenaar + plandatum + deadline + afgerond. */
type StapData = { status?: string; eigenaar?: string; plandatum?: string; deadline?: string; afgerond?: boolean };
const subTh: React.CSSProperties = { textAlign: 'left', padding: '2px 8px', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 10, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const subTd: React.CSSProperties = { padding: '3px 8px', verticalAlign: 'middle' };

/* ── Kolommen (versleepbaar) ──────────────────────────────────────────────── */
type ColId =
  | 'boring_nr' | 'werkpakket_nr' | 'locatie' | 'lengte_m' | 'type_boring' | 'aannemer' | 'klasse'
  | 'prioritering' | 'oplevering_toolgate' | 'projectfase' | 'engineeringsfase'
  | 'fase0' | 'faseG' | 'fase1' | 'fase2'
  | 'planning_apds'
  | 'bundel_configuratie' | 'raakvlak' | 'opmerking_extra' | 'case_nr';

const DEFAULT_COL_ORDER: ColId[] = [
  'boring_nr', 'werkpakket_nr', 'locatie', 'lengte_m', 'type_boring', 'aannemer', 'klasse',
  'prioritering', 'oplevering_toolgate', 'projectfase', 'engineeringsfase',
  'fase0', 'faseG', 'fase1', 'fase2',
  'planning_apds',
  'bundel_configuratie', 'raakvlak', 'opmerking_extra', 'case_nr',
];
const COL_ORDER_KEY = 'hvp_lemmer_colorder_v3';
/* Koppeling fase-kolom → index in PROCES_FASEN */
const FASE_COL: Record<string, number> = { fase0: 0, faseG: 1, fase1: 2, fase2: 3 };

export default function LemmerPage() {
  const toast = useToast();
  const { data, loading, save, remove } = useLemmerData();

  const [search, setSearch]   = useState('');
  const [kpi, setKpi]         = useState<string>('actief');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) => setExpanded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const [expandedFases, setExpandedFases] = useState<Set<string>>(new Set());
  const toggleFase = (key: string) => setExpandedFases(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const [sortCol, setSortCol] = useState<keyof LemmerBoring | null>(null);
  const [sortDir, setSortDir] = useState(1);

  const [columnOrder, setColumnOrder] = useState<ColId[]>(DEFAULT_COL_ORDER);
  const [dragCol, setDragCol]         = useState<ColId | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ColId | null>(null);

  const [modal, setModal]   = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm]     = useState<Partial<LemmerBoring>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COL_ORDER_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as ColId[];
      const known = saved.filter(id => DEFAULT_COL_ORDER.includes(id));
      const missing = DEFAULT_COL_ORDER.filter(id => !known.includes(id));
      setColumnOrder([...known, ...missing]);
    } catch { /* negeer */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(COL_ORDER_KEY, JSON.stringify(columnOrder)); } catch { /* negeer */ }
  }, [columnOrder]);

  const onDragStart = (e: React.DragEvent, id: ColId) => { setDragCol(id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); };
  const onDragOver  = (e: React.DragEvent, id: ColId) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (id !== dragOverCol) setDragOverCol(id); };
  const onDrop      = (e: React.DragEvent, id: ColId) => {
    e.preventDefault(); const from = dragCol; setDragCol(null); setDragOverCol(null);
    if (!from || from === id) return;
    setColumnOrder(prev => { const a = [...prev]; const fi = a.indexOf(from), ti = a.indexOf(id); if (fi < 0 || ti < 0) return prev; a.splice(fi, 1); a.splice(ti, 0, from); return a; });
  };
  const onDragEnd = () => { setDragCol(null); setDragOverCol(null); };
  const resetColumns = () => setColumnOrder(DEFAULT_COL_ORDER);

  const sort = (c: keyof LemmerBoring) => { if (sortCol === c) setSortDir(d => -d); else { setSortCol(c); setSortDir(1); } };
  const srt  = (c: keyof LemmerBoring) => sortCol === c ? (sortDir > 0 ? ' ↑' : ' ↓') : '';

  const saveField = async (id: string, patch: Partial<LemmerBoring>) => {
    try { await save(id, patch); } catch (e) { toast((e as Error).message, 'error'); }
  };

  /* Lees de data van één stap (verdraagt oude opslag waarin alleen een status-string stond). */
  const getStap = (d: LemmerBoring, id: string): StapData => {
    const raw = (d.stappen ?? {})[id] as StapData | string | undefined;
    return typeof raw === 'string' ? { status: raw } : (raw ?? {});
  };
  /* Eén veld van één stap opslaan in de JSONB-kolom 'stappen'. */
  const saveStapVeld = async (d: LemmerBoring, id: string, patch: Partial<StapData>) => {
    const next: Record<string, StapData> = { ...(d.stappen ?? {}) };
    next[id] = { ...getStap(d, id), ...patch };
    try { await save(d.id, { stappen: next }); } catch (e) { toast((e as Error).message, 'error'); }
  };
  const stapDone = (sd: StapData) => sd.afgerond === true || sd.status === 'Gereed';
  const stappenGereed = (d: LemmerBoring) => ALLE_STAPPEN.filter(s => stapDone(getStap(d, s.id))).length;

  /* Afgeleide status uit ontwerp % (voor de KPI-kaarten). */
  const rowStatus = (d: LemmerBoring) =>
    d.vervallen ? 'vervallen' : d.ontwerp_pct === 1 ? 'gereed' : (d.ontwerp_pct ?? 0) > 0 ? 'loopt' : 'niet';

  const stats = useMemo(() => {
    const a = data.filter(d => !d.vervallen);
    return {
      totaal: a.length,
      gereed: a.filter(d => d.ontwerp_pct === 1).length,
      loopt:  a.filter(d => (d.ontwerp_pct ?? 0) > 0 && d.ontwerp_pct !== 1).length,
      niet:   a.filter(d => !d.ontwerp_pct).length,
      vervallen: data.filter(d => d.vervallen).length,
    };
  }, [data]);

  const rows = useMemo(() => {
    let r = data.filter(d => {
      if (kpi === 'vervallen') { if (!d.vervallen) return false; }
      else { if (d.vervallen) return false; if (kpi !== 'actief' && rowStatus(d) !== kpi) return false; }
      if (search) {
        const q = search.toLowerCase();
        return [d.boring_nr, d.locatie, d.werkpakket_nr, d.aannemer, d.type_boring, d.prioritering].some(v => (v ?? '').toLowerCase().includes(q));
      }
      return true;
    });
    if (sortCol) r = [...r].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      return String(av ?? '').localeCompare(String(bv ?? ''), 'nl', { numeric: true }) * sortDir;
    });
    return r;
  }, [data, search, kpi, sortCol, sortDir]);

  const openEdit = (id?: string) => {
    const d = id ? data.find(x => x.id === id) : undefined;
    setForm(d ? { ...d } : { vervallen: false });
    setEditId(id ?? null);
    setModal(true);
  };
  const handleSave = async () => {
    if (!form.boring_nr?.trim()) { toast('Boor nr. is verplicht', 'error'); return; }
    try { await save(editId, form); toast(editId ? '✓ Opgeslagen' : '✓ Toegevoegd', 'success'); setModal(false); }
    catch (e) { toast((e as Error).message, 'error'); }
  };
  const handleDelete = async () => {
    if (!editId || !confirm('Boring verwijderen?')) return;
    try { await remove(editId); toast('✓ Verwijderd', 'success'); setModal(false); }
    catch (e) { toast((e as Error).message, 'error'); }
  };

  /* ── Kolomdefinities ───────────────────────────────────────────────────── */
  const dateCol = (label: string, key: keyof LemmerBoring): { label: string; sortKey?: keyof LemmerBoring; cell: (d: LemmerBoring) => React.ReactNode } => ({
    label, sortKey: key,
    cell: d => (
      <InlineCell type="date" value={d[key] as string | undefined} tdStyle={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}
        display={<span>{fmtDate(d[key] as string | undefined)}</span>}
        onSave={v => saveField(d.id, { [key]: v } as Partial<LemmerBoring>)} />
    ),
  });
  const statusCol = (label: string, key: keyof LemmerBoring): { label: string; sortKey?: keyof LemmerBoring; cell: (d: LemmerBoring) => React.ReactNode } => ({
    label, sortKey: key,
    cell: d => (
      <InlineCell type="select" value={d[key] as string | undefined} options={toOpts(STATUSSEN)}
        display={statusPill(d[key] as string | undefined)}
        onSave={v => saveField(d.id, { [key]: v } as Partial<LemmerBoring>)} />
    ),
  });
  const textCol = (label: string, key: keyof LemmerBoring, opts?: { sort?: boolean; wide?: boolean }): { label: string; sortKey?: keyof LemmerBoring; cell: (d: LemmerBoring) => React.ReactNode } => ({
    label, sortKey: opts?.sort === false ? undefined : key,
    cell: d => (
      <InlineCell type="text" value={d[key] as string | undefined} tdStyle={{ fontSize: 12, color: 'var(--text-2)' }}
        display={<span style={opts?.wide ? { display: 'block', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis' } : undefined}>{(d[key] as string) || '—'}</span>}
        onSave={v => saveField(d.id, { [key]: v } as Partial<LemmerBoring>)} />
    ),
  });
  const pctCol = (label: string, key: keyof LemmerBoring): { label: string; sortKey?: keyof LemmerBoring; cell: (d: LemmerBoring) => React.ReactNode } => ({
    label, sortKey: key,
    cell: d => (
      <InlineCell type="select" value={d[key] as number | undefined} options={PCT_OPTS}
        display={<span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600 }}>{pctLabel(d[key] as number | undefined)}</span>}
        onSave={v => saveField(d.id, { [key]: v } as Partial<LemmerBoring>)} />
    ),
  });

  /* Fase-kolom: toont x/y voortgang van die fase; klik opent de boring + die fase. */
  const faseCol = (label: string, colId: string): { label: string; sortKey?: keyof LemmerBoring; cell: (d: LemmerBoring) => React.ReactNode } => ({
    label,
    cell: d => {
      const f = PROCES_FASEN[FASE_COL[colId]];
      const total = f.stappen.length;
      const klaar = f.stappen.filter(s => stapDone(getStap(d, s.id))).length;
      const compleet = klaar === total && total > 0;
      const begonnen = klaar > 0;
      return (
        <td style={{ textAlign: 'center', cursor: 'pointer' }} title={`${f.fase} — open`}
          onClick={() => { setExpanded(prev => { const n = new Set(prev); n.add(d.id); return n; }); toggleFase(`${d.id}|${FASE_COL[colId]}`); }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap',
            background: compleet ? 'var(--g-bg)' : begonnen ? '#FEF3C7' : 'var(--surface3)',
            color: compleet ? 'var(--g-fg)' : begonnen ? '#92400E' : 'var(--text-3)',
            border: '0.5px solid var(--border)' }}>{klaar}/{total}</span>
        </td>
      );
    },
  });

  const columns: Record<ColId, { label: string; sortKey?: keyof LemmerBoring; cell: (d: LemmerBoring) => React.ReactNode }> = {
    boring_nr: { label: 'Boor nr', sortKey: 'boring_nr', cell: d => (
      <InlineCell type="text" value={d.boring_nr} tdStyle={{ fontWeight: 600 }}
        display={<span>{d.boring_nr || '—'}</span>}
        onSave={v => saveField(d.id, { boring_nr: (v ?? '') as string })} />
    ) },
    werkpakket_nr: textCol('WP', 'werkpakket_nr'),
    locatie: textCol('Locatie', 'locatie', { wide: true }),
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
    aannemer: { label: 'Aannemer', sortKey: 'aannemer', cell: d => (
      <InlineCell type="select" value={d.aannemer} options={toOpts(AANNEMERS)}
        tdStyle={{ fontSize: 12, color: 'var(--text-2)' }}
        display={<span>{d.aannemer || '—'}</span>}
        onSave={v => saveField(d.id, { aannemer: v as string | undefined })} />
    ) },
    klasse: { label: 'Klasse', sortKey: 'klasse', cell: d => (
      <InlineCell type="select" value={d.klasse} options={toOpts(KLASSEN)}
        display={d.klasse
          ? <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'var(--surface3)', border: '0.5px solid var(--border)' }}>{d.klasse}</span>
          : <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>}
        onSave={v => saveField(d.id, { klasse: v as string | undefined })} />
    ) },
    prioritering: textCol('Prioritering', 'prioritering'),
    oplevering_toolgate: textCol('Oplevering Toolgate', 'oplevering_toolgate', { wide: true }),
    projectfase: textCol('Projectfase', 'projectfase'),
    engineeringsfase: textCol('Engineeringsfase', 'engineeringsfase', { wide: true }),
    fase0: faseCol('Fase 0', 'fase0'),
    faseG: faseCol('Gate', 'faseG'),
    fase1: faseCol('Fase 1', 'fase1'),
    fase2: faseCol('Fase 2', 'fase2'),
    planning_apds: dateCol("Planning APD's", 'planning_apds'),
    bundel_configuratie: textCol('Bundel', 'bundel_configuratie'),
    raakvlak: textCol('Raakvlak', 'raakvlak', { sort: false, wide: true }),
    opmerking_extra: textCol('Opmerking', 'opmerking_extra', { sort: false, wide: true }),
    case_nr: textCol('Case nr.', 'case_nr'),
  };

  const kpiCards: { id: string; num: number; label: string; cls?: string }[] = [
    { id: 'actief',    num: stats.totaal,    label: 'Boringen' },
    { id: 'gereed',    num: stats.gereed,    label: 'Gereed', cls: 'stat-G' },
    { id: 'loopt',     num: stats.loopt,     label: 'Loopt', cls: 'stat-B' },
    { id: 'niet',      num: stats.niet,      label: 'Niet gestart' },
    { id: 'vervallen', num: stats.vervallen, label: 'Vervallen' },
  ];

  if (loading) return <div className="page-content"><div className="loading-bar" /></div>;

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Lemmer</h1>
        <span style={{ fontSize: 12, color: 'var(--text-4)' }}>Lemmer-oost · DO · case 283147 · Eelco Zijnstra</span>
      </div>

      <div className="stats-bar">
        {kpiCards.map(c => (
          <button key={c.id} type="button"
            className={`stat-card stat-btn ${c.cls ?? ''}${kpi === c.id ? ' active' : ''}`}
            style={c.id === 'vervallen' && kpi !== 'vervallen' ? { opacity: 0.55 } : undefined}
            onClick={() => setKpi(c.id)}>
            <span className="stat-num">{c.num}</span><span className="stat-label">{c.label}</span>
          </button>
        ))}
      </div>

      <div className="filter-bar" style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '0.75rem 0', flexWrap: 'wrap' }}>
        <input className="field-input" placeholder="Zoeken…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={resetColumns} style={{ fontSize: 11 }} title="Kolomvolgorde terugzetten">↺ Kolommen</button>
        <button className="btn btn-primary" onClick={() => openEdit()}>+ Boring toevoegen</button>
      </div>

      <div className="table-wrap">
        <div className="tbl-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}></th>
                {columnOrder.map(id => {
                  const col = columns[id];
                  const sortable = !!col.sortKey;
                  const cls = ['col-draggable'];
                  if (sortable) cls.push('sortable');
                  if (dragCol === id) cls.push('dragging');
                  if (dragOverCol === id && dragCol && dragCol !== id) cls.push('drag-over');
                  return (
                    <th key={id} className={cls.join(' ')} draggable title="Sleep om te verplaatsen"
                      onDragStart={e => onDragStart(e, id)} onDragOver={e => onDragOver(e, id)}
                      onDrop={e => onDrop(e, id)} onDragEnd={onDragEnd}
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
                <tr><td colSpan={columnOrder.length + 2}><div className="empty-state"><strong>Geen boringen gevonden</strong>Pas de filters aan.</div></td></tr>
              ) : rows.map(d => {
                const isOpen = expanded.has(d.id);
                return (
                  <Fragment key={d.id}>
                    <tr style={{ opacity: d.vervallen ? 0.45 : 1 }}>
                      <td style={{ textAlign: 'center', cursor: 'pointer', color: 'var(--text-3)', whiteSpace: 'nowrap' }}
                        title={isOpen ? 'Stappen inklappen' : 'Stappen uitklappen'}
                        onClick={() => toggleExpand(d.id)}>
                        <span style={{ display: 'inline-block', transition: 'transform 0.12s', transform: isOpen ? 'rotate(90deg)' : 'none', fontSize: 10 }}>▶</span>
                        {(() => { const g = stappenGereed(d); return <span style={{ marginLeft: 5, fontSize: 9, fontWeight: 600, color: g > 0 ? '#1A7F3C' : 'var(--text-4)' }}>{g}/{ALLE_STAPPEN.length}</span>; })()}
                      </td>
                      {columnOrder.map(id => <Fragment key={id}>{columns[id].cell(d)}</Fragment>)}
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => openEdit(d.id)}>✎</button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td></td>
                        <td colSpan={columnOrder.length + 1} style={{ padding: '8px 10px 16px 8px', background: 'var(--bg)' }}>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>
                            Engineering-stappen — <strong style={{ color: 'var(--text-2)' }}>{stappenGereed(d)} van {ALLE_STAPPEN.length}</strong> gereed
                          </div>
                          <table style={{ borderCollapse: 'collapse', maxWidth: 1180 }}>
                            <thead>
                              <tr>
                                <th style={subTh}>Stap</th>
                                <th style={subTh}>Status</th>
                                <th style={subTh}>Eigenaar</th>
                                <th style={subTh}>Plandatum</th>
                                <th style={subTh}>Deadline</th>
                                <th style={subTh}>Weken resterend</th>
                                <th style={{ ...subTh, textAlign: 'center' }}>Afgerond</th>
                              </tr>
                            </thead>
                            <tbody>
                              {PROCES_FASEN.map((f, fi) => {
                                const faseKey = `${d.id}|${fi}`;
                                const faseOpen = expandedFases.has(faseKey);
                                const total = f.stappen.length;
                                const klaar = f.stappen.filter(s => stapDone(getStap(d, s.id))).length;
                                const compleet = klaar === total && total > 0;
                                return (
                                <Fragment key={f.fase}>
                                  <tr style={{ cursor: 'pointer', background: 'var(--surface3)', borderTop: '0.5px solid var(--border)' }} onClick={() => toggleFase(faseKey)}>
                                    <td colSpan={7} style={{ padding: '7px 8px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ display: 'inline-block', transition: 'transform 0.12s', transform: faseOpen ? 'rotate(90deg)' : 'none', fontSize: 9, color: 'var(--text-3)' }}>▶</span>
                                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)' }}>{f.fase}</span>
                                        <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 20, background: compleet ? 'var(--g-bg)' : 'var(--surface)', color: compleet ? 'var(--g-fg)' : 'var(--text-3)', border: '0.5px solid var(--border)' }}>{klaar}/{total}</span>
                                      </div>
                                    </td>
                                  </tr>
                                  {faseOpen && f.stappen.map(s => {
                                    const sd = getStap(d, s.id);
                                    const dot = STAP_KLEUR[sd.status ?? ''] ?? '#D1D5DB';
                                    const wk = (sd.deadline && !sd.afgerond)
                                      ? Math.round((new Date(sd.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7))
                                      : null;
                                    return (
                                      <tr key={s.id} style={{ borderTop: '0.5px solid var(--border)', background: 'var(--surface)' }}>
                                        <td style={{ ...subTd, minWidth: 320 }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'var(--surface3)', color: 'var(--text-2)', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{s.nr}</span>
                                            <span style={{ flexShrink: 0, width: 9, height: 9, borderRadius: '50%', background: dot }} />
                                            <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500, whiteSpace: 'nowrap' }}>{s.titel}</span>
                                            <span style={{ fontSize: 10, color: 'var(--text-4)', whiteSpace: 'nowrap' }}>· {s.wie} · {s.tijd}</span>
                                          </div>
                                        </td>
                                        <td style={subTd}>
                                          <select className="inline-edit" style={{ minWidth: 104, cursor: 'pointer' }}
                                            value={sd.status ?? ''} onChange={e => saveStapVeld(d, s.id, { status: e.target.value || undefined })}>
                                            <option value="">—</option>
                                            {STAP_STATUS.map(st => <option key={st} value={st}>{st}</option>)}
                                          </select>
                                        </td>
                                        <td style={subTd}>
                                          <input className="inline-edit" type="text" style={{ minWidth: 130 }} placeholder={s.wie}
                                            key={`${s.id}-eig-${sd.eigenaar ?? ''}`} defaultValue={sd.eigenaar ?? ''}
                                            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                            onBlur={e => { const v = e.target.value.trim(); if (v !== (sd.eigenaar ?? '')) saveStapVeld(d, s.id, { eigenaar: v || undefined }); }} />
                                        </td>
                                        <td style={subTd}>
                                          <input className="inline-edit" type="date" style={{ minWidth: 120, cursor: 'pointer' }} value={sd.plandatum ?? ''}
                                            onChange={e => saveStapVeld(d, s.id, { plandatum: e.target.value || undefined })}
                                            onClick={e => { try { (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch { /* */ } }} />
                                        </td>
                                        <td style={subTd}>
                                          <input className="inline-edit" type="date" style={{ minWidth: 120, cursor: 'pointer' }} value={sd.deadline ?? ''}
                                            onChange={e => saveStapVeld(d, s.id, { deadline: e.target.value || undefined })}
                                            onClick={e => { try { (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch { /* */ } }} />
                                        </td>
                                        <td style={{ ...subTd, whiteSpace: 'nowrap' }}>
                                          {sd.afgerond
                                            ? <span className="wk-chip wk-ok">afgerond</span>
                                            : wk === null
                                              ? <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>
                                              : wk < 0
                                                ? <span className="wk-chip wk-warn">{Math.abs(wk)}w te laat</span>
                                                : wk <= 4
                                                  ? <span className="wk-chip wk-soon">{wk}w</span>
                                                  : <span className="wk-chip wk-ok">{wk}w</span>}
                                        </td>
                                        <td style={{ ...subTd, textAlign: 'center' }}>
                                          <input type="checkbox" checked={!!sd.afgerond} style={{ width: 15, height: 15, cursor: 'pointer' }}
                                            onChange={e => saveStapVeld(d, s.id, { afgerond: e.target.checked })} />
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal open onClose={() => setModal(false)} maxWidth={640}
          title={editId ? `${form.boring_nr ?? 'Boring'} bewerken` : 'Nieuwe boring'}
          footer={<>
            {editId && <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={handleDelete}>Verwijderen</button>}
            <button className="btn" onClick={() => setModal(false)}>Annuleren</button>
            <button className="btn btn-primary" onClick={handleSave}>Opslaan</button>
          </>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <F label="Boor nr. *"><input className="field-input" value={form.boring_nr ?? ''} placeholder="HDD-001" onChange={e => setForm(f => ({ ...f, boring_nr: e.target.value }))} /></F>
            <F label="Werkpakket"><input className="field-input" value={form.werkpakket_nr ?? ''} onChange={e => setForm(f => ({ ...f, werkpakket_nr: e.target.value }))} /></F>
            <F label="Locatie" span><input className="field-input" value={form.locatie ?? ''} onChange={e => setForm(f => ({ ...f, locatie: e.target.value }))} /></F>
            <F label="Lengte (m)"><input className="field-input" type="number" value={form.lengte_m ?? ''} onChange={e => setForm(f => ({ ...f, lengte_m: parseFloat(e.target.value) || undefined }))} /></F>
            <F label="Type"><select className="field-input" value={form.type_boring ?? ''} onChange={e => setForm(f => ({ ...f, type_boring: e.target.value }))}><option value="">—</option>{TYPES_BORING.map(t => <option key={t}>{t}</option>)}</select></F>
            <F label="Aannemer"><select className="field-input" value={form.aannemer ?? ''} onChange={e => setForm(f => ({ ...f, aannemer: e.target.value }))}><option value="">—</option>{AANNEMERS.map(a => <option key={a}>{a}</option>)}</select></F>
            <F label="Klasse"><select className="field-input" value={form.klasse ?? ''} onChange={e => setForm(f => ({ ...f, klasse: e.target.value }))}><option value="">—</option>{KLASSEN.map(k => <option key={k}>{k}</option>)}</select></F>
            <F label="Prioritering"><input className="field-input" value={form.prioritering ?? ''} onChange={e => setForm(f => ({ ...f, prioritering: e.target.value }))} /></F>
            <F label="Oplevering Toolgate"><input className="field-input" value={form.oplevering_toolgate ?? ''} onChange={e => setForm(f => ({ ...f, oplevering_toolgate: e.target.value }))} /></F>
            <F label="Projectfase"><input className="field-input" value={form.projectfase ?? ''} onChange={e => setForm(f => ({ ...f, projectfase: e.target.value }))} /></F>
            <F label="Engineeringsfase"><input className="field-input" value={form.engineeringsfase ?? ''} onChange={e => setForm(f => ({ ...f, engineeringsfase: e.target.value }))} /></F>
            <div style={{ gridColumn: '1/-1', height: '0.5px', background: 'var(--border)' }} />
            <F label="Aanlevering compleet"><DateInput value={form.aanlevering_compleet} onChange={v => setForm(f => ({ ...f, aanlevering_compleet: v }))} /></F>
            <F label="Ter controle uitvoering"><DateInput value={form.ter_controle_uitvoering} onChange={v => setForm(f => ({ ...f, ter_controle_uitvoering: v }))} /></F>
            <F label="Retour ontvangen"><DateInput value={form.retour_uitvoering} onChange={v => setForm(f => ({ ...f, retour_uitvoering: v }))} /></F>
            <F label="Schouw uitgevoerd"><DateInput value={form.schouw_uitgevoerd} onChange={v => setForm(f => ({ ...f, schouw_uitgevoerd: v }))} /></F>
            <F label="Opm. uitvoering verwerkt"><DateInput value={form.opmerkingen_uitvoering} onChange={v => setForm(f => ({ ...f, opmerkingen_uitvoering: v }))} /></F>
            <F label="Planning APD's"><DateInput value={form.planning_apds} onChange={v => setForm(f => ({ ...f, planning_apds: v }))} /></F>
            <F label="Ontwerp %"><select className="field-input" value={form.ontwerp_pct ?? ''} onChange={e => setForm(f => ({ ...f, ontwerp_pct: e.target.value ? parseFloat(e.target.value) : undefined }))}>{PCT_OPTS.map(o => <option key={String(o.value)} value={o.value}>{o.label}</option>)}</select></F>
            <F label="Tek %"><select className="field-input" value={form.tek_pct ?? ''} onChange={e => setForm(f => ({ ...f, tek_pct: e.target.value ? parseFloat(e.target.value) : undefined }))}>{PCT_OPTS.map(o => <option key={String(o.value)} value={o.value}>{o.label}</option>)}</select></F>
            <F label="Werkterrein"><select className="field-input" value={form.status_werkterrein ?? ''} onChange={e => setForm(f => ({ ...f, status_werkterrein: e.target.value }))}><option value="">—</option>{STATUSSEN.map(s => <option key={s}>{s}</option>)}</select></F>
            <F label="Berekening"><select className="field-input" value={form.status_berekening ?? ''} onChange={e => setForm(f => ({ ...f, status_berekening: e.target.value }))}><option value="">—</option>{STATUSSEN.map(s => <option key={s}>{s}</option>)}</select></F>
            <div style={{ gridColumn: '1/-1', height: '0.5px', background: 'var(--border)' }} />
            <F label="Sondering nr."><input className="field-input" value={form.sondering_nr ?? ''} onChange={e => setForm(f => ({ ...f, sondering_nr: e.target.value }))} /></F>
            <F label="Sondering aangevraagd"><input className="field-input" value={form.sondering_aangevraagd ?? ''} onChange={e => setForm(f => ({ ...f, sondering_aangevraagd: e.target.value }))} /></F>
            <F label="Sondering retour"><input className="field-input" value={form.sondering_retour ?? ''} onChange={e => setForm(f => ({ ...f, sondering_retour: e.target.value }))} /></F>
            <F label="Bundel configuratie"><input className="field-input" value={form.bundel_configuratie ?? ''} onChange={e => setForm(f => ({ ...f, bundel_configuratie: e.target.value }))} /></F>
            <F label="Case nr."><input className="field-input" value={form.case_nr ?? ''} onChange={e => setForm(f => ({ ...f, case_nr: e.target.value }))} /></F>
            <F label="Vervallen"><label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 6 }}><input type="checkbox" checked={form.vervallen ?? false} onChange={e => setForm(f => ({ ...f, vervallen: e.target.checked }))} style={{ width: 15, height: 15 }} /><span style={{ fontSize: 12 }}>Ja, vervallen</span></label></F>
            <F label="Raakvlak" span><textarea className="field-input" rows={2} value={form.raakvlak ?? ''} onChange={e => setForm(f => ({ ...f, raakvlak: e.target.value }))} style={{ resize: 'vertical' }} /></F>
            <F label="Opmerking" span><textarea className="field-input" rows={2} value={form.opmerking_extra ?? ''} onChange={e => setForm(f => ({ ...f, opmerking_extra: e.target.value }))} style={{ resize: 'vertical' }} /></F>
          </div>
        </Modal>
      )}
    </div>
  );
}

function F({ label, children, span }: { label: string; children: React.ReactNode; span?: boolean }) {
  return <div style={{ gridColumn: span ? '1 / -1' : undefined }}><label className="field-label">{label}</label>{children}</div>;
}

/* Zelfstandige data-hook voor de losse tabel 'lemmer' (geen extra importbestand nodig). */
function useLemmerData() {
  const [data, setData] = useState<LemmerBoring[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: rows, error } = await supabase.from('lemmer').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      setData((rows ?? []) as unknown as LemmerBoring[]);
    } catch (err) { console.error('Fout bij laden lemmer:', err); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const save = useCallback(async (id: string | null, form: Partial<LemmerBoring>) => {
    const supabase = createClient();
    if (id) {
      const { error } = await supabase.from('lemmer').update(form as never).eq('id', id);
      if (error) throw new Error(error.message);
      setData(prev => prev.map(r => r.id === id ? { ...r, ...form } : r));
    } else {
      const { data: ins, error } = await supabase.from('lemmer').insert(form as never).select();
      if (error) throw new Error(error.message);
      if (ins) setData(prev => [...prev, ...(ins as unknown as LemmerBoring[])]);
    }
  }, []);
  const remove = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('lemmer').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setData(prev => prev.filter(r => r.id !== id));
  }, []);
  return { data, loading, save, remove, reload: load };
}
