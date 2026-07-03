'use client';

import { useState, useMemo } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { useModuleData } from '@/hooks/useModuleData';
import Modal from '@/components/ui/Modal';

/* ── CSV-helpers + volledige kolommenweergave ───────────────────────────────── */
const KOLOM_VOLGORDE: string[] = [
  'id', 'werkpakket_id', 'boring_nr', 'werkpakket_nr', 'locatie', 'lengte_m', 'diameter_mm', 'diepte_m',
  'type_boring', 'klasse', 'aannemer', 'prioritering', 'status', 'status_ontwerp', 'hdd_tek_pct',
  'status_werkterrein', 'status_berekening', 'apd_verantw', 'planning_apds', 'oplevering_toolgate',
  'proefsleuf_nr', 'sondering_nr', 'bundel_configuratie', 'opmerkingen',
  'startdatum', 'einddatum', 'intake_compleet', 'vervallen', 'created_at',
];
const NUMERIEKE_KOLOMMEN = new Set(['lengte_m', 'hdd_tek_pct', 'diameter_mm', 'diepte_m', 'werkpakket_id']);
const BOOL_KOLOMMEN = new Set(['vervallen', 'intake_compleet', 'engineering_afgerond']);

/* Keuzelijsten voor inline bewerken in de tabel. */
const STATUS_OPTS = ['Niet gestart', 'Gestart', 'Ter controle', 'Afgekeurd', 'Goedgekeurd', 'Vrijgegeven', 'Issue', 'Vertraagd', 'Vervallen'];
const TYPE_OPTS = ['Walk-over', 'Gyro', 'Nanodrill'];
const KLASSE_OPTS = ['9T', '17T', '27T', '50T'];
const NIET_IMPORTEREN = new Set(['id', 'created_at']); // id = matchsleutel, created_at = read-only

function csvCel(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/* Robuuste CSV-parser: detecteert ; of , als scheidingsteken, ondersteunt quotes. */
function parseCSV(text: string): string[][] {
  text = text.replace(/^\ufeff/, '');
  const firstLine = text.split(/\r?\n/)[0] || '';
  const delim = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let cur: string[] = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) { cur.push(field); field = ''; }
    else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

function WideTabel({ cols, rows }: { cols: string[]; rows: Record<string, unknown>[] }) {
  return (
    <div className="table-wrap">
      <div className="tbl-scroll">
        <table>
          <thead>
            <tr>{cols.map(c => <th key={c} style={{ whiteSpace: 'nowrap' }}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={cols.length} style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)' }}>Geen boringen</td></tr>
            ) : rows.map((r, i) => (
              <tr key={(r.id as string) ?? i}>
                {cols.map(c => {
                  const v = r[c];
                  const s = v === null || v === undefined ? '' : String(v);
                  return <td key={c} style={{ whiteSpace: 'nowrap', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-2)' }} title={s}>{s || '—'}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
  const { data, projects, loading, save, remove, reload } = useModuleData<Boring>('boringen', 'boring_nr');

  const [wideMode, setWideMode]   = useState(false);
  const [importing, setImporting] = useState(false);

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
  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: string } | null>(null);
  const [inlineVal, setInlineVal]   = useState('');
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

  /* Alle kolommen die in de data voorkomen (union), in een logische volgorde. */
  const allCols = useMemo(() => {
    const keys = new Set<string>();
    for (const r of data) Object.keys(r as unknown as Record<string, unknown>).forEach(k => keys.add(k));
    const geordend = KOLOM_VOLGORDE.filter(k => keys.has(k));
    const rest = Array.from(keys).filter(k => !KOLOM_VOLGORDE.includes(k)).sort();
    return [...geordend, ...rest];
  }, [data]);

  /* Export: gefilterde rijen × alle kolommen → CSV (;-gescheiden, met BOM voor Excel-NL). */
  const exportCSV = () => {
    const header = allCols.join(';');
    const lines = rows.map(r => allCols.map(c => csvCel((r as unknown as Record<string, unknown>)[c])).join(';'));
    const csv = [header, ...lines].join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boringen_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`${rows.length} boringen geëxporteerd`, 'success');
  };

  /* Import: match op id (of boring_nr + werkpakket_id), werk bestaande boringen bij.
     Lege cellen worden overgeslagen (overschrijven bestaande data niet). */
  const importCSV = async (file: File) => {
    setImporting(true);
    try {
      const table = parseCSV(await file.text());
      if (table.length < 2) { toast('Leeg of ongeldig CSV-bestand', 'error'); return; }
      const header = table[0].map(h => h.trim());
      const idIdx = header.indexOf('id');
      let ok = 0, over = 0, mislukt = 0;
      for (let i = 1; i < table.length; i++) {
        const cells = table[i];
        if (!cells.length || cells.every(c => c.trim() === '')) continue;
        const rij: Record<string, string> = {};
        header.forEach((h, j) => { rij[h] = (cells[j] ?? '').trim(); });

        let doel = idIdx >= 0 && rij['id'] ? data.find(d => d.id === rij['id']) : undefined;
        if (!doel && rij['boring_nr']) {
          doel = data.find(d => d.boring_nr === rij['boring_nr'] && (!rij['werkpakket_id'] || String(d.werkpakket_id) === rij['werkpakket_id']));
        }
        if (!doel) { over++; continue; }

        const patch: Record<string, unknown> = {};
        for (const h of header) {
          if (!h || NIET_IMPORTEREN.has(h)) continue;
          const val = rij[h];
          if (val === '') continue; // leeg → niet overschrijven
          if (NUMERIEKE_KOLOMMEN.has(h)) { const n = Number(val.replace(',', '.')); if (!isNaN(n)) patch[h] = n; }
          else if (BOOL_KOLOMMEN.has(h)) patch[h] = /^(true|ja|1|waar|x)$/i.test(val);
          else patch[h] = val;
        }
        if (Object.keys(patch).length === 0) { over++; continue; }
        try { await save(doel.id, patch as unknown as Partial<Boring>); ok++; } catch { mislukt++; }
      }
      await reload();
      toast(`Import klaar — ${ok} bijgewerkt, ${over} overgeslagen${mislukt ? `, ${mislukt} mislukt` : ''}`, mislukt ? 'error' : 'success');
    } catch (e) {
      toast('Import mislukt: ' + (e as Error).message, 'error');
    } finally {
      setImporting(false);
    }
  };

  const sort = (col: keyof Boring) => {
    if (sortCol === col) setSortDir(d => -d); else { setSortCol(col); setSortDir(1); }
  };
  const srt = (col: keyof Boring) => sortCol === col ? (sortDir > 0 ? ' ↑' : ' ↓') : '';

  /* Inline bewerken van een tabelcel. */
  const startInline = (d: Boring, field: string) => {
    let v: unknown = (d as unknown as Record<string, unknown>)[field];
    if (field === 'planning_apds' && v) v = String(v).slice(0, 10);
    else if (field === 'hdd_tek_pct') v = v == null ? '' : String(Math.round(Number(v) * 100));
    setInlineEdit({ id: d.id, field });
    setInlineVal(v == null ? '' : String(v));
  };
  const saveInline = async (id: string, field: string, raw: string) => {
    setInlineEdit(null);
    let value: unknown = raw.trim();
    if (value === '') value = null;
    else if (field === 'hdd_tek_pct') { const n = Number(raw.replace(',', '.')); value = isNaN(n) ? null : Math.max(0, Math.min(1, n / 100)); }
    else if (NUMERIEKE_KOLOMMEN.has(field)) { const n = Number(raw.replace(',', '.')); value = isNaN(n) ? null : n; }
    try { await save(id, { [field]: value } as unknown as Partial<Boring>); }
    catch (e) { toast((e as Error).message, 'error'); }
  };

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
        <button className="btn" onClick={() => setWideMode(w => !w)} style={{ fontSize: 11 }} title="Toon alle kolommen / alle data">
          {wideMode ? '⊟ Compacte weergave' : '⊞ Alle kolommen'}
        </button>
        <button className="btn" onClick={exportCSV} style={{ fontSize: 11 }} title="Exporteer de zichtbare boringen (alle kolommen) naar CSV">⭳ Export CSV</button>
        <label className="btn" style={{ fontSize: 11, cursor: importing ? 'default' : 'pointer' }} title="Importeer CSV — werkt bestaande boringen bij (match op id of boornummer)">
          {importing ? '… Importeren' : '⭱ Import CSV'}
          <input type="file" accept=".csv,text/csv" disabled={importing} style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) importCSV(f); e.currentTarget.value = ''; }} />
        </label>
        <div style={{ flex: 1 }} />
      </div>

      {/* Tabel — compacte weergave */}
      {!wideMode && (
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
                const isEd = (f: string) => inlineEdit?.id === d.id && inlineEdit.field === f;
                const inp = (field: string, kind: 'text' | 'number' | 'date') => (
                  <input autoFocus type={kind} value={inlineVal}
                    style={{ width: '100%', fontSize: 12, padding: '2px 5px', border: '1px solid var(--accent)', borderRadius: 4, boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--text)' }}
                    onClick={e => e.stopPropagation()}
                    onChange={e => setInlineVal(e.target.value)}
                    onBlur={() => saveInline(d.id, field, inlineVal)}
                    onKeyDown={e => { if (e.key === 'Enter') saveInline(d.id, field, inlineVal); else if (e.key === 'Escape') setInlineEdit(null); }} />
                );
                const sel = (field: string, opts: { v: string; l: string }[]) => (
                  <select autoFocus value={inlineVal}
                    style={{ width: '100%', fontSize: 12, padding: '2px 4px', border: '1px solid var(--accent)', borderRadius: 4, background: 'var(--surface)', color: 'var(--text)' }}
                    onClick={e => e.stopPropagation()}
                    onChange={e => saveInline(d.id, field, e.target.value)}
                    onBlur={() => setInlineEdit(null)}>
                    <option value="">—</option>
                    {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                );
                const statusBadge = (val?: string | null) => {
                  const c = STATUS_COLORS[val ?? ''];
                  return c ? <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>{val}</span>
                    : <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>;
                };
                const statusOpts = STATUS_OPTS.map(s => ({ v: s, l: s }));
                return (
                  <tr key={d.id} style={{ opacity: d.vervallen ? 0.4 : 1 }}>
                    <td style={{ fontWeight: 600, cursor: 'pointer' }} title="Open details"
                      onClick={() => setDetailId(d.id)}>{d.boring_nr}</td>
                    <td className="editable" style={{ color: 'var(--text-3)', fontSize: 11 }} onClick={() => !isEd('werkpakket_nr') && startInline(d, 'werkpakket_nr')}>
                      {isEd('werkpakket_nr') ? inp('werkpakket_nr', 'text') : (d.werkpakket_nr || '—')}</td>
                    <td className="editable" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-2)' }} onClick={() => !isEd('locatie') && startInline(d, 'locatie')}>
                      {isEd('locatie') ? inp('locatie', 'text') : (d.locatie || '—')}</td>
                    <td className="editable" style={{ fontVariantNumeric: 'tabular-nums' }} onClick={() => !isEd('lengte_m') && startInline(d, 'lengte_m')}>
                      {isEd('lengte_m') ? inp('lengte_m', 'number') : (d.lengte_m ?? '—')}</td>
                    <td className="editable" onClick={() => !isEd('type_boring') && startInline(d, 'type_boring')}>
                      {isEd('type_boring') ? sel('type_boring', TYPE_OPTS.map(t => ({ v: t, l: t }))) : (d.type_boring || '—')}</td>
                    <td className="editable" onClick={() => !isEd('klasse') && startInline(d, 'klasse')}>
                      {isEd('klasse') ? sel('klasse', KLASSE_OPTS.map(k => ({ v: k, l: k })))
                        : (d.klasse ? <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'var(--surface3)', border: '0.5px solid var(--border)' }}>{d.klasse}</span> : '—')}</td>
                    <td className="editable" style={{ fontSize: 12, color: 'var(--text-2)' }} onClick={() => !isEd('aannemer') && startInline(d, 'aannemer')}>
                      {isEd('aannemer') ? inp('aannemer', 'text') : (d.aannemer || '—')}</td>
                    <td className="editable" onClick={() => !isEd('status_ontwerp') && startInline(d, 'status_ontwerp')}>
                      {isEd('status_ontwerp') ? sel('status_ontwerp', statusOpts) : statusBadge(d.status_ontwerp)}</td>
                    <td className="editable" onClick={() => !isEd('hdd_tek_pct') && startInline(d, 'hdd_tek_pct')} title="Klik om % aan te passen (0–100)">
                      {isEd('hdd_tek_pct') ? inp('hdd_tek_pct', 'number') : <TekBar pct={d.hdd_tek_pct} />}</td>
                    <td className="editable" onClick={() => !isEd('status_werkterrein') && startInline(d, 'status_werkterrein')}>
                      {isEd('status_werkterrein') ? sel('status_werkterrein', statusOpts) : statusBadge(d.status_werkterrein)}</td>
                    <td className="editable" onClick={() => !isEd('status_berekening') && startInline(d, 'status_berekening')}>
                      {isEd('status_berekening') ? sel('status_berekening', statusOpts) : statusBadge(d.status_berekening)}</td>
                    <td className="editable" style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }} onClick={() => !isEd('planning_apds') && startInline(d, 'planning_apds')}>
                      {isEd('planning_apds') ? inp('planning_apds', 'date')
                        : (d.planning_apds ? new Date(d.planning_apds).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—')}</td>
                    <td className="editable" style={{ fontSize: 11, color: 'var(--text-3)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis' }} onClick={() => !isEd('bundel_configuratie') && startInline(d, 'bundel_configuratie')}>
                      {isEd('bundel_configuratie') ? inp('bundel_configuratie', 'text') : (d.bundel_configuratie || '—')}</td>
                    <td className="editable" style={{ fontSize: 11, color: 'var(--text-3)' }} onClick={() => !isEd('werkpakket_id') && startInline(d, 'werkpakket_id')}>
                      {isEd('werkpakket_id') ? sel('werkpakket_id', projects.map(p => ({ v: String(p.id), l: p.label })))
                        : (projects.find(p => p.id === d.werkpakket_id)?.label ?? '—')}</td>
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
      )}

      {wideMode && <WideTabel cols={allCols} rows={rows as unknown as Record<string, unknown>[]} />}

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
