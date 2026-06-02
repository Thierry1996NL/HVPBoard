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

/* ── Kleurcodering zoals Excel ───────────────────────────────────────────────── */
const SC: Record<string, { bg: string; fg: string }> = {
  'Vrijgegeven':  { bg: '#1A7F3C', fg: '#fff' },
  'Goedgekeurd':  { bg: '#8BC34A', fg: '#fff' },
  'Ter controle': { bg: '#F5C842', fg: '#1A1A1A' },
  'Gestart':      { bg: '#F5A623', fg: '#fff' },
  'Issue':        { bg: '#D70015', fg: '#fff' },
  'Vertraagd':    { bg: '#D70015', fg: '#fff' },
  'Niet gestart': { bg: '#F3F4F6', fg: '#6B7280' },
  'Vervallen':    { bg: '#EBEBEB', fg: '#9CA3AF' },
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

/* ── Pagina ──────────────────────────────────────────────────────────────────── */
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [project, setProject]   = useState<Werkpakket | null>(null);
  const [boringen, setBoringen] = useState<Boring[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filterVervallen, setFilterVervallen] = useState(false);
  const [filterStatus, setFilterStatus]       = useState('');
  const [filterAannemer, setFilterAannemer]   = useState('');
  const [filterWP, setFilterWP]               = useState('');
  const [search, setSearch]                   = useState('');
  const [sortCol, setSortCol]                 = useState<keyof Boring | null>(null);
  const [sortDir, setSortDir]                 = useState(1);
  const [selectedBoring, setSelectedBoring]   = useState<Boring | null>(null);

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

  /* KPI's */
  const kpi = useMemo(() => {
    const active = boringen.filter(b => !b.vervallen);
    return {
      totaal:       active.length,
      vrijgegeven:  active.filter(b => b.status_ontwerp === 'Vrijgegeven').length,
      goedgekeurd:  active.filter(b => b.status_ontwerp === 'Goedgekeurd').length,
      ter_controle: active.filter(b => b.status_ontwerp === 'Ter controle').length,
      gestart:      active.filter(b => b.status_ontwerp === 'Gestart').length,
      issue:        active.filter(b => ['Issue','Vertraagd'].includes(b.status_ontwerp??'')).length,
      niet_gestart: active.filter(b => b.status_ontwerp === 'Niet gestart' || !b.status_ontwerp).length,
      vervallen:    boringen.filter(b => b.vervallen).length,
      totaal_m:     active.reduce((s, b) => s + (b.lengte_m ?? 0), 0),
    };
  }, [boringen]);

  /* Unieke filterwaarden */
  const werkpakketten = useMemo(() => Array.from(new Set(boringen.map(b => b.werkpakket_nr).filter(Boolean) as string[])).sort(), [boringen]);
  const aannemers     = useMemo(() => Array.from(new Set(boringen.map(b => b.aannemer).filter(Boolean) as string[])).sort(), [boringen]);
  const statussen     = useMemo(() => Array.from(new Set(boringen.map(b => b.status_ontwerp).filter(Boolean) as string[])).sort(), [boringen]);

  /* Gefilterde rijen */
  const rows = useMemo(() => {
    let r = boringen.filter(b => {
      if (!filterVervallen && b.vervallen) return false;
      if (filterVervallen && !b.vervallen) return false;
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

  const cd  = project.cel_data as Record<string, string>;
  const naam = cd['2'] ?? project.projectnaam;

  return (
    <div className="page-content">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: '1.25rem' }}>
        <button className="btn" style={{ fontSize: 12, flexShrink: 0, marginTop: 2 }}
          onClick={() => router.push('/projecten')}>← Terug</button>

        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.3px', color: 'var(--text)', margin: 0 }}>
            {naam}
          </h1>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
            {cd['0'] && <Meta label="Code"         value={cd['0']} />}
            {cd['1'] && <Meta label="Casenummer"   value={cd['1']} />}
            {cd['8'] && <Meta label="Projectleider" value={cd['8']} />}
            {cd['fase'] && <Meta label="Fase"      value={cd['fase']} chip />}
          </div>
        </div>
      </div>

      {/* ── KPI balk ────────────────────────────────────────────────────────── */}
      <div className="stats-bar" style={{ marginBottom: '1.25rem' }}>
        <KPICard num={kpi.totaal}       label="Boringen"     />
        <KPICard num={kpi.vrijgegeven}  label="Vrijgegeven"  color="#1A7F3C" />
        <KPICard num={kpi.goedgekeurd}  label="Goedgekeurd"  color="#8BC34A" />
        <KPICard num={kpi.ter_controle} label="Ter controle" color="#D97706" />
        <KPICard num={kpi.gestart}      label="Gestart"      color="#F5A623" />
        <KPICard num={kpi.issue}        label="Issue / Vertr." color="#D70015" />
        <KPICard num={kpi.niet_gestart} label="Niet gestart" color="#9CA3AF" />
        <KPICard num={kpi.vervallen}    label="Vervallen"    color="#D1D5DB" />
        <div className="stat-card" style={{ minWidth: 100 }}>
          <span className="stat-num" style={{ fontSize: 16 }}>{Math.round(kpi.totaal_m).toLocaleString('nl-NL')} m</span>
          <span className="stat-label">Totaal lengte</span>
        </div>
      </div>

      {/* ── Voortgangsbalk totaal ────────────────────────────────────────────── */}
      {kpi.totaal > 0 && (
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-lg)',
          padding: '0.875rem 1.125rem', marginBottom: '0.875rem', boxShadow: 'var(--sh-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>Totale voortgang ontwerp</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
              {kpi.vrijgegeven + kpi.goedgekeurd} / {kpi.totaal} vrijgegeven of goedgekeurd
            </span>
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

      {/* ── Controls ────────────────────────────────────────────────────────── */}
      <div className="controls-bar">
        <div className="search-wrap">
          <span className="search-icon"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></span>
          <input className="search-input" placeholder="Zoeken..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {werkpakketten.length > 1 && (
          <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }}
            value={filterWP} onChange={e => setFilterWP(e.target.value)}>
            <option value="">Alle werkpakketten</option>
            {werkpakketten.map(wp => <option key={wp}>{wp}</option>)}
          </select>
        )}

        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }}
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Alle statussen</option>
          {statussen.map(s => <option key={s}>{s}</option>)}
        </select>

        {aannemers.length > 1 && (
          <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }}
            value={filterAannemer} onChange={e => setFilterAannemer(e.target.value)}>
            <option value="">Alle aannemers</option>
            {aannemers.map(a => <option key={a}>{a}</option>)}
          </select>
        )}

        <button className={`tab${filterVervallen ? ' active' : ''}`}
          onClick={() => setFilterVervallen(v => !v)} style={{ fontSize: 11 }}>
          {filterVervallen ? '✕ Vervallen' : 'Toon vervallen'}
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{rows.length} boringen</span>
      </div>

      {/* ── Tabel ───────────────────────────────────────────────────────────── */}
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
                <th>Bundel</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={13}><div className="empty-state"><strong>Geen boringen</strong></div></td></tr>
              ) : rows.map(b => (
                <tr key={b.id} onClick={() => setSelectedBoring(b)}
                  style={{ cursor: 'pointer', opacity: b.vervallen ? 0.4 : 1,
                    background: selectedBoring?.id === b.id ? 'var(--accent-2)' : undefined }}>
                  <td style={{ fontWeight: 700, color: 'var(--text)' }}>
                    {b.boring_nr}
                    {b.prioritering && <span style={{ marginLeft: 5, fontSize: 9, fontWeight: 700,
                      padding: '1px 5px', borderRadius: 4, background: '#FEF3C7', color: '#92400E' }}>⚑</span>}
                  </td>
                  <td style={{ color: 'var(--text-3)', fontSize: 11 }}>{b.werkpakket_nr || '—'}</td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-2)' }}>{b.locatie || '—'}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{b.lengte_m ?? '—'}</td>
                  <td style={{ fontSize: 11 }}>{b.type_boring || '—'}</td>
                  <td>{b.klasse ? <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'var(--surface3)', border: '0.5px solid var(--border)' }}>{b.klasse}</span> : '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-2)' }}>{b.aannemer || '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{b.apd_verantw || '—'}</td>
                  <td><Pill status={b.status_ontwerp} /></td>
                  <td><TekBar pct={b.hdd_tek_pct} /></td>
                  <td><Pill status={b.status_werkterrein} /></td>
                  <td><Pill status={b.status_berekening} /></td>
                  <td style={{ fontSize: 11, color: 'var(--text-3)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.bundel_configuratie || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail paneel (slide-in rechts) ─────────────────────────────────── */}
      {selectedBoring && (
        <div style={{
          position: 'fixed', top: 'var(--hdr-h)', right: 0, bottom: 0, width: 340,
          background: 'var(--surface)', borderLeft: '0.5px solid var(--border)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.08)', zIndex: 80,
          overflowY: 'auto', padding: '1.25rem',
          animation: 'slideInRight 0.2s cubic-bezier(0.34,1.1,0.64,1)',
        }}>
          <style>{`@keyframes slideInRight { from { transform: translateX(40px); opacity:0 } to { transform: none; opacity:1 } }`}</style>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{selectedBoring.boring_nr}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{naam}</div>
            </div>
            <button className="btn" style={{ padding: '3px 8px', fontSize: 13 }} onClick={() => setSelectedBoring(null)}>✕</button>
          </div>

          <DetailSection title="HDD Gegevens">
            <DRow label="Werkpakket"  value={selectedBoring.werkpakket_nr} />
            <DRow label="Locatie"     value={selectedBoring.locatie} />
            <DRow label="Lengte"      value={selectedBoring.lengte_m != null ? `${selectedBoring.lengte_m} m` : undefined} />
            <DRow label="Type"        value={selectedBoring.type_boring} />
            <DRow label="Klasse"      value={selectedBoring.klasse} />
            <DRow label="Aannemer"    value={selectedBoring.aannemer} />
            <DRow label="APD"         value={selectedBoring.apd_verantw} />
            {selectedBoring.bundel_configuratie && <DRow label="Bundel" value={selectedBoring.bundel_configuratie} />}
          </DetailSection>

          <DetailSection title="Planning">
            <DRow label="Planning APD's" value={selectedBoring.planning_apds
              ? new Date(selectedBoring.planning_apds).toLocaleDateString('nl-NL')
              : undefined} />
          </DetailSection>

          <DetailSection title="Status tekenwerk">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <StatusDetailRow label="HDD Ontwerp"  status={selectedBoring.status_ontwerp} pct={selectedBoring.hdd_tek_pct} />
              <StatusDetailRow label="Werkterrein"  status={selectedBoring.status_werkterrein} />
              <StatusDetailRow label="Berekening"   status={selectedBoring.status_berekening} />
            </div>
          </DetailSection>

          {selectedBoring.opmerkingen && (
            <DetailSection title="Opmerkingen">
              <p style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6, margin: 0,
                background: '#FFFBEB', border: '0.5px solid #FDE68A', borderRadius: 6,
                padding: '0.625rem 0.75rem', whiteSpace: 'pre-wrap' }}>
                {selectedBoring.opmerkingen}
              </p>
            </DetailSection>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Hulpcomponenten ─────────────────────────────────────────────────────────── */
function Meta({ label, value, chip }: { label: string; value: string; chip?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{label}:</span>
      {chip ? (
        <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 4,
          background: 'var(--accent-2)', color: 'var(--accent)', border: '0.5px solid var(--accent)' }}>{value}</span>
      ) : (
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)' }}>{value}</span>
      )}
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

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
        color: 'var(--text-4)', marginBottom: 8, paddingBottom: 6, borderBottom: '0.5px solid var(--border)' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function DRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 4, marginBottom: 4, alignItems: 'start' }}>
      <span style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 500, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function StatusDetailRow({ label, status, pct }: { label: string; status?: string; pct?: number }) {
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
