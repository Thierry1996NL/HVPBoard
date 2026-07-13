'use client';

import { useState, useMemo, useEffect, useCallback, Fragment } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { bepaalOpdrachtgever, OPDRACHTGEVERS } from '@/lib/proces';

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
    ? <span style={{ color: 'var(--g-fg)', fontWeight: 700, fontSize: 13 }}>✓</span>
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
  werkpakket_id?: number;
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
  intake_compleet?: boolean;
  gereed?: boolean;
  startdatum?: string;
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
type ProcesStap = { id: string; nr: string; titel: string; wie: string; tijd: string; weken: number };
const PROCES_FASEN: { fase: string; stappen: ProcesStap[] }[] = [
  { fase: 'Fase 0 — Voorontwerp / tracé-engineering (HVP)', stappen: [
    { id: '1', nr: '1', titel: 'Check tracé & bepalen boorlijn + afwijkruimte',               wie: 'Tracé-engineer (HVP)',    tijd: '3–5 wd',                            weken: 1 },
    { id: '2', nr: '2', titel: 'Haalbaarheidsstudie HDD + boorlijn optimaliseren (go/no-go)',  wie: 'Boor-engineer',           tijd: '2 wk (10 wd)',                      weken: 2 },
    { id: '4', nr: '4', titel: 'Beslismoment sonderingen (kritiek pad)',                       wie: 'Boor-engineer / PL HVP',  tijd: 'besluit 0,5 d / bij ja 6 wk (30 wd)', weken: 0.1 },
  ] },
  { fase: 'Gate — Overdracht tracé → boring', stappen: [
    { id: 'G', nr: 'G', titel: 'Overdracht naar boorpartner (aanleverset 100% compleet)',     wie: 'Tracé → Boor-engineer',   tijd: '± 0,5 d',                           weken: 0.1 },
  ] },
  { fase: 'Fase 1 — Definitief ontwerp / boor-engineering (boorpartner)', stappen: [
    { id: '3',   nr: '3',   titel: 'Concept boortekening',                                       wie: 'Boor-engineer',        tijd: '3 wk (15 wd)',                    weken: 3 },
    { id: '5-6', nr: '5–6', titel: 'Concept D-GEO + voorlopige inrichtingstekening (parallel aan 3)', wie: 'Boor-engineer',   tijd: '3+5+6 samen ± 5 wk (25 wd)',       weken: 2 },
    { id: '7',   nr: '7',   titel: 'Toets concept boring (uitvoeringspartij)',                    wie: 'Uitvoeringspartij',    tijd: '5–10 wd review',                  weken: 2 },
    { id: '8',   nr: '8',   titel: 'Schouw (parallel aan 7)',                                     wie: 'Schouwteam',           tijd: '5–10 wd',                         weken: 0.2 },
  ] },
  { fase: 'Fase 2 — Definitief maken & oplevering', stappen: [
    { id: '9',  nr: '9',  titel: 'Tekeningen aanpassen (toets + schouw verwerken)',             wie: 'Boor-engineer',           tijd: '3 wd',                              weken: 0.6 },
    { id: '10', nr: '10', titel: 'Engineering aanvullen & definitief maken',                    wie: 'Boor-engineer',           tijd: '5 wd',                              weken: 1 },
    { id: '11', nr: '11', titel: 'Akkoord definitieve boring (uitvoeringspartij)',              wie: 'Uitvoeringspartij',       tijd: '5–10 wd review',                    weken: 2 },
    { id: '12', nr: '12', titel: 'Definitieve oplevering in Relatics/DMS',                       wie: 'Boor-engineer',           tijd: '1 d',                               weken: 0.2 },
  ] },
];
const ALLE_STAPPEN: ProcesStap[] = PROCES_FASEN.flatMap(f => f.stappen);
/* Planning gebruikt het expliciete weken-veld per stap (parallelle stappen tellen
   hun extra bijdrage; totaal ≈ 12–14 wk conform het kernblad, zonder sonderingen). */
function stapWeken(s: ProcesStap): number { return s.weken; }
const TOTAAL_WEKEN = ALLE_STAPPEN.reduce((sum, s) => sum + stapWeken(s), 0);
/* Einddatum = startdatum + totale (uiterste) doorlooptijd van alle stappen. */
function einddatumVan(start?: string): string | null {
  if (!start) return null;
  const d = new Date(start);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + Math.round(TOTAAL_WEKEN * 7));
  return d.toISOString().slice(0, 10);
}
const MS_WEEK = 1000 * 60 * 60 * 24 * 7;
/* Genereert plandatum + deadline per stap door de doorlooptijden sequentieel
   vanaf de startdatum achter elkaar te zetten. */
function genereerStapDatums(start: string): Record<string, { plandatum: string; deadline: string }> {
  const out: Record<string, { plandatum: string; deadline: string }> = {};
  const cursor = new Date(start);
  if (isNaN(cursor.getTime())) return out;
  for (const s of ALLE_STAPPEN) {
    const plan = cursor.toISOString().slice(0, 10);
    const dagen = Math.max(1, Math.round(stapWeken(s) * 7));
    cursor.setDate(cursor.getDate() + dagen);
    out[s.id] = { plandatum: plan, deadline: cursor.toISOString().slice(0, 10) };
  }
  return out;
}
const STAP_STATUS = ['Niet gestart', 'Loopt', 'Gereed', 'N.v.t.'];
const STAP_KLEUR: Record<string, string> = { 'Gereed': 'var(--g-fg)', 'Loopt': 'var(--r-fg)', 'N.v.t.': 'var(--text-4)', 'Niet gestart': 'var(--border-md)' };
/* Per stap, per boring: status + eigenaar + plandatum + deadline + afgerond. */
type StapData = { status?: string; eigenaar?: string; plandatum?: string; deadline?: string; afgerond?: boolean };
type Persoon = { id: string; naam: string };

/* ── Kolommen (versleepbaar) ──────────────────────────────────────────────── */
type ColId =
  | 'boring_nr' | 'werkpakket_nr' | 'locatie' | 'lengte_m' | 'type_boring' | 'aannemer' | 'klasse'
  | 'prioritering' | 'oplevering_toolgate' | 'projectfase' | 'engineeringsfase'
  | 'startdatum' | 'fase0' | 'faseG' | 'fase1' | 'fase2' | 'einddatum' | 'eind_weken' | 'actieve_stap' | 'actieve_eigenaar'
  | 'aanlevering_compleet' | 'ter_controle_uitvoering' | 'retour_uitvoering' | 'schouw_uitgevoerd'
  | 'opmerkingen_uitvoering' | 'planning_apds' | 'ontwerp_pct' | 'tek_pct' | 'status_werkterrein'
  | 'status_berekening' | 'sondering_nr' | 'sondering_aangevraagd' | 'sondering_retour'
  | 'bundel_configuratie' | 'raakvlak' | 'opmerking_extra' | 'case_nr' | 'gereed' | 'project' | 'voorstel';

const DEFAULT_COL_ORDER: ColId[] = [
  'boring_nr', 'werkpakket_nr', 'locatie', 'lengte_m', 'type_boring', 'klasse', 'aannemer',
  'prioritering', 'oplevering_toolgate', 'projectfase', 'engineeringsfase',
  'startdatum', 'fase0', 'faseG', 'fase1', 'fase2', 'einddatum', 'planning_apds', 'eind_weken', 'actieve_stap', 'actieve_eigenaar', 'opmerking_extra',
  'aanlevering_compleet', 'ter_controle_uitvoering', 'retour_uitvoering', 'schouw_uitgevoerd',
  'opmerkingen_uitvoering', 'ontwerp_pct', 'tek_pct', 'status_werkterrein',
  'status_berekening', 'sondering_nr', 'sondering_aangevraagd', 'sondering_retour',
  'bundel_configuratie', 'raakvlak', 'case_nr', 'gereed',
];
/* Standaard verborgen kolommen (compacte weergave) — toonbaar via de kolomkiezer of de knop Uitklappen. */
const DEFAULT_HIDDEN: ColId[] = [
  'oplevering_toolgate', 'projectfase', 'engineeringsfase',
  'aanlevering_compleet', 'ter_controle_uitvoering', 'retour_uitvoering', 'schouw_uitgevoerd',
  'opmerkingen_uitvoering', 'ontwerp_pct', 'tek_pct', 'status_werkterrein',
  'status_berekening', 'sondering_nr', 'sondering_aangevraagd', 'sondering_retour',
  'raakvlak', 'case_nr', 'bundel_configuratie',
];
const COL_ORDER_KEY = 'hvp_lemmer_colorder_v11';
const HIDDEN_KEY = 'hvp_lemmer_hidden_v7';
/* Koppeling fase-kolom → index in PROCES_FASEN */
const FASE_COL: Record<string, number> = { fase0: 0, faseG: 1, fase1: 2, fase2: 3 };
/* Berekende kolommen zonder eigen databaseveld — niet filterbaar via de header. */
const NIET_FILTERBAAR: ColId[] = [];

/* Alle projecten in deze module (werkpakket_id komt overeen met boringen.werkpakket_id). */
interface ProjectDef { wp: number; naam: string; fase: string; case: string; pl: string; }
const PROJECTEN: ProjectDef[] = [
  { wp: 1, naam: 'Akkrum',      fase: 'UO', case: '311716',        pl: 'Patrick Kroneman' },
  { wp: 2, naam: 'Lemmer-oost', fase: 'DO', case: '283147',        pl: 'Eelco Zijnstra' },
  { wp: 3, naam: 'Wolvega',     fase: 'UO', case: '290538',        pl: 'Patrick Kroneman' },
  { wp: 4, naam: 'Joure',       fase: 'DO', case: '247351',        pl: 'Patrick Kroneman' },
  { wp: 5, naam: 'Urk-Zuid',    fase: 'DO', case: '295885',        pl: 'Patrick Kroneman / Thomas Burkels' },
  { wp: 6, naam: 'Luinjeberd',  fase: 'DO', case: '—',             pl: 'Eelco Zijnstra' },
  { wp: 7, naam: 'Urk WP2',     fase: 'UO', case: '254496/268298', pl: 'Patrick Kroneman' },
];

export default function LemmerPage() {
  const toast = useToast();
  const { data, loading, save, remove, refresh, personen, addPersoon, removePersoon } = useLemmerData();
  const [opslaan, setOpslaan] = useState(false);
  const handleOpslaan = async () => {
    setOpslaan(true);
    try { await refresh(); toast('✓ Alles is opgeslagen', 'success'); }
    catch (e) { toast((e as Error).message, 'error'); }
    finally { setOpslaan(false); }
  };
  const [personenOpen, setPersonenOpen] = useState(false);
  const [nieuwPersoon, setNieuwPersoon] = useState('');
  const handleAddPersoon = async () => {
    const naam = nieuwPersoon.trim();
    if (!naam) return;
    if (personen.some(p => p.naam.toLowerCase() === naam.toLowerCase())) { toast('Deze persoon bestaat al', 'error'); return; }
    try { await addPersoon(naam); setNieuwPersoon(''); } catch (e) { toast((e as Error).message, 'error'); }
  };
  const handleRemovePersoon = async (id: string) => {
    try { await removePersoon(id); } catch (e) { toast((e as Error).message, 'error'); }
  };

  const [search, setSearch]   = useState('');
  const [wp, setWp]           = useState<number>(2);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wpParam = params.get('wp');
    const health = params.get('health');
    if (wpParam) setWp(Number(wpParam));
    else { const v = localStorage.getItem('hvp_module_wp'); if (v) setWp(Number(v)); }
    if (health && ['groen', 'geel', 'rood'].includes(health)) setKpi(health);
  }, []);
  useEffect(() => { localStorage.setItem('hvp_module_wp', String(wp)); }, [wp]);
  const project = PROJECTEN.find(p => p.wp === wp) ?? PROJECTEN[0];
  const [intakeMode, setIntakeMode] = useState(false);
  const [intakeKeuze, setIntakeKeuze] = useState<Record<string, string>>({});
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
  const [hidden, setHidden]           = useState<Set<ColId>>(new Set(DEFAULT_HIDDEN));
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [colFilters, setColFilters]   = useState<Partial<Record<ColId, string>>>({});
  const activeFilters = Object.values(colFilters).filter(v => (v ?? '').trim()).length;

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
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_KEY);
      if (raw) setHidden(new Set((JSON.parse(raw) as ColId[]).filter(id => DEFAULT_COL_ORDER.includes(id))));
    } catch { /* negeer */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(Array.from(hidden))); } catch { /* negeer */ }
  }, [hidden]);
  const toggleHidden = (id: ColId) => setHidden(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allVisible = hidden.size === 0;
  const toggleAlleKolommen = () => setHidden(allVisible ? new Set(DEFAULT_HIDDEN) : new Set());
  const baseCols = columnOrder.filter(id => !hidden.has(id) && id !== 'boring_nr');
  const visibleCols = ([
    ...(intakeMode ? ['voorstel'] : []),
    ...baseCols,
  ] as ColId[]);
  const STICKY_META_W = 64;   // breedte pijltje/stappen-kolom
  const STICKY_NUM_W = 40;    // breedte #-kolom
  const STICKY_PROJECT_W = 120;
  const stickyProjectLeft = STICKY_META_W + STICKY_NUM_W;
  const stickyBoringLeft = stickyProjectLeft + (wp === 0 ? STICKY_PROJECT_W : 0);
  const stickyGrey = 'var(--surface-2, #F1F3F5)';

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
  /* Startdatum opslaan én meteen plandatum + deadline van alle stappen doorrekenen. */
  const setStartEnPlanning = async (d: LemmerBoring, start?: string) => {
    if (!start) { try { await save(d.id, { startdatum: undefined }); } catch (e) { toast((e as Error).message, 'error'); } return; }
    const datums = genereerStapDatums(start);
    const next: Record<string, StapData> = { ...(d.stappen ?? {}) };
    for (const id of Object.keys(datums)) next[id] = { ...getStap(d, id), ...datums[id] };
    try { await save(d.id, { startdatum: start, stappen: next }); toast('✓ Planning doorgerekend', 'success'); }
    catch (e) { toast((e as Error).message, 'error'); }
  };
  const stapDone = (sd: StapData) => sd.afgerond === true || sd.status === 'Gereed';
  const stappenGereed = (d: LemmerBoring) => ALLE_STAPPEN.filter(s => stapDone(getStap(d, s.id))).length;
  /* De stap waar nu actief aan gewerkt wordt: eerst een stap met status 'Loopt',
     anders de eerstvolgende nog niet afgeronde stap (N.v.t. overslaan). */
  const activeStap = (d: LemmerBoring): { step: ProcesStap; sd: StapData } | null => {
    const lopend = ALLE_STAPPEN.find(s => getStap(d, s.id).status === 'Loopt');
    const next = lopend ?? ALLE_STAPPEN.find(s => { const sd = getStap(d, s.id); return !stapDone(sd) && sd.status !== 'N.v.t.'; });
    return next ? { step: next, sd: getStap(d, next.id) } : null;
  };

  /* Afgeleide status uit ontwerp % (voor de KPI-kaarten). */
  const rowStatus = (d: LemmerBoring) =>
    d.vervallen ? 'vervallen' : d.ontwerp_pct === 1 ? 'gereed' : (d.ontwerp_pct ?? 0) > 0 ? 'loopt' : 'niet';
  /* Stoplicht-status op basis van de substap-deadlines:
     rood = een openstaande stap is over datum, geel = deadline binnen 4 weken, anders groen. */
  const boringHealth = (d: LemmerBoring): 'groen' | 'geel' | 'rood' => {
    if (d.gereed) return 'groen';
    let geel = false;
    for (const s of ALLE_STAPPEN) {
      const sd = getStap(d, s.id);
      if (stapDone(sd) || sd.status === 'N.v.t.' || !sd.deadline) continue;
      const wk = (new Date(sd.deadline).getTime() - Date.now()) / MS_WEEK;
      if (wk < 0) return 'rood';
      if (wk <= 2) geel = true;
    }
    return geel ? 'geel' : 'groen';
  };
  /* Tekstwaarde per kolom om op te filteren — werkt ook voor berekende kolommen. */
  const colFilterValue = (d: LemmerBoring, id: ColId): string => {
    if (id === 'project') return PROJECTEN.find(p => p.wp === d.werkpakket_id)?.naam ?? '';
    if (id === 'gereed') return d.gereed ? 'ja' : 'nee';
    if (FASE_COL[id] !== undefined) {
      const f = PROCES_FASEN[FASE_COL[id]];
      return `${f.stappen.filter(s => stapDone(getStap(d, s.id))).length}/${f.stappen.length}`;
    }
    if (id === 'einddatum' || id === 'eind_weken') {
      const deadlines = ALLE_STAPPEN.map(s => getStap(d, s.id).deadline).filter(Boolean) as string[];
      const e = deadlines.length ? deadlines.reduce((a, b) => (a > b ? a : b)) : einddatumVan(d.startdatum);
      if (id === 'einddatum') return e ?? '';
      if (!e) return '';
      return String(Math.round((new Date(e).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7)));
    }
    if (id === 'actieve_stap') { const a = activeStap(d); return a ? `${a.step.nr} ${a.step.titel}` : ''; }
    if (id === 'actieve_eigenaar') { const a = activeStap(d); return a?.sd.eigenaar ?? ''; }
    return String(d[id as keyof LemmerBoring] ?? '');
  };

  const stats = useMemo(() => {
    const proj = data.filter(d => wp === 0 || d.werkpakket_id === wp);
    const a = proj.filter(d => !d.vervallen && !d.gereed);
    let groen = 0, geel = 0, rood = 0;
    for (const d of a) { const h = boringHealth(d); if (h === 'rood') rood++; else if (h === 'geel') geel++; else groen++; }
    return { totaal: proj.length, groen, geel, rood, vervallen: proj.filter(d => d.vervallen).length, gereed: proj.filter(d => d.gereed && !d.vervallen).length };
  }, [data, wp]);

  const rows = useMemo(() => {
    let r = data.filter(d => {
      if (wp !== 0 && d.werkpakket_id !== wp) return false;
      if (intakeMode) { if (d.intake_compleet === true) return false; }
      else { if (d.intake_compleet !== true) return false; }
      if (kpi === 'vervallen') { if (!d.vervallen) return false; }
      else if (kpi === 'gereed') { if (!d.gereed || d.vervallen) return false; }
      else if (kpi === 'actief') { /* toont alles, geen uitsluiting */ }
      else {
        if (d.vervallen || d.gereed) return false;
        if (boringHealth(d) !== kpi) return false;
      }
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
    const fEntries = Object.entries(colFilters).filter(([, v]) => (v ?? '').trim());
    if (fEntries.length) r = r.filter(d => fEntries.every(([id, v]) =>
      colFilterValue(d, id as ColId).toLowerCase().includes((v as string).trim().toLowerCase())));
    return r;
  }, [data, search, kpi, sortCol, sortDir, colFilters, wp, intakeMode]);

  /* Aantal boringen dat nog in de intake staat (huidig project of alle). */
  const intakeCount = useMemo(
    () => data.filter(d => (wp === 0 || d.werkpakket_id === wp) && !d.vervallen && d.intake_compleet !== true).length,
    [data, wp]
  );

  /* Boring doorzetten: opdrachtgever vastleggen + intake afronden → komt in het project. */
  const doorzetten = async (d: LemmerBoring) => {
    const keuze = intakeKeuze[d.id] ?? bepaalOpdrachtgever(d.klasse, d.lengte_m) ?? '';
    if (!keuze) { toast('Kies eerst een opdrachtgever', 'error'); return; }
    try { await save(d.id, { aannemer: keuze, intake_compleet: true } as Partial<LemmerBoring>); toast(`✓ Doorgezet naar ${keuze}`, 'success'); }
    catch (e) { toast((e as Error).message, 'error'); }
  };

  const openEdit = (id?: string) => {
    const d = id ? data.find(x => x.id === id) : undefined;
    setForm(d ? { ...d } : { vervallen: false, werkpakket_id: wp });
    setEditId(id ?? null);
    setModal(true);
  };
  const handleSave = async () => {
    if (!form.boring_nr?.trim()) { toast('Boor nr. is verplicht', 'error'); return; }
    let payload: Partial<LemmerBoring> = form;
    const orig = editId ? data.find(x => x.id === editId) : undefined;
    if (form.startdatum && form.startdatum !== orig?.startdatum) {
      const datums = genereerStapDatums(form.startdatum);
      const next: Record<string, StapData> = { ...(form.stappen ?? {}) };
      for (const id of Object.keys(datums)) next[id] = { ...(next[id] ?? {}), ...datums[id] };
      payload = { ...form, stappen: next };
    }
    try { await save(editId, payload); toast(editId ? '✓ Opgeslagen' : '✓ Toegevoegd', 'success'); setModal(false); }
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
        <td style={{ textAlign: 'center' }} title={`${f.fase} — open`}
          onClick={() => { setExpanded(prev => { const n = new Set(prev); n.add(d.id); return n; }); toggleFase(`${d.id}|${FASE_COL[colId]}`); }}>
          <span className={`lem-prog lem-prog-btn${compleet ? ' done' : begonnen ? ' active' : ''}`}>{klaar}/{total}</span>
        </td>
      );
    },
  });

  /* Weken-chip: kleur op basis van de ECHTE datum. Deadline vandaag of voorbij = rood. */
  const wkChip = (deadline?: string | null): React.ReactNode => {
    if (!deadline) return null;
    const d0 = new Date(deadline); d0.setHours(0, 0, 0, 0);
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const dagen = Math.round((d0.getTime() - t0.getTime()) / 86400000);
    const wk = Math.round((new Date(deadline).getTime() - Date.now()) / MS_WEEK);
    if (dagen < 0) return <span className="wk-chip wk-over">{Math.abs(wk) >= 1 ? `${Math.abs(wk)}w te laat` : 'te laat'}</span>;
    if (dagen === 0) return <span className="wk-chip wk-over">vandaag</span>;
    return wk <= 2 ? <span className="wk-chip wk-warn">{wk}w</span> : <span className="wk-chip wk-ok">{wk}w</span>;
  };

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
    startdatum: { label: 'Startdatum', sortKey: 'startdatum', cell: d => (
      <InlineCell type="date" value={d.startdatum}
        display={<span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDate(d.startdatum)}</span>}
        onSave={v => setStartEnPlanning(d, (v as string | undefined) || undefined)} />
    ) },
    fase0: faseCol('Fase 0', 'fase0'),
    faseG: faseCol('Gate', 'faseG'),
    fase1: faseCol('Fase 1', 'fase1'),
    fase2: faseCol('Fase 2', 'fase2'),
    einddatum: { label: 'Einddatum (auto)', cell: d => {
      const deadlines = ALLE_STAPPEN.map(s => getStap(d, s.id).deadline).filter(Boolean) as string[];
      const e = deadlines.length ? deadlines.reduce((a, b) => (a > b ? a : b)) : einddatumVan(d.startdatum);
      return <td style={{ fontSize: 11, whiteSpace: 'nowrap', color: e ? 'var(--text-2)' : 'var(--text-4)', fontWeight: e ? 500 : 400 }}
        title={e ? 'Laatste deadline van de stappen' : 'Vul eerst een startdatum in'}>{e ? fmtDate(e) : '—'}</td>;
    } },
    eind_weken: { label: 'Weken tot eind', cell: d => {
      const deadlines = ALLE_STAPPEN.map(s => getStap(d, s.id).deadline).filter(Boolean) as string[];
      const e = deadlines.length ? deadlines.reduce((a, b) => (a > b ? a : b)) : einddatumVan(d.startdatum);
      if (!e) return <td style={{ color: 'var(--text-4)', fontSize: 11 }}>—</td>;
      return <td style={{ whiteSpace: 'nowrap' }}>{wkChip(e)}</td>;
    } },
    actieve_stap: { label: 'Actieve stap', cell: d => {
      const a = activeStap(d);
      if (!a) return <td style={{ color: 'var(--text-4)', fontSize: 11 }}>{stappenGereed(d) === ALLE_STAPPEN.length ? 'Alles gereed' : '—'}</td>;
      const { step, sd } = a;
      return (
        <td style={{ minWidth: 230 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500, whiteSpace: 'nowrap' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{step.nr}.</span> {step.titel}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-4)', whiteSpace: 'nowrap' }}>
              <span>{sd.eigenaar || 'geen eigenaar'}</span><span>·</span>
              <span>{sd.deadline ? fmtDate(sd.deadline) : 'geen deadline'}</span>
              {wkChip(sd.deadline)}
            </div>
          </div>
        </td>
      );
    } },
    planning_apds: dateCol("Planning APD's", 'planning_apds'),
    actieve_eigenaar: { label: 'Eigenaar actieve stap', cell: d => {
      const a = activeStap(d);
      return <td style={{ whiteSpace: 'nowrap', color: 'var(--text-2)' }}>{a?.sd.eigenaar || '—'}</td>;
    } },
    aanlevering_compleet: dateCol('Aanlevering compleet', 'aanlevering_compleet'),
    ter_controle_uitvoering: dateCol('Ter controle uitvoering', 'ter_controle_uitvoering'),
    retour_uitvoering: dateCol('Retour ontvangen', 'retour_uitvoering'),
    schouw_uitgevoerd: dateCol('Schouw uitgevoerd', 'schouw_uitgevoerd'),
    opmerkingen_uitvoering: dateCol('Opm. uitvoering verwerkt', 'opmerkingen_uitvoering'),
    ontwerp_pct: pctCol('Ontwerp %', 'ontwerp_pct'),
    tek_pct: pctCol('Tek %', 'tek_pct'),
    status_werkterrein: statusCol('Werkterrein', 'status_werkterrein'),
    status_berekening: statusCol('Berekening', 'status_berekening'),
    sondering_nr: textCol('Sondering nr.', 'sondering_nr'),
    sondering_aangevraagd: textCol('Sondering aangevraagd', 'sondering_aangevraagd'),
    sondering_retour: textCol('Sondering retour', 'sondering_retour'),
    bundel_configuratie: textCol('Bundel', 'bundel_configuratie'),
    raakvlak: textCol('Raakvlak', 'raakvlak', { sort: false, wide: true }),
    opmerking_extra: textCol('Opmerkingen', 'opmerking_extra', { sort: false, wide: true }),
    case_nr: textCol('Case nr.', 'case_nr'),
    project: { label: 'Project', cell: d => (
      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-2)', fontWeight: 600 }}>
        {PROJECTEN.find(p => p.wp === d.werkpakket_id)?.naam ?? '—'}
      </td>
    ) },
    voorstel: { label: 'Voorstel opdrachtgever', cell: d => {
      const v = bepaalOpdrachtgever(d.klasse, d.lengte_m);
      return <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: v ? 'var(--accent)' : 'var(--text-4)' }}>{v ?? 'handmatig'}</td>;
    } },
    gereed: { label: 'Gereed', cell: d => (
      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <button className="btn" onClick={() => saveField(d.id, { gereed: !d.gereed })}
          title={d.gereed ? 'Markeer als niet gereed' : 'Markeer project als gereed'}
          style={{ fontSize: 11, padding: '2px 12px', fontWeight: 600,
            ...(d.gereed ? { background: 'var(--g-bg)', color: 'var(--g-fg)', borderColor: 'var(--g-mid)' } : {}) }}>
          {d.gereed ? '✓ Ja' : 'Nee'}
        </button>
      </td>
    ) },
  };

  const kpiCards: { id: string; num: number; label: string; cls?: string }[] = [
    { id: 'actief',    num: stats.totaal,    label: 'Boringen' },
    { id: 'groen',     num: stats.groen,     label: 'Op schema', cls: 'stat-G' },
    { id: 'geel',      num: stats.geel,      label: 'Aandacht',  cls: 'stat-A' },
    { id: 'rood',      num: stats.rood,      label: 'Te laat',   cls: 'stat-R' },
    { id: 'gereed',    num: stats.gereed,    label: 'Gereed' },
    { id: 'vervallen', num: stats.vervallen, label: 'Vervallen' },
  ];

  if (loading) return <div className="page-content"><div className="loading-bar" /></div>;

  return (
    <div className="page-content">
      <style>{`
        @keyframes lemReveal { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
        .lem-sub-panel { animation: lemReveal .18s cubic-bezier(0.4,0,0.2,1); }
        .lem-sub-table { border-collapse: separate; border-spacing: 0; font-family: var(--font); }
        .lem-sub-table th { text-align: left; padding: 4px 10px; font-size: var(--fz-xs); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-4); white-space: nowrap; }
        .lem-sub-table td { padding: 4px 10px; vertical-align: middle; }
        .lem-fase-row { cursor: pointer; background: var(--surface3); transition: background .12s ease; }
        .lem-fase-row:hover { background: var(--accent-3); }
        .lem-fase-name { font-size: var(--fz-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent); }
        .lem-chev { display: inline-block; transition: transform .16s cubic-bezier(0.4,0,0.2,1); color: var(--text-4); font-size: 9px; line-height: 1; }
        .lem-chev.open { transform: rotate(90deg); }
        .lem-step-row { background: var(--surface); border-top: 0.5px solid var(--border); transition: background .1s ease; }
        .lem-step-row:hover { background: var(--accent-3); }
        .lem-step-num { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; background: var(--surface3); color: var(--text-2); font-size: var(--fz-xs); font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
        .lem-step-title { font-size: var(--fz-base); color: var(--text-2); font-weight: 500; white-space: nowrap; }
        .lem-step-meta { font-size: var(--fz-xs); color: var(--text-4); white-space: nowrap; }
        .lem-dot { flex-shrink: 0; width: 8px; height: 8px; border-radius: 50%; transition: background .12s ease; }
        .lem-prog { display: inline-flex; align-items: center; justify-content: center; font-size: var(--fz-xs); font-weight: 700; padding: 2px 9px; border-radius: 20px; line-height: 1.5; white-space: nowrap; background: var(--n-bg); color: var(--text-3); border: 0.5px solid var(--border); transition: background .12s ease, color .12s ease, border-color .12s ease, transform .12s ease; }
        .lem-prog.active { background: var(--r-bg); color: var(--r-fg); border-color: var(--r-mid); }
        .lem-prog.done { background: var(--g-bg); color: var(--g-fg); border-color: var(--g-mid); }
        .lem-prog-btn { cursor: pointer; }
        .lem-prog-btn:hover { transform: translateY(-1px); filter: brightness(0.98); }
        .lem-sub-table .inline-edit { font-family: var(--font); font-size: var(--fz-base); transition: border-color .12s ease, box-shadow .12s ease; }
        .lem-sub-table .inline-edit:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-2); }
        .lem-link { color: var(--b-fg); cursor: pointer; transition: opacity .12s ease; }
        .lem-link:hover { opacity: 0.7; }
        .lem-person-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 12px; border-radius: var(--r); background: var(--surface3); transition: background .12s ease; }
        .lem-colpicker { position: absolute; right: 0; top: calc(100% + 6px); z-index: 41; width: 260px; max-height: 360px; overflow-y: auto; background: var(--surface); border: 0.5px solid var(--border-md); border-radius: var(--r-md); box-shadow: var(--sh-md); padding: 8px; animation: lemReveal .14s ease; }
        .lem-colpicker-row { display: flex; align-items: center; gap: 9px; padding: 5px 8px; border-radius: var(--r); font-size: var(--fz-md); color: var(--text-2); cursor: pointer; transition: background .1s ease; }
        .lem-colpicker-row:hover { background: var(--surface3); }
        .lem-colpicker-row input { accent-color: var(--accent); }
        .lem-person-row:hover { background: var(--n-mid); }
        .stat-card.stat-G .stat-num { color: var(--g-fg); }
        .stat-card.stat-A .stat-num { color: var(--r-fg); }
        .stat-card.stat-R .stat-num { color: var(--b-fg); }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{wp === 0 ? 'Alle projecten' : project.naam}</h1>
        <span style={{ fontSize: 12, color: 'var(--text-4)' }}>
          {wp === 0 ? `${PROJECTEN.length} projecten · ${stats.totaal} boringen` : `${project.fase} · case ${project.case} · ${project.pl}`}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        <button type="button" onClick={() => setWp(0)} className="btn"
          style={{ fontSize: 12, padding: '5px 12px', fontWeight: wp === 0 ? 700 : 500,
            ...(wp === 0 ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : {}) }}>
          Alle projecten
        </button>
        {PROJECTEN.map(p => (
          <button key={p.wp} type="button" onClick={() => setWp(p.wp)}
            className="btn"
            style={{ fontSize: 12, padding: '5px 12px', fontWeight: p.wp === wp ? 700 : 500,
              ...(p.wp === wp ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : {}) }}>
            {p.naam}
          </button>
        ))}
      </div>

      <div className="stats-bar">
        {kpiCards.map(c => (
          <button key={c.id} type="button"
            className={`stat-card stat-btn ${c.cls ?? ''}${kpi === c.id ? ' active' : ''}`}
            style={(c.id === 'vervallen' || c.id === 'gereed') && kpi !== c.id ? { opacity: 0.55 } : undefined}
            onClick={() => setKpi(c.id)}>
            <span className="stat-num">{c.num}</span><span className="stat-label">{c.label}</span>
          </button>
        ))}
      </div>

      <div className="filter-bar" style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '0.75rem 0', flexWrap: 'wrap' }}>
        <input className="field-input" placeholder="Zoeken…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <button className="btn" onClick={() => setPersonenOpen(true)} style={{ fontSize: 11 }} title="Personen beheren">👤 Personen</button>
        <button className="btn" onClick={toggleAlleKolommen} style={{ fontSize: 11 }} title={allVisible ? 'Terug naar compacte weergave' : 'Alle projectinfo als kolommen tonen'}>
          {allVisible ? '⤡ Inklappen' : '⤢ Uitklappen'}
        </button>
        <button className="btn" onClick={() => setFiltersOpen(o => !o)} style={{ fontSize: 11, ...(filtersOpen || activeFilters ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}) }} title="Filter de rijen per kolom">
          ⌕ Filter{activeFilters ? ` (${activeFilters})` : ''}
        </button>
        <button className="btn" onClick={handleOpslaan} disabled={opslaan} style={{ fontSize: 11 }} title="Synchroniseren met de database (wijzigingen worden al automatisch opgeslagen)">
          {opslaan ? '… Opslaan' : '💾 Opslaan'}
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <button className="btn" onClick={() => setColPickerOpen(o => !o)} style={{ fontSize: 11 }} title="Kies welke kolommen zichtbaar zijn">
            ▦ Kolommen ({visibleCols.length}/{columnOrder.length - 1}) ▾
          </button>
          {colPickerOpen && (
            <>
              <div onClick={() => setColPickerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
              <div className="lem-colpicker">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 8px 8px', borderBottom: '0.5px solid var(--border)', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-4)' }}>Kolommen tonen</span>
                  <button className="btn" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => { setColumnOrder(DEFAULT_COL_ORDER); setHidden(new Set(DEFAULT_HIDDEN)); }} title="Volgorde + zichtbaarheid terugzetten">↺ Standaard</button>
                </div>
                {columnOrder.filter(id => id !== 'boring_nr').map(id => (
                  <label key={id} className="lem-colpicker-row">
                    <input type="checkbox" checked={!hidden.has(id)} onChange={() => toggleHidden(id)} />
                    {columns[id].label}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="table-wrap">
        <div className="tbl-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: STICKY_META_W, position: 'sticky', left: 0, zIndex: 6, background: stickyGrey }}></th>
                <th style={{ width: STICKY_NUM_W, textAlign: 'center', color: 'var(--text-4)', fontWeight: 600, position: 'sticky', left: STICKY_META_W, zIndex: 6, background: stickyGrey }} title="Volgnummer">#</th>
                {wp === 0 && (
                  <th style={{ width: STICKY_PROJECT_W, position: 'sticky', left: stickyProjectLeft, zIndex: 6, background: 'var(--surface)' }}>Project</th>
                )}
                <th style={{ position: 'sticky', left: stickyBoringLeft, zIndex: 6, background: 'var(--surface)' }}
                  className="sortable" onClick={() => sort('boring_nr')}>
                  Boor nr{srt('boring_nr')}
                </th>
                {visibleCols.map(id => {
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
              {filtersOpen && (
                <tr>
                  <th style={{ padding: '2px 4px', textAlign: 'center', position: 'sticky', left: 0, zIndex: 6, background: stickyGrey }}>
                    {activeFilters > 0 && (
                      <button className="btn" title="Filters wissen" style={{ fontSize: 10, padding: '1px 5px' }} onClick={() => setColFilters({})}>✕</button>
                    )}
                  </th>
                  <th style={{ position: 'sticky', left: STICKY_META_W, zIndex: 6, background: stickyGrey }}></th>
                  {wp === 0 && (
                    <th style={{ padding: '2px 6px', position: 'sticky', left: stickyProjectLeft, zIndex: 6, background: 'var(--surface)' }}>
                      <input className="inline-edit" style={{ width: '100%', minWidth: 64, fontWeight: 400 }} placeholder="filter…"
                        value={colFilters['project'] ?? ''} onChange={e => setColFilters(f => ({ ...f, project: e.target.value }))} />
                    </th>
                  )}
                  <th style={{ padding: '2px 6px', position: 'sticky', left: stickyBoringLeft, zIndex: 6, background: 'var(--surface)' }}>
                    <input className="inline-edit" style={{ width: '100%', minWidth: 64, fontWeight: 400 }} placeholder="filter…"
                      value={colFilters['boring_nr'] ?? ''} onChange={e => setColFilters(f => ({ ...f, boring_nr: e.target.value }))} />
                  </th>
                  {visibleCols.map(id => (
                    <th key={id} style={{ padding: '2px 6px' }}>
                      <input className="inline-edit" style={{ width: '100%', minWidth: 64, fontWeight: 400 }} placeholder="filter…"
                        value={colFilters[id] ?? ''} onChange={e => setColFilters(f => ({ ...f, [id]: e.target.value }))} />
                    </th>
                  ))}
                  <th></th>
                </tr>
              )}
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={visibleCols.length + 4 + (wp === 0 ? 1 : 0)}><div className="empty-state"><strong>{intakeMode ? 'Geen boringen in de intake' : 'Geen boringen gevonden'}</strong>{intakeMode ? 'Alles is doorgezet naar het project.' : 'Pas de filters aan.'}</div></td></tr>
              ) : rows.map((d, idx) => {
                const isOpen = expanded.has(d.id);
                const rowBg = d.gereed ? 'var(--n-bg)'
                  : (!d.vervallen && boringHealth(d) === 'rood') ? 'var(--b-bg)'
                  : (!d.vervallen && boringHealth(d) === 'geel') ? 'var(--r-bg)'
                  : 'var(--surface)';
                return (
                  <Fragment key={d.id}>
                    <tr style={{
                      opacity: d.vervallen ? 0.45 : d.gereed ? 0.6 : 1,
                      background: rowBg === 'var(--surface)' ? undefined : rowBg,
                    }}>
                      <td style={{ textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap', position: 'sticky', left: 0, zIndex: 3, background: stickyGrey }}
                        title={isOpen ? 'Stappen inklappen' : 'Stappen uitklappen'}
                        onClick={() => toggleExpand(d.id)}>
                        <span className={`lem-chev${isOpen ? ' open' : ''}`} style={{ fontSize: 10 }}>▶</span>
                        {(() => { const g = stappenGereed(d); return <span style={{ marginLeft: 5, fontSize: 9, fontWeight: 700, color: g > 0 ? 'var(--g-fg)' : 'var(--text-4)' }}>{g}/{ALLE_STAPPEN.length}</span>; })()}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-4)', fontVariantNumeric: 'tabular-nums', position: 'sticky', left: STICKY_META_W, zIndex: 3, background: stickyGrey }}>{idx + 1}</td>
                      {wp === 0 && (
                        <td style={{ position: 'sticky', left: stickyProjectLeft, zIndex: 3, background: rowBg, whiteSpace: 'nowrap', color: 'var(--text-2)', fontWeight: 600 }}>
                          {PROJECTEN.find(p => p.wp === d.werkpakket_id)?.naam ?? '—'}
                        </td>
                      )}
                      <InlineCell type="text" value={d.boring_nr}
                        tdStyle={{ fontWeight: 600, position: 'sticky', left: stickyBoringLeft, zIndex: 3, background: rowBg }}
                        display={<span>{d.boring_nr || '—'}</span>}
                        onSave={v => saveField(d.id, { boring_nr: (v ?? '') as string })} />
                      {visibleCols.map(id => <Fragment key={id}>{columns[id].cell(d)}</Fragment>)}
                      <td onClick={e => e.stopPropagation()}>
                        {intakeMode ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>
                            <select className="inline-edit" style={{ fontSize: 11, minWidth: 96 }}
                              value={intakeKeuze[d.id] ?? bepaalOpdrachtgever(d.klasse, d.lengte_m) ?? ''}
                              onChange={e => setIntakeKeuze(k => ({ ...k, [d.id]: e.target.value }))}>
                              <option value="">— kies —</option>
                              {OPDRACHTGEVERS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <button className="btn btn-primary" style={{ fontSize: 11, padding: '2px 10px', whiteSpace: 'nowrap' }}
                              onClick={() => doorzetten(d)} title="Opdrachtgever vastleggen en in het project plaatsen">Doorzetten →</button>
                          </div>
                        ) : (
                          <button className="btn" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => openEdit(d.id)}>✎</button>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td></td>
                        <td></td>
                        {wp === 0 && <td></td>}
                        <td></td>
                        <td colSpan={visibleCols.length + 1} style={{ padding: '8px 10px 16px 8px', background: 'var(--bg)' }}>
                          <div className="lem-sub-panel">
                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
                              Engineering-stappen — <strong style={{ color: 'var(--text-2)' }}>{stappenGereed(d)} van {ALLE_STAPPEN.length}</strong> gereed
                            </div>
                            <table className="lem-sub-table" style={{ maxWidth: 1180 }}>
                              <thead>
                                <tr>
                                  <th>Stap</th><th>Status</th><th>Eigenaar</th><th>Plandatum</th><th>Deadline</th><th>Weken resterend</th><th style={{ textAlign: 'center' }}>Afgerond</th>
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
                                      <tr className="lem-fase-row" onClick={() => toggleFase(faseKey)}>
                                        <td colSpan={7} style={{ padding: '8px 10px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span className={`lem-chev${faseOpen ? ' open' : ''}`}>▶</span>
                                            <span className="lem-fase-name">{f.fase}</span>
                                            <span className={`lem-prog${compleet ? ' done' : ''}`} style={{ marginLeft: 2 }}>{klaar}/{total}</span>
                                          </div>
                                        </td>
                                      </tr>
                                      {faseOpen && f.stappen.map(s => {
                                        const sd = getStap(d, s.id);
                                        const dot = STAP_KLEUR[sd.status ?? ''] ?? 'var(--border-md)';
                                        const teLaat = (() => {
                                          if (!sd.deadline || stapDone(sd) || sd.status === 'N.v.t.') return false;
                                          const d0 = new Date(sd.deadline); d0.setHours(0, 0, 0, 0);
                                          const t0 = new Date(); t0.setHours(0, 0, 0, 0);
                                          return d0.getTime() <= t0.getTime();
                                        })();
                                        return (
                                          <tr className="lem-step-row" key={s.id}
                                            style={teLaat ? { background: 'var(--b-bg)', boxShadow: 'inset 3px 0 0 var(--b-fg)' } : undefined}>
                                            <td style={{ minWidth: 320 }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span className="lem-step-num">{s.nr}</span>
                                                <span className="lem-dot" style={{ background: dot }} />
                                                <span className="lem-step-title">{s.titel}</span>
                                                <span className="lem-step-meta">· {s.wie} · {s.tijd}</span>
                                              </div>
                                            </td>
                                            <td>
                                              <select className="inline-edit" style={{ minWidth: 104, cursor: 'pointer' }}
                                                value={sd.status ?? ''} onChange={e => saveStapVeld(d, s.id, { status: e.target.value || undefined })}>
                                                <option value="">—</option>
                                                {STAP_STATUS.map(st => <option key={st} value={st}>{st}</option>)}
                                              </select>
                                            </td>
                                            <td>
                                              <select className="inline-edit" style={{ minWidth: 150, cursor: 'pointer' }}
                                                value={sd.eigenaar ?? ''} onChange={e => saveStapVeld(d, s.id, { eigenaar: e.target.value || undefined })}>
                                                <option value="">—</option>
                                                {sd.eigenaar && !personen.some(p => p.naam === sd.eigenaar) && <option value={sd.eigenaar}>{sd.eigenaar}</option>}
                                                {personen.map(p => <option key={p.id} value={p.naam}>{p.naam}</option>)}
                                              </select>
                                            </td>
                                            <td>
                                              <input className="inline-edit" type="date" style={{ minWidth: 120, cursor: 'pointer' }} value={sd.plandatum ?? ''}
                                                onChange={e => saveStapVeld(d, s.id, { plandatum: e.target.value || undefined })}
                                                onClick={e => { try { (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch { /* */ } }} />
                                            </td>
                                            <td>
                                              <input className="inline-edit" type="date" style={{ minWidth: 120, cursor: 'pointer' }} value={sd.deadline ?? ''}
                                                onChange={e => saveStapVeld(d, s.id, { deadline: e.target.value || undefined })}
                                                onClick={e => { try { (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch { /* */ } }} />
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                              {sd.afgerond
                                                ? <span className="wk-chip wk-ok">afgerond</span>
                                                : sd.deadline
                                                  ? wkChip(sd.deadline)
                                                  : <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                              <input type="checkbox" checked={!!sd.afgerond} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--accent)' }}
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
                          </div>
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
            <F label="Startdatum"><DateInput value={form.startdatum} onChange={v => setForm(f => ({ ...f, startdatum: v }))} /></F>
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
            <F label="Project gereed"><label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 6 }}><input type="checkbox" checked={form.gereed ?? false} onChange={e => setForm(f => ({ ...f, gereed: e.target.checked }))} style={{ width: 15, height: 15 }} /><span style={{ fontSize: 12 }}>Ja, gereed</span></label></F>
            <F label="Raakvlak" span><textarea className="field-input" rows={2} value={form.raakvlak ?? ''} onChange={e => setForm(f => ({ ...f, raakvlak: e.target.value }))} style={{ resize: 'vertical' }} /></F>
            <F label="Opmerkingen" span><textarea className="field-input" rows={2} value={form.opmerking_extra ?? ''} onChange={e => setForm(f => ({ ...f, opmerking_extra: e.target.value }))} style={{ resize: 'vertical' }} /></F>
          </div>
        </Modal>
      )}

      {personenOpen && (
        <Modal open onClose={() => setPersonenOpen(false)} maxWidth={440} title="Personen beheren"
          footer={<button className="btn" onClick={() => setPersonenOpen(false)}>Sluiten</button>}>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 12px' }}>
            Voeg personen toe of verwijder ze. Ze zijn daarna te kiezen als <strong>eigenaar</strong> bij elke stap.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input className="field-input" placeholder="Naam toevoegen…" value={nieuwPersoon} style={{ flex: 1 }}
              onChange={e => setNieuwPersoon(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPersoon(); } }} />
            <button className="btn btn-primary" onClick={handleAddPersoon}>Toevoegen</button>
          </div>
          {personen.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-4)' }}>Nog geen personen toegevoegd.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
              {personen.map(p => (
                <div key={p.id} className="lem-person-row">
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{p.naam}</span>
                  <button className="btn" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => handleRemovePersoon(p.id)}>
                    <span className="lem-link">Verwijderen</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function F({ label, children, span }: { label: string; children: React.ReactNode; span?: boolean }) {
  return <div style={{ gridColumn: span ? '1 / -1' : undefined }}><label className="field-label">{label}</label>{children}</div>;
}

/* ── Vertaallaag module ↔ boringen-tabel ───────────────────────────────────
   Sommige module-velden heten anders in de boringen-tabel; alleen bestaande
   boringen-kolommen worden geschreven (whitelist), zodat opslaan nooit naar
   een niet-bestaande kolom gaat. */
const ALIAS_TO_DB: Record<string, string> = {
  startdatum: 'startdatum_engineering',
  gereed: 'engineering_afgerond',
  tek_pct: 'hdd_tek_pct',
  opmerking_extra: 'opmerkingen',
};
const BORINGEN_COLS = new Set<string>([
  'werkpakket_id', 'boring_nr', 'type_boring', 'locatie', 'lengte_m', 'diameter_mm', 'diepte_m',
  'aannemer', 'startdatum', 'einddatum', 'opmerkingen', 'status', 'werkpakket_nr', 'klasse',
  'apd_verantw', 'oplevering_toolgate', 'planning_apds', 'status_ontwerp', 'hdd_tek_pct',
  'status_werkterrein', 'status_berekening', 'proefsleuf_nr', 'sondering_nr', 'bundel_configuratie',
  'prioritering', 'vervallen', 'intake_compleet', 'startdatum_engineering', 'deadline_engineering',
  'engineering_afgerond', 'stappen',
]);
function fromDb(row: Record<string, unknown>): LemmerBoring {
  return {
    ...row,
    startdatum: row.startdatum_engineering as string | undefined,
    gereed: row.engineering_afgerond as boolean | undefined,
    tek_pct: row.hdd_tek_pct as number | undefined,
    opmerking_extra: row.opmerkingen as string | undefined,
  } as unknown as LemmerBoring;
}
function toDb(form: Partial<LemmerBoring>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(form)) {
    const key = ALIAS_TO_DB[k] ?? k;
    if (BORINGEN_COLS.has(key)) out[key] = v;
  }
  return out;
}

/* Data-hook: leest/schrijft alle projecten uit de gedeelde boringen-tabel. */
function useLemmerData() {
  const [data, setData] = useState<LemmerBoring[]>([]);
  const [loading, setLoading] = useState(true);
  const [personen, setPersonen] = useState<Persoon[]>([]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: rows, error } = await supabase.from('boringen').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      setData((rows ?? []).map(r => fromDb(r as Record<string, unknown>)));
    } catch (err) { console.error('Fout bij laden boringen:', err); }
    finally { setLoading(false); }
  }, []);
  const loadPersonen = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: rows, error } = await supabase.from('personen').select('*').order('naam', { ascending: true });
      if (error) throw error;
      setPersonen((rows ?? []) as unknown as Persoon[]);
    } catch (err) { console.error('Fout bij laden personen:', err); }
  }, []);
  useEffect(() => { load(); loadPersonen(); }, [load, loadPersonen]);
  const addPersoon = useCallback(async (naam: string) => {
    const supabase = createClient();
    const { data: ins, error } = await supabase.from('personen').insert({ naam } as never).select();
    if (error) throw new Error(error.message);
    if (ins) setPersonen(prev => [...prev, ...(ins as unknown as Persoon[])].sort((a, b) => a.naam.localeCompare(b.naam)));
  }, []);
  const removePersoon = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('personen').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setPersonen(prev => prev.filter(p => p.id !== id));
  }, []);
  const save = useCallback(async (id: string | null, form: Partial<LemmerBoring>) => {
    const supabase = createClient();
    if (id) {
      const { error } = await supabase.from('boringen').update(toDb(form) as never).eq('id', id);
      if (error) throw new Error(error.message);
      setData(prev => prev.map(r => r.id === id ? { ...r, ...form } : r));
    } else {
      const { data: ins, error } = await supabase.from('boringen').insert(toDb(form) as never).select();
      if (error) throw new Error(error.message);
      if (ins) setData(prev => [...prev, ...ins.map(r => fromDb(r as Record<string, unknown>))]);
    }
  }, []);
  const remove = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('boringen').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setData(prev => prev.filter(r => r.id !== id));
  }, []);
  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data: rows, error } = await supabase.from('boringen').select('*').order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    setData((rows ?? []).map(r => fromDb(r as Record<string, unknown>)));
  }, []);
  return { data, loading, save, remove, reload: load, refresh, personen, addPersoon, removePersoon };
}
