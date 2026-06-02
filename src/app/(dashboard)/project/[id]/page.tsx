'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/ToastProvider';
import type { Werkpakket } from '@/types';

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
  planning_apds?: string;
  apd_verantw?: string;
  status_ontwerp?: string;
  hdd_tek_pct?: number;
  status_werkterrein?: string;
  status_berekening?: string;
  bundel_configuratie?: string;
  opmerkingen?: string;
  status: string;
  vervallen?: boolean;
}

/* ── Kleuren ─────────────────────────────────────────────────────────────────── */
const SC: Record<string, { bg: string; fg: string }> = {
  'Vrijgegeven':  { bg: '#1A7F3C', fg: '#fff' },
  'Goedgekeurd':  { bg: '#8BC34A', fg: '#fff' },
  'Ter controle': { bg: '#F5C842', fg: '#1A1A1A' },
  'Gestart':      { bg: '#F5A623', fg: '#fff' },
  'Issue':        { bg: '#D70015', fg: '#fff' },
  'Vertraagd':    { bg: '#D70015', fg: '#fff' },
  'Niet gestart': { bg: '#E5E7EB', fg: '#6B7280' },
  'Vervallen':    { bg: '#F3F4F6', fg: '#9CA3AF' },
};

function Pill({ status }: { status?: string }) {
  if (!status) return <span style={{ color: '#D1D5DB', fontSize: 11 }}>—</span>;
  const c = SC[status] ?? { bg: '#F3F4F6', fg: '#6B7280' };
  return (
    <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '2px 9px',
      borderRadius: 20, background: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

function TekBar({ pct }: { pct?: number }) {
  if (pct == null) return <span style={{ color: '#D1D5DB', fontSize: 11 }}>—</span>;
  const p = Math.round(pct * 100);
  const bg = p === 100 ? '#1A7F3C' : p >= 75 ? '#8BC34A' : p >= 50 ? '#F5C842' : p > 0 ? '#F5A623' : '#E5E7EB';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 80 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: '#E5E7EB', overflow: 'hidden' }}>
        <div style={{ width: `${p}%`, height: '100%', background: bg, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, color: bg === '#E5E7EB' ? '#9CA3AF' : bg, minWidth: 30 }}>{p}%</span>
    </div>
  );
}

/* ── Gantt chart ─────────────────────────────────────────────────────────────── */
function GanttChart({ boringen }: { boringen: Boring[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Alleen boringen met een planning datum
  const withDate = boringen.filter(b => !b.vervallen && b.planning_apds);
  const withoutDate = boringen.filter(b => !b.vervallen && !b.planning_apds);

  // Bepaal tijdsvenster
  const dates = withDate.map(b => new Date(b.planning_apds!).getTime());
  if (dates.length === 0) {
    return (
      <div className="empty-state">
        <strong>Geen planningsdatums beschikbaar</strong>
        Voeg planning APD&apos;s datums toe aan de boringen.
      </div>
    );
  }

  const minMs = Math.min(...dates, today.getTime() - 7 * 86400000);
  const maxMs = Math.max(...dates) + 14 * 86400000;
  const spanMs = maxMs - minMs;

  // Schatting duur per boring (o.b.v. lengte)
  function getDurationDays(b: Boring): number {
    const l = b.lengte_m ?? 0;
    if (l > 300) return 42;
    if (l > 150) return 28;
    if (l > 50)  return 21;
    return 14;
  }

  // Maand- én jaar-markeringen
  const months: { label: string; pct: number; isJan: boolean; year: string }[] = [];
  const d = new Date(minMs);
  d.setDate(1);
  while (d.getTime() <= maxMs) {
    const pct = ((d.getTime() - minMs) / spanMs) * 100;
    months.push({
      label: d.toLocaleDateString('nl-NL', { month: 'short' }),
      year:  d.getFullYear().toString(),
      isJan: d.getMonth() === 0,
      pct,
    });
    d.setMonth(d.getMonth() + 1);
  }

  // Vandaag-lijn
  const todayPct = ((today.getTime() - minMs) / spanMs) * 100;

  // Groepeer op werkpakket
  const wpMap = new Map<string, Boring[]>();
  for (const b of withDate) {
    const wp = b.werkpakket_nr ?? '—';
    if (!wpMap.has(wp)) wpMap.set(wp, []);
    wpMap.get(wp)!.push(b);
  }
  const groups = Array.from(wpMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  const ROW_H = 28;
  const LABEL_W = 90;

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 320px)' }}>
      <div style={{ minWidth: 900 }}>

        {/* Maand + Jaar header */}
        <div style={{ marginLeft: LABEL_W, marginBottom: 4, position: 'sticky', top: 0, background: 'var(--surface2)', zIndex: 3 }}>
          {/* Jaar-rij */}
          <div style={{ position: 'relative', height: 18, borderBottom: '0.5px solid var(--border-md)' }}>
            {months.filter(m => m.isJan).map((m, i) => (
              <div key={i} style={{ position: 'absolute', left: `${m.pct}%`,
                fontSize: 10, fontWeight: 700, color: 'var(--text-2)',
                background: 'var(--surface2)', paddingRight: 6, whiteSpace: 'nowrap' }}>
                {m.year}
              </div>
            ))}
            {/* Ook eerste jaar tonen ook al is het geen januari */}
            {months.length > 0 && !months[0].isJan && (
              <div style={{ position: 'absolute', left: '0%',
                fontSize: 10, fontWeight: 700, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                {months[0].year}
              </div>
            )}
          </div>
          {/* Maand-rij */}
          <div style={{ position: 'relative', height: 20, borderBottom: '0.5px solid var(--border)' }}>
            {months.map((m, i) => (
              <div key={i} style={{
                position: 'absolute', left: `${m.pct}%`, transform: 'translateX(-50%)',
                fontSize: 9, fontWeight: m.isJan ? 700 : 500,
                color: m.isJan ? 'var(--text-2)' : 'var(--text-4)',
                textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
                borderLeft: m.isJan ? '1.5px solid var(--border-md)' : undefined,
                paddingLeft: m.isJan ? 4 : 0,
              }}>
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {/* Groepen */}
        {groups.map(([wp, bors]) => (
          <div key={wp}>
            {/* WP label */}
            <div style={{ display: 'flex', alignItems: 'center', height: 22,
              background: 'var(--surface3)', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ width: LABEL_W, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: 'var(--text-3)', paddingLeft: 8, flexShrink: 0 }}>
                {wp}
              </div>
              <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                {/* Rasterlijnen */}
                {months.map((m, i) => (
                  <div key={i} style={{ position: 'absolute', left: `${m.pct}%`, top: 0, bottom: 0,
                    width: m.isJan ? '1.5px' : '0.5px',
                    background: m.isJan ? 'var(--border-md)' : 'var(--border)' }} />
                ))}
              </div>
            </div>

            {/* Boring rijen */}
            {bors.sort((a, b) => a.boring_nr.localeCompare(b.boring_nr)).map(b => {
              const deadlineMs = new Date(b.planning_apds!).getTime();
              const durMs      = getDurationDays(b) * 86400000;
              const startMs    = deadlineMs - durMs;
              const startPct   = Math.max(0, ((startMs - minMs) / spanMs) * 100);
              const endPct     = Math.min(100, ((deadlineMs - minMs) / spanMs) * 100);
              const widthPct   = Math.max(0.5, endPct - startPct);
              const c          = SC[b.status_ontwerp ?? ''] ?? SC['Niet gestart'];
              const pct        = b.hdd_tek_pct != null ? Math.round(b.hdd_tek_pct * 100) : 0;
              const isOverdue  = deadlineMs < today.getTime() && pct < 100;
              const wekenRest  = Math.round((deadlineMs - today.getTime()) / (1000*60*60*24*7));

              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', height: ROW_H,
                  borderBottom: '0.5px solid var(--border)', opacity: b.vervallen ? 0.35 : 1 }}>

                  {/* Label */}
                  <div style={{ width: LABEL_W, flexShrink: 0, paddingLeft: 8, paddingRight: 4 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: isOverdue ? '#D70015' : 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.boring_nr}
                    </div>
                    <div style={{ fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: isOverdue ? '#D70015' : wekenRest <= 4 ? '#92400E' : 'var(--text-4)',
                      fontWeight: isOverdue || wekenRest <= 4 ? 600 : 400 }}>
                      {isOverdue ? `${Math.abs(wekenRest)}w te laat ⚠` : `${wekenRest}w`}
                    </div>
                  </div>

                  {/* Tijdlijn */}
                  <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                    {/* Rasterlijnen */}
                    {months.map((m, i) => (
                      <div key={i} style={{ position: 'absolute', left: `${m.pct}%`, top: 0, bottom: 0,
                        width: m.isJan ? '1.5px' : '0.5px',
                        background: m.isJan ? 'var(--border-md)' : 'var(--border)',
                        opacity: m.isJan ? 0.8 : 0.4 }} />
                    ))}

                    {/* Vandaag-lijn */}
                    {todayPct >= 0 && todayPct <= 100 && (
                      <div style={{ position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0,
                        width: 1.5, background: '#3D6B9E', opacity: 0.7, zIndex: 2 }} />
                    )}

                    {/* Boring balk */}
                    <div style={{
                      position: 'absolute',
                      left: `${startPct}%`,
                      width: `${widthPct}%`,
                      top: '20%', height: '60%',
                      borderRadius: 4,
                      background: c.bg,
                      overflow: 'hidden',
                      border: isOverdue ? '1.5px solid #D70015' : `0.5px solid ${c.bg}`,
                      display: 'flex', alignItems: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      zIndex: 1,
                    }}>
                      {/* Voortgang fill */}
                      {pct > 0 && pct < 100 && (
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0,
                          width: `${pct}%`, background: 'rgba(0,0,0,0.15)' }} />
                      )}
                      {/* Label */}
                      {widthPct > 4 && (
                        <span style={{ fontSize: 9, fontWeight: 600, color: c.fg, paddingLeft: 5,
                          whiteSpace: 'nowrap', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
                          {pct}%
                        </span>
                      )}
                    </div>

                    {/* Deadline marker */}
                    <div style={{
                      position: 'absolute',
                      left: `calc(${endPct}% - 3px)`,   // deadline = planning_apds
                      top: '15%', height: '70%',
                      width: 6, borderRadius: 2,
                      background: isOverdue ? '#D70015' : '#1E2B3C',
                      zIndex: 3,
                    }} title={`Deadline: ${new Date(b.planning_apds!).toLocaleDateString('nl-NL')}`} />
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Boringen zonder datum */}
        {withoutDate.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', height: 22,
              background: 'var(--surface3)', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ width: LABEL_W, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: 'var(--text-4)', paddingLeft: 8 }}>Geen datum</div>
              <div style={{ flex: 1 }} />
            </div>
            {withoutDate.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', height: ROW_H,
                borderBottom: '0.5px solid var(--border)', opacity: 0.5 }}>
                <div style={{ width: LABEL_W, paddingLeft: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)' }}>{b.boring_nr}</div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-4)', paddingLeft: 8 }}>Nog geen planningsdatum</div>
              </div>
            ))}
          </div>
        )}

        {/* Legenda */}
        <div style={{ display: 'flex', gap: 16, padding: '0.875rem 0', flexWrap: 'wrap',
          borderTop: '0.5px solid var(--border)', marginTop: 8 }}>
          {Object.entries(SC).filter(([k]) => k !== 'Vervallen').map(([label, c]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 12, height: 10, borderRadius: 2, background: c.bg }} />
              <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 2, height: 12, background: '#3D6B9E', borderRadius: 1 }} />
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Vandaag</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 10, background: '#1E2B3C', borderRadius: 1 }} />
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Deadline</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Hoofd-pagina ────────────────────────────────────────────────────────────── */
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const toast   = useToast();

  const [project,  setProject]  = useState<Werkpakket | null>(null);
  const [boringen, setBoringen] = useState<Boring[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [activeTab, setActiveTab] = useState<'overzicht' | 'planning'>('overzicht');

  const [filterVervallen, setFilterVervallen] = useState(false);
  const [filterStatus,    setFilterStatus]    = useState('');
  const [filterAannemer,  setFilterAannemer]  = useState('');
  const [filterWP,        setFilterWP]        = useState('');
  const [search,          setSearch]          = useState('');
  const [sortCol,  setSortCol]  = useState<keyof Boring | null>(null);
  const [sortDir,  setSortDir]  = useState(1);
  const [selectedBoring, setSelectedBoring] = useState<Boring | null>(null);

  const rowIdx = parseInt(id);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data: wp }, { data: bor }] = await Promise.all([
      supabase.from('werkpakketten').select('*').eq('row_idx', rowIdx).single(),
      supabase.from('boringen').select('*').eq('werkpakket_id', rowIdx).order('boring_nr'),
    ]);
    setProject(wp as Werkpakket | null);
    setBoringen((bor ?? []) as Boring[]);
    setLoading(false);
  }, [rowIdx]);

  useEffect(() => { load(); }, [load]);

  const kpi = useMemo(() => {
    const a = boringen.filter(b => !b.vervallen);
    return {
      totaal:       a.length,
      vrijgegeven:  a.filter(b => b.status_ontwerp === 'Vrijgegeven').length,
      goedgekeurd:  a.filter(b => b.status_ontwerp === 'Goedgekeurd').length,
      ter_controle: a.filter(b => b.status_ontwerp === 'Ter controle').length,
      gestart:      a.filter(b => b.status_ontwerp === 'Gestart').length,
      issue:        a.filter(b => ['Issue','Vertraagd'].includes(b.status_ontwerp??'')).length,
      niet_gestart: a.filter(b => !b.status_ontwerp || b.status_ontwerp === 'Niet gestart').length,
      vervallen:    boringen.filter(b => b.vervallen).length,
      totaal_m:     a.reduce((s, b) => s + (b.lengte_m ?? 0), 0),
    };
  }, [boringen]);

  const werkpakketten = useMemo(() => Array.from(new Set(boringen.map(b => b.werkpakket_nr).filter(Boolean) as string[])).sort(), [boringen]);
  const aannemers     = useMemo(() => Array.from(new Set(boringen.map(b => b.aannemer).filter(Boolean) as string[])).sort(), [boringen]);
  const statussen     = useMemo(() => Array.from(new Set(boringen.map(b => b.status_ontwerp).filter(Boolean) as string[])).sort(), [boringen]);

  const rows = useMemo(() => {
    let r = boringen.filter(b => {
      if (!filterVervallen && b.vervallen) return false;
      if (filterVervallen  && !b.vervallen) return false;
      if (filterStatus   && b.status_ontwerp !== filterStatus) return false;
      if (filterAannemer && b.aannemer !== filterAannemer) return false;
      if (filterWP       && b.werkpakket_nr !== filterWP) return false;
      if (search) {
        const q = search.toLowerCase();
        return [b.boring_nr, b.locatie, b.aannemer, b.bundel_configuratie]
          .some(v => (v ?? '').toLowerCase().includes(q));
      }
      return true;
    });
    if (sortCol) r = [...r].sort((a, b) => {
      const av = String(a[sortCol] ?? ''), bv = String(b[sortCol] ?? '');
      return av < bv ? -sortDir : av > bv ? sortDir : 0;
    });
    return r;
  }, [boringen, filterVervallen, filterStatus, filterAannemer, filterWP, search, sortCol, sortDir]);

  const sort = (col: keyof Boring) => {
    if (sortCol === col) setSortDir(d => -d); else { setSortCol(col); setSortDir(1); }
  };
  const srt = (c: keyof Boring) => sortCol === c ? (sortDir > 0 ? ' ↑' : ' ↓') : '';

  if (loading) return <div className="page-content"><div className="loading-bar" /></div>;
  if (!project) return <div className="page-content"><div className="empty-state"><strong>Project niet gevonden</strong></div></div>;

  const cd   = project.cel_data as Record<string, string>;
  const naam = cd['2'] ?? project.projectnaam;

  return (
    <div className="page-content" style={{ paddingRight: selectedBoring ? 356 : undefined, transition: 'padding-right 0.2s' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: '1rem' }}>
        <button className="btn" style={{ fontSize: 12, flexShrink: 0, marginTop: 2 }} onClick={() => router.push('/projecten')}>← Terug</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.3px', margin: 0 }}>{naam}</h1>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
            {cd['0'] && <Meta label="Code"          value={cd['0']} />}
            {cd['1'] && <Meta label="Casenummer"    value={cd['1']} />}
            {cd['8'] && <Meta label="Projectleider" value={cd['8']} />}
            {cd['fase'] && <Meta label="Fase"       value={cd['fase']} chip />}
          </div>
        </div>
      </div>

      {/* KPI balk */}
      <div className="stats-bar" style={{ marginBottom: '1rem' }}>
        <KPICard num={kpi.totaal}       label="Boringen" />
        <KPICard num={kpi.vrijgegeven}  label="Vrijgegeven"   color="#1A7F3C" />
        <KPICard num={kpi.goedgekeurd}  label="Goedgekeurd"   color="#8BC34A" />
        <KPICard num={kpi.ter_controle} label="Ter controle"  color="#D97706" />
        <KPICard num={kpi.gestart}      label="Gestart"       color="#F5A623" />
        <KPICard num={kpi.issue}        label="Issue / Vertr." color="#D70015" />
        <KPICard num={kpi.niet_gestart} label="Niet gestart"  color="#9CA3AF" />
        <KPICard num={kpi.vervallen}    label="Vervallen"     color="#D1D5DB" />
        <div className="stat-card">
          <span className="stat-num" style={{ fontSize: 16 }}>{Math.round(kpi.totaal_m).toLocaleString('nl-NL')} m</span>
          <span className="stat-label">Totaal lengte</span>
        </div>
      </div>

      {/* Voortgangsbalk */}
      {kpi.totaal > 0 && (
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-lg)',
          padding: '0.875rem 1.125rem', marginBottom: '0.875rem', boxShadow: 'var(--sh-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>Totale voortgang ontwerp</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{kpi.vrijgegeven + kpi.goedgekeurd} / {kpi.totaal} vrijgegeven of goedgekeurd</span>
          </div>
          <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', gap: 1 }}>
            {[
              { count: kpi.vrijgegeven,  color: '#1A7F3C' },
              { count: kpi.goedgekeurd,  color: '#8BC34A' },
              { count: kpi.ter_controle, color: '#F5C842' },
              { count: kpi.gestart,      color: '#F5A623' },
              { count: kpi.issue,        color: '#D70015' },
              { count: kpi.niet_gestart, color: '#E5E7EB' },
            ].filter(s => s.count > 0).map((s, i) => (
              <div key={i} style={{ flex: s.count, background: s.color, minWidth: 2 }} />
            ))}
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="controls-bar" style={{ marginBottom: '0.75rem' }}>
        <button className={`tab${activeTab === 'overzicht' ? ' active' : ''}`} onClick={() => setActiveTab('overzicht')}>
          ⊞ Overzicht
        </button>
        <button className={`tab${activeTab === 'planning' ? ' active' : ''}`} onClick={() => setActiveTab('planning')}>
          📅 Gantt Planning
        </button>

        {activeTab === 'overzicht' && <>
          <div style={{ width: '0.5px', height: 20, background: 'var(--border)', margin: '0 4px' }} />
          <div className="search-wrap">
            <span className="search-icon"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></span>
            <input className="search-input" placeholder="Zoeken..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {werkpakketten.length > 1 && (
            <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }} value={filterWP} onChange={e => setFilterWP(e.target.value)}>
              <option value="">Alle werkpakketten</option>
              {werkpakketten.map(wp => <option key={wp}>{wp}</option>)}
            </select>
          )}
          <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Alle statussen</option>
            {statussen.map(s => <option key={s}>{s}</option>)}
          </select>
          {aannemers.length > 1 && (
            <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }} value={filterAannemer} onChange={e => setFilterAannemer(e.target.value)}>
              <option value="">Alle aannemers</option>
              {aannemers.map(a => <option key={a}>{a}</option>)}
            </select>
          )}
          <button className={`tab${filterVervallen ? ' active' : ''}`} onClick={() => setFilterVervallen(v => !v)} style={{ fontSize: 11 }}>
            {filterVervallen ? '✕ Vervallen' : 'Toon vervallen'}
          </button>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{rows.length} boringen</span>
        </>}
      </div>

      {/* ── Overzicht tabel ──────────────────────────────────────────────────── */}
      {activeTab === 'overzicht' && (
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
                  <th className="sortable" onClick={() => sort('apd_verantw')}>APD{srt('apd_verantw')}</th>
                  <th className="sortable" onClick={() => sort('status_ontwerp')}>HDD Ontwerp{srt('status_ontwerp')}</th>
                  <th>Tek %</th>
                  <th className="sortable" onClick={() => sort('status_werkterrein')}>Werkterrein{srt('status_werkterrein')}</th>
                  <th className="sortable" onClick={() => sort('status_berekening')}>Berekening{srt('status_berekening')}</th>
                  <th>Weken</th>
                  <th>Bundel</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={14}><div className="empty-state"><strong>Geen boringen</strong></div></td></tr>
                ) : rows.map(b => {
                  const c = SC[b.status_ontwerp ?? ''];
                  return (
                    <tr key={b.id} onClick={() => setSelectedBoring(selectedBoring?.id === b.id ? null : b)}
                      style={{ cursor: 'pointer', opacity: b.vervallen ? 0.4 : 1,
                        background: selectedBoring?.id === b.id ? 'var(--accent-2)' : undefined }}>
                      <td style={{ fontWeight: 700 }}>
                        {b.boring_nr}
                        {b.prioritering && <span style={{ marginLeft: 5, fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: '#FEF3C7', color: '#92400E' }}>⚑</span>}
                      </td>
                      <td style={{ color: 'var(--text-3)', fontSize: 11 }}>{b.werkpakket_nr || '—'}</td>
                      <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-2)' }}>{b.locatie || '—'}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{b.lengte_m ?? '—'}</td>
                      <td style={{ fontSize: 11 }}>{b.type_boring || '—'}</td>
                      <td>{b.klasse ? <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'var(--surface3)', border: '0.5px solid var(--border)' }}>{b.klasse}</span> : '—'}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-2)' }}>{b.aannemer || '—'}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{b.apd_verantw || '—'}</td>
                      <td>{c ? <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>{b.status_ontwerp}</span> : <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>}</td>
                      <td><TekBar pct={b.hdd_tek_pct} /></td>
                      <td><Pill status={b.status_werkterrein} /></td>
                      <td><Pill status={b.status_berekening} /></td>
                      <td>{b.planning_apds ? (() => {
                        const wk = Math.round((new Date(b.planning_apds).getTime() - Date.now()) / (1000*60*60*24*7));
                        const over = wk < 0; const warn = wk >= 0 && wk <= 4;
                        return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap',
                          background: over ? '#FEE2E2' : warn ? '#FEF3C7' : '#D1FAE5',
                          color: over ? '#991B1B' : warn ? '#92400E' : '#065F46',
                          border: `0.5px solid ${over ? '#FECACA' : warn ? '#FDE68A' : '#A7F3D0'}` }}>
                          {over ? `${Math.abs(wk)}w te laat` : `${wk}w`}
                        </span>;
                      })() : <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-3)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.bundel_configuratie || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Gantt planning ───────────────────────────────────────────────────── */}
      {activeTab === 'planning' && (
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-lg)',
          padding: '1rem 1.125rem', boxShadow: 'var(--sh-sm)' }}>
          <GanttChart boringen={boringen} />
        </div>
      )}

      {/* ── Detail paneel ────────────────────────────────────────────────────── */}
      {selectedBoring && activeTab === 'overzicht' && (
        <div style={{ position: 'fixed', top: 'var(--hdr-h)', right: 0, bottom: 0, width: 340,
          background: 'var(--surface)', borderLeft: '0.5px solid var(--border)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.08)', zIndex: 80, overflowY: 'auto', padding: '1.25rem',
          animation: 'slideInRight 0.2s cubic-bezier(0.34,1.1,0.64,1)' }}>
          <style>{`@keyframes slideInRight { from { transform: translateX(40px); opacity:0 } to { transform: none; opacity:1 } }`}</style>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedBoring.boring_nr}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{naam}</div>
            </div>
            <button className="btn" style={{ padding: '3px 8px' }} onClick={() => setSelectedBoring(null)}>✕</button>
          </div>

          <DS title="HDD Gegevens">
            <DR label="Werkpakket"  value={selectedBoring.werkpakket_nr} />
            <DR label="Locatie"     value={selectedBoring.locatie} />
            <DR label="Lengte"      value={selectedBoring.lengte_m != null ? `${selectedBoring.lengte_m} m` : undefined} />
            <DR label="Type"        value={selectedBoring.type_boring} />
            <DR label="Klasse"      value={selectedBoring.klasse} />
            <DR label="Aannemer"    value={selectedBoring.aannemer} />
            <DR label="APD"         value={selectedBoring.apd_verantw} />
            {selectedBoring.bundel_configuratie && <DR label="Bundel" value={selectedBoring.bundel_configuratie} />}
          </DS>
          <DS title="Planning">
            <DR label="Planning APD's" value={selectedBoring.planning_apds ? new Date(selectedBoring.planning_apds).toLocaleDateString('nl-NL') : undefined} />
          </DS>
          <DS title="Status tekenwerk">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SDR label="HDD Ontwerp"  status={selectedBoring.status_ontwerp} pct={selectedBoring.hdd_tek_pct} />
              <SDR label="Werkterrein"  status={selectedBoring.status_werkterrein} />
              <SDR label="Berekening"   status={selectedBoring.status_berekening} />
            </div>
          </DS>
          {selectedBoring.opmerkingen && (
            <DS title="Opmerkingen">
              <p style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6, margin: 0,
                background: '#FFFBEB', border: '0.5px solid #FDE68A', borderRadius: 6,
                padding: '0.625rem 0.75rem', whiteSpace: 'pre-wrap' }}>
                {selectedBoring.opmerkingen}
              </p>
            </DS>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Kleine hulpcomponenten ──────────────────────────────────────────────────── */
function Meta({ label, value, chip }: { label: string; value: string; chip?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{label}:</span>
      {chip ? (
        <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 4,
          background: 'var(--accent-2)', color: 'var(--accent)', border: '0.5px solid var(--accent)' }}>{value}</span>
      ) : <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)' }}>{value}</span>}
    </div>
  );
}
function KPICard({ num, label, color }: { num: number; label: string; color?: string }) {
  return (
    <div className="stat-card">
      <span className="stat-num" style={{ color: color ?? 'var(--text)', fontSize: 18 }}>{num}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
function DS({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
        color: 'var(--text-4)', marginBottom: 8, paddingBottom: 6, borderBottom: '0.5px solid var(--border)' }}>{title}</div>
      {children}
    </div>
  );
}
function DR({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 4, marginBottom: 4, alignItems: 'start' }}>
      <span style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}
function SDR({ label, status, pct }: { label: string; status?: string; pct?: number }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-4)', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Pill status={status} />
        {pct != null && <TekBar pct={pct} />}
      </div>
    </div>
  );
}
