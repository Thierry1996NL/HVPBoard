'use client';

import { useState, useMemo, useEffect, Fragment } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { useTableData } from '@/hooks/useTableData';
import Modal from '@/components/ui/Modal';
import {
  InlineCell, Check, DateInput, toOpts, statusPill, fmtDate, type InlineOpt,
} from '@/components/InlineTable';

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

/* ── Kolommen (versleepbaar) ──────────────────────────────────────────────── */
type ColId =
  | 'boring_nr' | 'werkpakket_nr' | 'locatie' | 'lengte_m' | 'type_boring' | 'aannemer' | 'klasse'
  | 'prioritering' | 'oplevering_toolgate' | 'projectfase' | 'engineeringsfase'
  | 'aanlevering_compleet' | 'ter_controle_uitvoering' | 'retour_uitvoering' | 'schouw_uitgevoerd'
  | 'opmerkingen_uitvoering' | 'planning_apds' | 'ontwerp_pct' | 'tek_pct' | 'status_werkterrein'
  | 'status_berekening' | 'sondering_nr' | 'sondering_aangevraagd' | 'sondering_retour'
  | 'bundel_configuratie' | 'raakvlak' | 'opmerking_extra' | 'case_nr';

const DEFAULT_COL_ORDER: ColId[] = [
  'boring_nr', 'werkpakket_nr', 'locatie', 'lengte_m', 'type_boring', 'aannemer', 'klasse',
  'prioritering', 'oplevering_toolgate', 'projectfase', 'engineeringsfase',
  'aanlevering_compleet', 'ter_controle_uitvoering', 'retour_uitvoering', 'schouw_uitgevoerd',
  'opmerkingen_uitvoering', 'planning_apds', 'ontwerp_pct', 'tek_pct', 'status_werkterrein',
  'status_berekening', 'sondering_nr', 'sondering_aangevraagd', 'sondering_retour',
  'bundel_configuratie', 'raakvlak', 'opmerking_extra', 'case_nr',
];
const COL_ORDER_KEY = 'hvp_lemmer_colorder_v1';

export default function LemmerPage() {
  const toast = useToast();
  const { data, loading, save, remove } = useTableData<LemmerBoring>('lemmer');

  const [search, setSearch]   = useState('');
  const [kpi, setKpi]         = useState<string>('actief');
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
    aanlevering_compleet: dateCol('Aanlevering compleet', 'aanlevering_compleet'),
    ter_controle_uitvoering: dateCol('Ter controle uitvoering', 'ter_controle_uitvoering'),
    retour_uitvoering: dateCol('Retour ontvangen', 'retour_uitvoering'),
    schouw_uitgevoerd: dateCol('Schouw uitgevoerd', 'schouw_uitgevoerd'),
    opmerkingen_uitvoering: dateCol('Opm. uitvoering verwerkt', 'opmerkingen_uitvoering'),
    planning_apds: dateCol("Planning APD's", 'planning_apds'),
    ontwerp_pct: pctCol('Ontwerp %', 'ontwerp_pct'),
    tek_pct: pctCol('Tek %', 'tek_pct'),
    status_werkterrein: statusCol('Werkterrein', 'status_werkterrein'),
    status_berekening: statusCol('Berekening', 'status_berekening'),
    sondering_nr: textCol('Sondering nr.', 'sondering_nr'),
    sondering_aangevraagd: textCol('Sondering aangevraagd', 'sondering_aangevraagd'),
    sondering_retour: textCol('Sondering retour', 'sondering_retour'),
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
                <tr><td colSpan={columnOrder.length + 1}><div className="empty-state"><strong>Geen boringen gevonden</strong>Pas de filters aan.</div></td></tr>
              ) : rows.map(d => (
                <tr key={d.id} style={{ opacity: d.vervallen ? 0.45 : 1 }}>
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
