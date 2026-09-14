'use client';

import { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef, Fragment } from 'react';
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
  status_ontwerp?: string;
  aanlevering_compleet?: string;
  datum_gereed?: string;
  ter_controle_uitvoering?: string;
  retour_uitvoering?: string;
  opmerkingen_uitvoering?: string;
  schouw_uitgevoerd?: string;
  planning_apds?: string;
  tek_pct?: number;
  ontwerp_pct?: number;
  status_werkterrein?: string;
  status_berekening?: string;
  proefsleuf_nr?: string;
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
  einddatum?: string;
  stappen?: Record<string, StapData>;
}

/* ── Keuzelijsten ─────────────────────────────────────────────────────────── */
const TYPES_BORING = ['Gyro', 'Walk-over', 'Walkover', 'Nanodrill', 'Nano-Drill', 'Avegaar', 'Anders'];
const KLASSEN      = ['9T', '17T', '27T', '50T', '>50T', '120T'];
const AANNEMERS    = ['Heijmans', 'Heijmans DTE', 'Voskuilen', 'Voskuilen / Heijmans', 'Pol', 'Anders'];
const STATUSSEN    = ['Niet gestart', 'Gestart', 'Ter controle', 'Goedgekeurd', 'Vrijgegeven', 'Voldoet', 'N.v.t.', 'Vervallen'];
/* Statussen voor 'HDD Ontwerp' — zelfde set als het oorspronkelijke Excel-dashboard (zie STATUS_COLORS-legenda). */
const ONTWERP_STATUSSEN = ['Niet gestart', 'Gestart', 'Ter controle', 'Afgekeurd', 'Goedgekeurd', 'Vrijgegeven', 'Issue', 'Vervallen'];
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
/* Per stap, per boring: status + eigenaar + plandatum + deadline + afgerond. */
type StapData = { status?: string; eigenaar?: string; plandatum?: string; deadline?: string; afgerond?: boolean };
type Persoon = { id: string; naam: string };

/* ── Kolommen (versleepbaar) ──────────────────────────────────────────────── */
type ColId =
  | 'boring_nr' | 'werkpakket_nr' | 'locatie' | 'lengte_m' | 'type_boring' | 'aannemer' | 'klasse'
  | 'prioritering' | 'oplevering_toolgate' | 'status_ontwerp' | 'projectfase' | 'engineeringsfase'
  | 'startdatum' | 'einddatum' | 'eind_weken'
  | 'aanlevering_compleet' | 'datum_gereed' | 'ter_controle_uitvoering' | 'retour_uitvoering' | 'schouw_uitgevoerd'
  | 'opmerkingen_uitvoering' | 'planning_apds' | 'ontwerp_pct' | 'tek_pct' | 'status_werkterrein'
  | 'status_berekening' | 'proefsleuf_nr' | 'sondering_nr' | 'sondering_aangevraagd' | 'sondering_retour'
  | 'bundel_configuratie' | 'raakvlak' | 'opmerking_extra' | 'case_nr' | 'gereed' | 'project' | 'voorstel';

/* Volgorde 1 t/m 18 komt exact overeen met het oorspronkelijke Excel-dashboard
   (Dashboard_HDD_V2.0) — dat is nu ook de standaard-weergave. Alles daarna zijn
   latere toevoegingen (stappen-planning, uitvoering, etc.) die standaard verborgen
   staan (zie DEFAULT_HIDDEN) maar via de kolomkiezer of 'Uitklappen' bereikbaar blijven. */
const DEFAULT_COL_ORDER: ColId[] = [
  'case_nr', 'boring_nr', 'werkpakket_nr', 'locatie', 'lengte_m', 'type_boring', 'aannemer', 'klasse',
  'oplevering_toolgate', 'planning_apds', 'status_ontwerp', 'tek_pct', 'status_werkterrein', 'status_berekening',
  'proefsleuf_nr', 'sondering_nr', 'bundel_configuratie', 'opmerking_extra',
  'prioritering', 'projectfase', 'engineeringsfase',
  'startdatum', 'eind_weken',
  'aanlevering_compleet', 'datum_gereed', 'ter_controle_uitvoering', 'retour_uitvoering', 'schouw_uitgevoerd',
  'opmerkingen_uitvoering', 'ontwerp_pct', 'sondering_aangevraagd', 'sondering_retour',
  'raakvlak',
  /* Helemaal rechts: 'einddatum' (Definitief gereed) bepaalt de rood/geel/groen-status (zie
     boringHealth), daarom altijd zichtbaar. 'gereed' (de handmatige Ja/Nee-knop) staat er
     bewust vlak naast, als allerlaatste kolom. */
  'einddatum', 'gereed',
];
/* Standaard verborgen kolommen (compacte weergave) — toonbaar via de kolomkiezer of de knop Uitklappen. */
const DEFAULT_HIDDEN: ColId[] = [
  'prioritering', 'projectfase', 'engineeringsfase',
  'startdatum', 'eind_weken',
  'aanlevering_compleet', 'datum_gereed', 'ter_controle_uitvoering', 'retour_uitvoering', 'schouw_uitgevoerd',
  'opmerkingen_uitvoering', 'ontwerp_pct', 'sondering_aangevraagd', 'sondering_retour',
  'raakvlak',
];
const COL_ORDER_KEY = 'hvp_lemmer_colorder_v15';
const HIDDEN_KEY = 'hvp_lemmer_hidden_v10';
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
  const [sortCol, setSortCol] = useState<keyof LemmerBoring | null>(null);
  const [sortDir, setSortDir] = useState(1);

  const [columnOrder, setColumnOrder] = useState<ColId[]>(DEFAULT_COL_ORDER);
  const [dragCol, setDragCol]         = useState<ColId | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ColId | null>(null);
  const [hidden, setHidden]           = useState<Set<ColId>>(new Set(DEFAULT_HIDDEN));
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  /* Horizontale scroll-synchronisatie tussen de vaste kop-tabel (in het sticky
     bovenblok) en de scrollende data-tabel eronder — zo blijft de kop altijd
     zichtbaar zonder fragiele pixel-berekeningen voor verticale positionering. */
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef<'header' | 'body' | null>(null);
  const syncScrollFromBody = () => {
    if (syncingRef.current === 'header') { syncingRef.current = null; return; }
    if (headerScrollRef.current && bodyScrollRef.current) { syncingRef.current = 'body'; headerScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft; }
  };
  const syncScrollFromHeader = () => {
    if (syncingRef.current === 'body') { syncingRef.current = null; return; }
    if (headerScrollRef.current && bodyScrollRef.current) { syncingRef.current = 'header'; bodyScrollRef.current.scrollLeft = headerScrollRef.current.scrollLeft; }
  };

  const [colFilters, setColFilters]   = useState<Partial<Record<ColId, string>>>({});
  const activeFilters = Object.values(colFilters).filter(v => (v ?? '').trim()).length;

  const [modal, setModal]   = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm]     = useState<Partial<LemmerBoring>>({});
  const [remarkEdit, setRemarkEdit] = useState<{ id: string; value: string } | null>(null);

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
  const STICKY_BORING_W = 92;
  /* Dwingt een exacte kolombreedte af (anders mag de browser 'm oprekken op inhoud,
     waardoor sticky left-offsets niet meer kloppen en er een kiertje ontstaat). */
  const fixedW = (w: number): React.CSSProperties => ({ width: w, minWidth: w, maxWidth: w, overflow: 'hidden' });
  const HDR_H = 48; // moet gelijk blijven aan --hdr-h in globals.css
  const stickyProjectLeft = STICKY_META_W + STICKY_NUM_W;
  const stickyBoringLeft = stickyProjectLeft + (wp === 0 ? STICKY_PROJECT_W : 0);
  const stickyGrey = 'var(--surface2)';

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
  /* Automatisch berekende einddatum: laatste stap-deadline, of anders projectie vanaf startdatum. */
  const autoEinddatum = (d: LemmerBoring): string | null => {
    const deadlines = ALLE_STAPPEN.map(s => getStap(d, s.id).deadline).filter(Boolean) as string[];
    return deadlines.length ? deadlines.reduce((a, b) => (a > b ? a : b)) : einddatumVan(d.startdatum);
  };
  /* Effectieve einddatum: een handmatig ingevulde datum (d.einddatum) heeft voorrang op de
     automatische berekening — zo kun je 'Definitief gereed' overrulen zonder de stappen-data
     of startdatum aan te raken. */
  const einddatumEffectief = (d: LemmerBoring): string | null => d.einddatum ?? autoEinddatum(d);
  /* Startdatum opslaan én meteen plandatum + deadline van alle stappen doorrekenen. */
  const setStartEnPlanning = async (d: LemmerBoring, start?: string) => {
    if (!start) { try { await save(d.id, { startdatum: undefined }); } catch (e) { toast((e as Error).message, 'error'); } return; }
    const datums = genereerStapDatums(start);
    const next: Record<string, StapData> = { ...(d.stappen ?? {}) };
    for (const id of Object.keys(datums)) next[id] = { ...getStap(d, id), ...datums[id] };
    try { await save(d.id, { startdatum: start, stappen: next }); toast('✓ Planning doorgerekend', 'success'); }
    catch (e) { toast((e as Error).message, 'error'); }
  };
  /* Afgeleide status uit ontwerp % (voor de KPI-kaarten). */
  const rowStatus = (d: LemmerBoring) =>
    d.vervallen ? 'vervallen' : d.ontwerp_pct === 1 ? 'gereed' : (d.ontwerp_pct ?? 0) > 0 ? 'loopt' : 'niet';
  /* Stoplicht-status op basis van de Einddatum (auto) t.o.v. vandaag:
     rood = einddatum al verstreken, geel = einddatum binnen 2 weken, anders groen.
     (14 sep 2026: vereenvoudigd van per-stap-deadlines naar alleen de einddatum. Sinds het
     stappenpaneel uit de UI is (zie Wijziging 4), kan niemand een tussenliggende stap meer
     afronden — zo'n boring bleef daardoor permanent rood staan op een gepasseerde tussenstap,
     ook als de einddatum zelf nog ver weg was. Nu telt alleen de einddatum zelf mee, dezelfde
     datum die ook in de kolom 'Einddatum (auto)' te zien is.) */
  const boringHealth = (d: LemmerBoring): 'groen' | 'geel' | 'rood' => {
    if (d.gereed) return 'groen';
    const e = einddatumEffectief(d);
    if (!e) return 'groen';
    const wk = (new Date(e).getTime() - Date.now()) / MS_WEEK;
    if (wk < 0) return 'rood';
    if (wk <= 2) return 'geel';
    return 'groen';
  };
  /* Tekstwaarde per kolom om op te filteren — werkt ook voor berekende kolommen. */
  const colFilterValue = (d: LemmerBoring, id: ColId): string => {
    if (id === 'project') return PROJECTEN.find(p => p.wp === d.werkpakket_id)?.naam ?? '';
    if (id === 'case_nr') return PROJECTEN.find(p => p.wp === d.werkpakket_id)?.case ?? '';
    if (id === 'gereed') return d.gereed ? 'ja' : 'nee';
    if (id === 'einddatum' || id === 'eind_weken') {
      const e = einddatumEffectief(d);
      if (id === 'einddatum') return e ?? '';
      if (!e) return '';
      return String(Math.round((new Date(e).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7)));
    }
    return String(d[id as keyof LemmerBoring] ?? '');
  };

  const stats = useMemo(() => {
    const proj = data.filter(d => wp === 0 || d.werkpakket_id === wp);
    const a = proj.filter(d => !d.vervallen && !d.gereed);
    let groen = 0, geel = 0, rood = 0;
    for (const d of a) { const h = boringHealth(d); if (h === 'rood') rood++; else if (h === 'geel') geel++; else groen++; }
    return { totaal: proj.length, groen, geel, rood, openstaand: a.length, vervallen: proj.filter(d => d.vervallen).length, gereed: proj.filter(d => d.gereed && !d.vervallen).length };
  }, [data, wp]);

  const rows = useMemo(() => {
    let r = data.filter(d => {
      if (wp !== 0 && d.werkpakket_id !== wp) return false;
      if (intakeMode) { if (d.intake_compleet === true) return false; }
      else { if (d.intake_compleet !== true) return false; }
      if (kpi === 'vervallen') { if (!d.vervallen) return false; }
      else if (kpi === 'gereed') { if (!d.gereed || d.vervallen) return false; }
      else if (kpi === 'actief') { /* toont alles, geen uitsluiting */ }
      else if (kpi === 'openstaand') { if (d.vervallen || d.gereed) return false; }
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
  const statusCol = (label: string, key: keyof LemmerBoring, opties: string[] = STATUSSEN): { label: string; sortKey?: keyof LemmerBoring; cell: (d: LemmerBoring) => React.ReactNode } => ({
    label, sortKey: key,
    cell: d => (
      <InlineCell type="select" value={d[key] as string | undefined} options={toOpts(opties)}
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
    status_ontwerp: statusCol('HDD Ontwerp', 'status_ontwerp', ONTWERP_STATUSSEN),
    projectfase: textCol('Projectfase', 'projectfase'),
    engineeringsfase: textCol('Engineeringsfase', 'engineeringsfase', { wide: true }),
    startdatum: { label: 'Startdatum', sortKey: 'startdatum', cell: d => (
      <InlineCell type="date" value={d.startdatum}
        display={<span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDate(d.startdatum)}</span>}
        onSave={v => setStartEnPlanning(d, (v as string | undefined) || undefined)} />
    ) },
    einddatum: { label: 'Definitief gereed', cell: d => {
      const auto = autoEinddatum(d);
      const e = d.einddatum ?? auto;
      return (
        <InlineCell type="date" value={d.einddatum ?? auto ?? undefined}
          display={<span style={{ fontSize: 11, whiteSpace: 'nowrap', color: e ? 'var(--text-2)' : 'var(--text-4)', fontWeight: e ? 500 : 400 }}>
            {e ? fmtDate(e) : '—'}
          </span>}
          tdStyle={{}}
          onSave={v => saveField(d.id, { einddatum: (v as string | undefined) || undefined })} />
      );
    } },
    eind_weken: { label: 'Weken tot eind', cell: d => {
      const e = einddatumEffectief(d);
      if (!e) return <td style={{ color: 'var(--text-4)', fontSize: 11 }}>—</td>;
      return <td style={{ whiteSpace: 'nowrap' }}>{wkChip(e)}</td>;
    } },
    planning_apds: dateCol("Planning APD's", 'planning_apds'),
    aanlevering_compleet: dateCol('Aanlevering compleet', 'aanlevering_compleet'),
    datum_gereed: dateCol('Datum gereed (verwacht)', 'datum_gereed'),
    ter_controle_uitvoering: dateCol('Ter controle uitvoering', 'ter_controle_uitvoering'),
    retour_uitvoering: dateCol('Retour ontvangen', 'retour_uitvoering'),
    schouw_uitgevoerd: dateCol('Schouw uitgevoerd', 'schouw_uitgevoerd'),
    opmerkingen_uitvoering: dateCol('Opm. uitvoering verwerkt', 'opmerkingen_uitvoering'),
    ontwerp_pct: pctCol('Ontwerp %', 'ontwerp_pct'),
    tek_pct: pctCol('Tek %', 'tek_pct'),
    status_werkterrein: statusCol('Werkterrein', 'status_werkterrein'),
    status_berekening: statusCol('Berekening', 'status_berekening'),
    proefsleuf_nr: textCol('Proefsleuf nr.', 'proefsleuf_nr'),
    sondering_nr: textCol('Sondering nr.', 'sondering_nr'),
    sondering_aangevraagd: textCol('Sondering aangevraagd', 'sondering_aangevraagd'),
    sondering_retour: textCol('Sondering retour', 'sondering_retour'),
    bundel_configuratie: textCol('Bundel', 'bundel_configuratie'),
    raakvlak: textCol('Raakvlak', 'raakvlak', { sort: false, wide: true }),
    opmerking_extra: { label: 'Opmerkingen', cell: d => (
      <td className="inline-cell" title="Klik om te bewerken"
        style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 180, maxWidth: 320, cursor: 'pointer' }}
        onClick={e => { e.stopPropagation(); setRemarkEdit({ id: d.id, value: d.opmerking_extra ?? '' }); }}>
        {d.opmerking_extra || '—'}
      </td>
    ) },
    case_nr: { label: 'Case nr.', cell: d => (
      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-2)' }}>
        {PROJECTEN.find(p => p.wp === d.werkpakket_id)?.case ?? '—'}
      </td>
    ) },
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
    { id: 'actief',    num: stats.totaal,    label: 'Alle boringen' },
    { id: 'openstaand', num: stats.openstaand, label: 'Openstaand' },
    { id: 'groen',     num: stats.groen,     label: 'Op schema', cls: 'stat-G' },
    { id: 'geel',      num: stats.geel,      label: 'Aandacht',  cls: 'stat-A' },
    { id: 'rood',      num: stats.rood,      label: 'Te laat',   cls: 'stat-R' },
    { id: 'gereed',    num: stats.gereed,    label: 'Gereed' },
    { id: 'vervallen', num: stats.vervallen, label: 'Vervallen' },
  ];

  /* De kop-tabel en de data-tabel zijn twee losse <table>-elementen (nodig voor
     de sticky-opstelling hierboven), dus berekent de browser hun kolombreedtes
     onafhankelijk van elkaar. Voor de vastgezette kolommen maakt dat niet uit
     (die hebben een expliciete breedte via STICKY_*_W), maar de vrije kolommen
     zouden anders verschillen: de kop-tabel bevat alleen korte labels, de
     data-tabel de echte (vaak langere) waarden. We meten daarom de werkelijke
     kolombreedtes van de data-tabel en leggen die op aan de kop-tabel. */
  const bodyTableRef = useRef<HTMLTableElement>(null);
  const [flexColWidths, setFlexColWidths] = useState<number[]>([]);
  const frozenColCount = 2 + (wp === 0 ? 1 : 0) + 1; // meta, #, [project], boor nr

  const measureFlexColWidths = useCallback(() => {
    // Meet over ALLE zichtbare rijen (niet alleen de eerste) en neem per kolom de
    // breedste waarde. Met alleen de eerste rij liep de koptabel uit de pas zodra
    // die rij toevallig een korte/lege waarde had ('—') terwijl andere rijen in
    // diezelfde kolom een langere waarde hadden — de koptabel (vaste breedte)
    // werd dan te smal t.o.v. de databody (auto-breedte over alle rijen), met
    // door elkaar lopende kolomkoppen tot gevolg.
    const bodyRows = bodyTableRef.current?.tBodies[0]?.rows;
    if (!bodyRows || bodyRows.length === 0 || bodyRows[0].cells.length <= frozenColCount) return;
    const colCount = bodyRows[0].cells.length;
    const widths: number[] = new Array(colCount - frozenColCount).fill(0);
    for (let r = 0; r < bodyRows.length; r++) {
      const cells = bodyRows[r].cells;
      if (cells.length !== colCount) continue;
      for (let i = frozenColCount; i < colCount; i++) {
        const w = cells[i].getBoundingClientRect().width;
        if (w > widths[i - frozenColCount]) widths[i - frozenColCount] = w;
      }
    }
    setFlexColWidths(widths);
  }, [frozenColCount]);

  useLayoutEffect(() => {
    measureFlexColWidths();
  }, [measureFlexColWidths, visibleCols.join('|'), rows.length, wp, allVisible]);

  useEffect(() => {
    const el = bodyScrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measureFlexColWidths());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureFlexColWidths]);

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
        .lem-header-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .lem-header-scroll::-webkit-scrollbar { display: none; height: 0; }
        .lem-person-row:hover { background: var(--n-mid); }
        .stat-card.stat-G .stat-num { color: var(--g-fg); }
        .stat-card.stat-A .stat-num { color: var(--r-fg); }
        .stat-card.stat-R .stat-num { color: var(--b-fg); }
      `}</style>
      <div style={{ position: 'sticky', top: HDR_H, zIndex: 15, background: 'var(--bg)', paddingBottom: 2 }}>
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

      {/* Vaste kop-tabel — leeft ín het sticky bovenblok, dus geen aparte verticale
          sticky-berekening meer nodig. Horizontaal scrollen wordt gesynchroniseerd
          met de databcody-tabel eronder. */}
      <div ref={headerScrollRef} onScroll={syncScrollFromHeader} className="lem-header-scroll" style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ marginBottom: 0, tableLayout: flexColWidths.length ? 'fixed' : undefined }}>
          <colgroup>
            <col style={{ width: STICKY_META_W }} />
            <col style={{ width: STICKY_NUM_W }} />
            {wp === 0 && <col style={{ width: STICKY_PROJECT_W }} />}
            <col style={{ width: STICKY_BORING_W }} />
            {visibleCols.map((id, i) => <col key={id} style={flexColWidths[i] ? { width: flexColWidths[i] } : undefined} />)}
            <col style={flexColWidths[visibleCols.length] ? { width: flexColWidths[visibleCols.length] } : undefined} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ ...fixedW(STICKY_META_W), position: 'sticky', left: 0, zIndex: 6, background: stickyGrey, verticalAlign: 'top' }}></th>
              <th style={{ ...fixedW(STICKY_NUM_W), color: 'var(--text-4)', fontWeight: 600, position: 'sticky', left: STICKY_META_W, zIndex: 6, background: stickyGrey, verticalAlign: 'top', padding: 0 }} title="Volgnummer">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '8px 10px' }}><span>#</span></div>
              </th>
              {wp === 0 && (
                <th style={{ ...fixedW(STICKY_PROJECT_W), position: 'sticky', left: stickyProjectLeft, zIndex: 6, background: 'var(--surface2)', verticalAlign: 'top', padding: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', padding: '8px 10px' }}><span>Project</span></div>
                </th>
              )}
              <th style={{ ...fixedW(STICKY_BORING_W), position: 'sticky', left: stickyBoringLeft, zIndex: 6, background: 'var(--surface2)', boxShadow: '2px 0 4px -2px rgba(0,0,0,0.10)', verticalAlign: 'top', padding: 0 }}
                className="sortable" onClick={() => sort('boring_nr')}>
                <div style={{ display: 'flex', alignItems: 'flex-start', padding: '8px 10px' }}><span>Boor nr{srt('boring_nr')}</span></div>
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
                    style={{ position: 'static', verticalAlign: 'top', padding: 0 }}
                    onDragStart={e => onDragStart(e, id)} onDragOver={e => onDragOver(e, id)}
                    onDrop={e => onDrop(e, id)} onDragEnd={onDragEnd}
                    onClick={sortable ? () => sort(col.sortKey!) : undefined}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', padding: '8px 10px', whiteSpace: 'normal', wordBreak: 'normal', overflowWrap: 'break-word', lineHeight: 1.3 }}>
                      <span>{col.label}{sortable ? srt(col.sortKey!) : null}</span>
                    </div>
                  </th>
                );
              })}
              <th style={{ position: 'static', verticalAlign: 'top' }}></th>
            </tr>
            {filtersOpen && (
              <tr>
                <th style={{ ...fixedW(STICKY_META_W), padding: '2px 4px', textAlign: 'center', position: 'sticky', left: 0, zIndex: 6, background: stickyGrey }}>
                  {activeFilters > 0 && (
                    <button className="btn" title="Filters wissen" style={{ fontSize: 10, padding: '1px 5px' }} onClick={() => setColFilters({})}>✕</button>
                  )}
                </th>
                <th style={{ ...fixedW(STICKY_NUM_W), position: 'sticky', left: STICKY_META_W, zIndex: 6, background: stickyGrey }}></th>
                {wp === 0 && (
                  <th style={{ ...fixedW(STICKY_PROJECT_W), padding: '2px 6px', position: 'sticky', left: stickyProjectLeft, zIndex: 6, background: 'var(--surface2)' }}>
                    <input className="inline-edit" style={{ width: '100%', minWidth: 64, fontWeight: 400 }} placeholder="filter…"
                      value={colFilters['project'] ?? ''} onChange={e => setColFilters(f => ({ ...f, project: e.target.value }))} />
                  </th>
                )}
                <th style={{ ...fixedW(STICKY_BORING_W), padding: '2px 6px', position: 'sticky', left: stickyBoringLeft, zIndex: 6, background: 'var(--surface2)', boxShadow: '2px 0 4px -2px rgba(0,0,0,0.10)' }}>
                  <input className="inline-edit" style={{ width: '100%', minWidth: 64, fontWeight: 400 }} placeholder="filter…"
                    value={colFilters['boring_nr'] ?? ''} onChange={e => setColFilters(f => ({ ...f, boring_nr: e.target.value }))} />
                </th>
                {visibleCols.map(id => (
                  <th key={id} style={{ padding: '2px 6px', position: 'static', overflow: 'hidden' }}>
                    <input className="inline-edit" style={{ width: '100%', minWidth: 64, fontWeight: 400 }} placeholder="filter…"
                      value={colFilters[id] ?? ''} onChange={e => setColFilters(f => ({ ...f, [id]: e.target.value }))} />
                  </th>
                ))}
                <th style={{ position: 'static' }}></th>
              </tr>
            )}
          </thead>
        </table>
      </div>
      </div>

      <div className="table-wrap">
        <div className="tbl-scroll" ref={bodyScrollRef} onScroll={syncScrollFromBody}>
          <table className="data-table" ref={bodyTableRef}>
            <colgroup>
              <col style={{ width: STICKY_META_W }} />
              <col style={{ width: STICKY_NUM_W }} />
              {wp === 0 && <col style={{ width: STICKY_PROJECT_W }} />}
              <col style={{ width: STICKY_BORING_W }} />
              {visibleCols.map(id => <col key={id} />)}
              <col />
            </colgroup>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={visibleCols.length + 4 + (wp === 0 ? 1 : 0)}><div className="empty-state"><strong>{intakeMode ? 'Geen boringen in de intake' : 'Geen boringen gevonden'}</strong>{intakeMode ? 'Alles is doorgezet naar het project.' : 'Pas de filters aan.'}</div></td></tr>
              ) : rows.map((d, idx) => {
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
                      <td style={{ ...fixedW(STICKY_META_W), position: 'sticky', left: 0, zIndex: 3, background: stickyGrey }} />
                      <td style={{ ...fixedW(STICKY_NUM_W), textAlign: 'center', fontSize: 11, color: 'var(--text-4)', fontVariantNumeric: 'tabular-nums', position: 'sticky', left: STICKY_META_W, zIndex: 3, background: stickyGrey }}>{idx + 1}</td>
                      {wp === 0 && (
                        <td style={{ ...fixedW(STICKY_PROJECT_W), position: 'sticky', left: stickyProjectLeft, zIndex: 3, background: rowBg, whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: 'var(--text-2)', fontWeight: 600 }}>
                          {PROJECTEN.find(p => p.wp === d.werkpakket_id)?.naam ?? '—'}
                        </td>
                      )}
                      <InlineCell type="text" value={d.boring_nr}
                        tdStyle={{ ...fixedW(STICKY_BORING_W), fontWeight: 600, position: 'sticky', left: stickyBoringLeft, zIndex: 3, background: rowBg, boxShadow: '2px 0 4px -2px rgba(0,0,0,0.10)' }}
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
            <F label="Datum gereed (verwacht)"><DateInput value={form.datum_gereed} onChange={v => setForm(f => ({ ...f, datum_gereed: v }))} /></F>
            <F label="Ter controle uitvoering"><DateInput value={form.ter_controle_uitvoering} onChange={v => setForm(f => ({ ...f, ter_controle_uitvoering: v }))} /></F>
            <F label="Retour ontvangen"><DateInput value={form.retour_uitvoering} onChange={v => setForm(f => ({ ...f, retour_uitvoering: v }))} /></F>
            <F label="Schouw uitgevoerd"><DateInput value={form.schouw_uitgevoerd} onChange={v => setForm(f => ({ ...f, schouw_uitgevoerd: v }))} /></F>
            <F label="Opm. uitvoering verwerkt"><DateInput value={form.opmerkingen_uitvoering} onChange={v => setForm(f => ({ ...f, opmerkingen_uitvoering: v }))} /></F>
            <F label="Planning APD's"><DateInput value={form.planning_apds} onChange={v => setForm(f => ({ ...f, planning_apds: v }))} /></F>
            <F label="HDD Ontwerp"><select className="field-input" value={form.status_ontwerp ?? ''} onChange={e => setForm(f => ({ ...f, status_ontwerp: e.target.value }))}><option value="">—</option>{ONTWERP_STATUSSEN.map(s => <option key={s}>{s}</option>)}</select></F>
            <F label="Ontwerp %"><select className="field-input" value={form.ontwerp_pct ?? ''} onChange={e => setForm(f => ({ ...f, ontwerp_pct: e.target.value ? parseFloat(e.target.value) : undefined }))}>{PCT_OPTS.map(o => <option key={String(o.value)} value={o.value}>{o.label}</option>)}</select></F>
            <F label="Tek %"><select className="field-input" value={form.tek_pct ?? ''} onChange={e => setForm(f => ({ ...f, tek_pct: e.target.value ? parseFloat(e.target.value) : undefined }))}>{PCT_OPTS.map(o => <option key={String(o.value)} value={o.value}>{o.label}</option>)}</select></F>
            <F label="Werkterrein"><select className="field-input" value={form.status_werkterrein ?? ''} onChange={e => setForm(f => ({ ...f, status_werkterrein: e.target.value }))}><option value="">—</option>{STATUSSEN.map(s => <option key={s}>{s}</option>)}</select></F>
            <F label="Berekening"><select className="field-input" value={form.status_berekening ?? ''} onChange={e => setForm(f => ({ ...f, status_berekening: e.target.value }))}><option value="">—</option>{STATUSSEN.map(s => <option key={s}>{s}</option>)}</select></F>
            <div style={{ gridColumn: '1/-1', height: '0.5px', background: 'var(--border)' }} />
            <F label="Proefsleuf nr."><input className="field-input" value={form.proefsleuf_nr ?? ''} onChange={e => setForm(f => ({ ...f, proefsleuf_nr: e.target.value }))} /></F>
            <F label="Sondering nr."><input className="field-input" value={form.sondering_nr ?? ''} onChange={e => setForm(f => ({ ...f, sondering_nr: e.target.value }))} /></F>
            <F label="Sondering aangevraagd"><input className="field-input" value={form.sondering_aangevraagd ?? ''} onChange={e => setForm(f => ({ ...f, sondering_aangevraagd: e.target.value }))} /></F>
            <F label="Sondering retour"><input className="field-input" value={form.sondering_retour ?? ''} onChange={e => setForm(f => ({ ...f, sondering_retour: e.target.value }))} /></F>
            <F label="Bundel configuratie"><input className="field-input" value={form.bundel_configuratie ?? ''} onChange={e => setForm(f => ({ ...f, bundel_configuratie: e.target.value }))} /></F>
            <F label="Vervallen"><label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 6 }}><input type="checkbox" checked={form.vervallen ?? false} onChange={e => setForm(f => ({ ...f, vervallen: e.target.checked }))} style={{ width: 15, height: 15 }} /><span style={{ fontSize: 12 }}>Ja, vervallen</span></label></F>
            <F label="Project gereed"><label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 6 }}><input type="checkbox" checked={form.gereed ?? false} onChange={e => setForm(f => ({ ...f, gereed: e.target.checked }))} style={{ width: 15, height: 15 }} /><span style={{ fontSize: 12 }}>Ja, gereed</span></label></F>
            <F label="Raakvlak" span><textarea className="field-input" rows={2} value={form.raakvlak ?? ''} onChange={e => setForm(f => ({ ...f, raakvlak: e.target.value }))} style={{ resize: 'vertical' }} /></F>
            <F label="Opmerkingen" span><textarea className="field-input" rows={2} value={form.opmerking_extra ?? ''} onChange={e => setForm(f => ({ ...f, opmerking_extra: e.target.value }))} style={{ resize: 'vertical' }} /></F>
          </div>
        </Modal>
      )}

      {remarkEdit && (
        <Modal open onClose={() => setRemarkEdit(null)} maxWidth={480} title="Opmerking bewerken"
          footer={<>
            <button className="btn" onClick={() => setRemarkEdit(null)}>Annuleren</button>
            <button className="btn btn-primary" onClick={() => {
              saveField(remarkEdit.id, { opmerking_extra: remarkEdit.value });
              setRemarkEdit(null);
            }}>Opslaan</button>
          </>}>
          <textarea className="field-input" rows={6} autoFocus value={remarkEdit.value}
            onChange={e => setRemarkEdit(r => r && { ...r, value: e.target.value })}
            style={{ resize: 'vertical', width: '100%' }} />
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
  /* Onderstaande stonden al als bewerkbaar veld in het formulier maar ontbraken hier,
     waardoor wijzigingen wel leken op te slaan maar nooit in Supabase belandden. */
  'case_nr', 'projectfase', 'engineeringsfase', 'aanlevering_compleet', 'ter_controle_uitvoering',
  'retour_uitvoering', 'opmerkingen_uitvoering', 'schouw_uitgevoerd', 'ontwerp_pct',
  'sondering_aangevraagd', 'sondering_retour', 'raakvlak',
  'datum_gereed',
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
