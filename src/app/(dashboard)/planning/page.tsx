'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

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
  apd_verantw?: string;
  planning_apds?: string;
  status_ontwerp?: string;
  hdd_tek_pct?: number;
  prioritering?: string;
  vervallen?: boolean;
}
interface Project { row_idx: number; projectnaam: string; }

/* ── Kleuren ─────────────────────────────────────────────────────────────────── */
const SC: Record<string, { bg: string; fg: string }> = {
  'Vrijgegeven':  { bg: '#1A7F3C', fg: '#fff' },
  'Goedgekeurd':  { bg: '#8BC34A', fg: '#fff' },
  'Ter controle': { bg: '#F5C842', fg: '#1A1A1A' },
  'Gestart':      { bg: '#F5A623', fg: '#fff' },
  'Issue':        { bg: '#D70015', fg: '#fff' },
  'Vertraagd':    { bg: '#D70015', fg: '#fff' },
  'Niet gestart': { bg: '#E5E7EB', fg: '#6B7280' },
};
const PROJECT_COLORS = ['#3D6B9E','#1A7F3C','#D97706','#9C27B0','#D70015','#0288D1','#795548'];

function getBarColor(b: Boring, isOverdue: boolean): string {
  if (isOverdue && !['Vrijgegeven','Goedgekeurd'].includes(b.status_ontwerp ?? '')) return '#D70015';
  return SC[b.status_ontwerp ?? 'Niet gestart']?.bg ?? '#E5E7EB';
}

/* ── Gantt component ─────────────────────────────────────────────────────────── */
function GanttChart({ boringen, projecten, projectColors, groupByProject }:
  { boringen: Boring[]; projecten: Project[]; projectColors: Map<number, string>; groupByProject: boolean }) {

  const today = new Date(); today.setHours(0,0,0,0);
  const nu    = today.getTime();

  const withDate    = boringen.filter(b => b.planning_apds);
  const withoutDate = boringen.filter(b => !b.planning_apds);

  if (withDate.length === 0) return (
    <div className="empty-state"><strong>Geen planningsdatums beschikbaar</strong>Voeg planning APD datums toe aan de boringen.</div>
  );

  const dates  = withDate.map(b => new Date(b.planning_apds!).getTime());
  const minMs  = Math.min(...dates, nu - 14*86400000);
  const maxMs  = Math.max(...dates) + 21*86400000;
  const spanMs = maxMs - minMs;

  function dur(b: Boring): number {
    const l = b.lengte_m ?? 0;
    if (l > 300) return 42; if (l > 150) return 28; if (l > 50) return 21; return 14;
  }

  // Maand + jaar markeringen
  const months: { label: string; year: string; isJan: boolean; pct: number }[] = [];
  const d = new Date(minMs); d.setDate(1);
  while (d.getTime() <= maxMs) {
    months.push({
      label: d.toLocaleDateString('nl-NL', { month: 'short' }),
      year:  d.getFullYear().toString(),
      isJan: d.getMonth() === 0,
      pct:   ((d.getTime() - minMs) / spanMs) * 100,
    });
    d.setMonth(d.getMonth() + 1);
  }

  const todayPct = ((nu - minMs) / spanMs) * 100;
  const ROW_H = 26;
  const LABEL_W = 200;

  // Groepeer
  const projectNaam = (id: number) => projecten.find(p => p.row_idx === id)?.projectnaam ?? `Project ${id}`;

  type Group = { label: string; color: string; rows: Boring[] };
  const groups: Group[] = groupByProject
    ? Array.from(new Map(withDate.map(b => [b.werkpakket_id, b])).values())
        .map(b => b.werkpakket_id)
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort()
        .map((pid, i) => ({
          label: projectNaam(pid),
          color: projectColors.get(pid) ?? PROJECT_COLORS[i % PROJECT_COLORS.length],
          rows: withDate.filter(b => b.werkpakket_id === pid)
                  .sort((a, b) => a.boring_nr.localeCompare(b.boring_nr)),
        }))
    : [{ label: 'Alle boringen', color: '#3D6B9E',
         rows: withDate.sort((a, b) => a.boring_nr.localeCompare(b.boring_nr)) }];

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)', position: 'relative' }}>
      <div style={{ minWidth: 1000 }}>

        {/* ── Header: jaar + maand ─────────────────────────────────────────── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface2)' }}>
          <div style={{ marginLeft: LABEL_W }}>
            {/* Jaar */}
            <div style={{ position: 'relative', height: 20, borderBottom: '0.5px solid var(--border-md)' }}>
              {months.filter(m => m.isJan).map((m, i) => (
                <div key={i} style={{ position: 'absolute', left: `${m.pct}%`,
                  fontSize: 11, fontWeight: 700, color: 'var(--text-2)', paddingLeft: 4 }}>{m.year}</div>
              ))}
              {months.length > 0 && !months[0].isJan && (
                <div style={{ position: 'absolute', left: 0, fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>{months[0].year}</div>
              )}
            </div>
            {/* Maanden */}
            <div style={{ position: 'relative', height: 22, borderBottom: '0.5px solid var(--border)' }}>
              {months.map((m, i) => (
                <div key={i} style={{ position: 'absolute', left: `${m.pct}%`, transform: 'translateX(-50%)',
                  fontSize: 9, fontWeight: m.isJan ? 700 : 400, color: m.isJan ? 'var(--text-2)' : 'var(--text-4)',
                  textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                  {m.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Groepen ──────────────────────────────────────────────────────── */}
        {groups.map((group, gi) => (
          <div key={gi}>
            {/* Groep-header */}
            <div style={{ display: 'flex', alignItems: 'center', height: 24,
              background: 'var(--surface3)', borderBottom: '0.5px solid var(--border)',
              borderLeft: `3px solid ${group.color}`, position: 'sticky', top: 62, zIndex: 5 }}>
              <div style={{ width: LABEL_W, fontSize: 11, fontWeight: 700, color: 'var(--text)',
                paddingLeft: 8, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span>{group.label}</span>
                <span style={{ fontSize: 9, color: 'var(--text-4)', fontWeight: 400 }}>{group.rows.length} boringen</span>
              </div>
              <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                {months.map((m, i) => (
                  <div key={i} style={{ position: 'absolute', left: `${m.pct}%`, top: 0, bottom: 0,
                    width: m.isJan ? '1.5px' : '0.5px', background: m.isJan ? 'var(--border-md)' : 'var(--border)' }} />
                ))}
              </div>
            </div>

            {/* Boring rijen */}
            {group.rows.map(b => {
              const deadlineMs = new Date(b.planning_apds!).getTime();
              const durMs      = dur(b) * 86400000;
              const startMs    = deadlineMs - durMs;
              const startPct   = Math.max(0, ((startMs - minMs) / spanMs) * 100);
              const endPct     = Math.min(100, ((deadlineMs - minMs) / spanMs) * 100);
              const widthPct   = Math.max(0.4, endPct - startPct);
              const pct        = b.hdd_tek_pct != null ? Math.round(b.hdd_tek_pct * 100) : 0;
              const isOverdue  = deadlineMs < nu && pct < 100;
              const wk         = Math.round((deadlineMs - nu) / (1000*60*60*24*7));
              const barColor   = getBarColor(b, isOverdue);
              const isDone     = ['Vrijgegeven','Goedgekeurd'].includes(b.status_ontwerp ?? '');
              const projColor  = projectColors.get(b.werkpakket_id) ?? group.color;

              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', height: ROW_H,
                  borderBottom: '0.5px solid var(--border)', opacity: b.vervallen ? 0.3 : 1 }}>

                  {/* Label */}
                  <div style={{ width: LABEL_W, flexShrink: 0, display: 'flex', alignItems: 'center',
                    paddingLeft: groupByProject ? 16 : 8, paddingRight: 8, gap: 6, overflow: 'hidden' }}>
                    {!groupByProject && (
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: projColor, flexShrink: 0 }} />
                    )}
                    <div style={{ overflow: 'hidden', minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: isOverdue ? '#D70015' : 'var(--text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.boring_nr}{b.prioritering && ' ⚑'}
                      </div>
                      <div style={{ fontSize: 9, color: isOverdue ? '#F87171' : 'var(--text-4)',
                        fontWeight: isOverdue ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {!groupByProject && `${projectNaam(b.werkpakket_id)} · `}
                        {isOverdue ? `${Math.abs(wk)}w te laat` : isDone ? '✓ klaar' : `${wk}w`}
                        {b.aannemer && ` · ${b.aannemer}`}
                      </div>
                    </div>
                  </div>

                  {/* Tijdlijn */}
                  <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                    {/* Rasterlijnen */}
                    {months.map((m, i) => (
                      <div key={i} style={{ position: 'absolute', left: `${m.pct}%`, top: 0, bottom: 0,
                        width: m.isJan ? '1.5px' : '0.5px',
                        background: m.isJan ? 'var(--border-md)' : 'var(--border)', opacity: 0.5 }} />
                    ))}

                    {/* Vandaag-lijn */}
                    {todayPct >= 0 && todayPct <= 100 && (
                      <div style={{ position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0,
                        width: 2, background: '#3D6B9E', opacity: 0.6, zIndex: 2 }} />
                    )}

                    {/* Boring balk */}
                    <div style={{
                      position: 'absolute',
                      left: `${startPct}%`, width: `${widthPct}%`,
                      top: '18%', height: '64%',
                      borderRadius: 4,
                      background: barColor,
                      border: isOverdue ? '1.5px solid #991B1B' : `0.5px solid ${barColor}`,
                      overflow: 'hidden',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                      zIndex: 1,
                    }}>
                      {/* Voortgang overlay */}
                      {pct > 0 && pct < 100 && (
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0,
                          width: `${pct}%`, background: 'rgba(255,255,255,0.25)' }} />
                      )}
                      {widthPct > 4 && (
                        <span style={{ position: 'relative', fontSize: 8, fontWeight: 700,
                          color: SC[b.status_ontwerp ?? '']?.fg ?? '#fff', paddingLeft: 4, zIndex: 1 }}>
                          {pct > 0 ? `${pct}%` : ''}
                        </span>
                      )}
                    </div>

                    {/* Deadline pijl */}
                    <div style={{
                      position: 'absolute',
                      left: `calc(${endPct}% - 3px)`,
                      top: '10%', height: '80%',
                      width: 6, borderRadius: 2,
                      background: isOverdue ? '#D70015' : isDone ? '#1A7F3C' : '#1E2B3C',
                      zIndex: 3,
                    }} title={`${b.boring_nr} deadline: ${new Date(b.planning_apds!).toLocaleDateString('nl-NL')}`} />
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Boringen zonder datum */}
        {withoutDate.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', height: 24,
              background: 'var(--surface3)', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ width: LABEL_W, fontSize: 10, fontWeight: 600, color: 'var(--text-4)', paddingLeft: 8 }}>
                Geen planningsdatum ({withoutDate.length})
              </div>
            </div>
            {withoutDate.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', height: ROW_H,
                borderBottom: '0.5px solid var(--border)', opacity: 0.4 }}>
                <div style={{ width: LABEL_W, paddingLeft: 16 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                    {!groupByProject && `${projectNaam(b.werkpakket_id)} · `}{b.boring_nr}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-4)', paddingLeft: 8 }}>Geen planning APD ingevuld</div>
              </div>
            ))}
          </div>
        )}

        {/* Legenda */}
        <div style={{ display: 'flex', gap: 16, padding: '0.75rem 0', flexWrap: 'wrap',
          borderTop: '0.5px solid var(--border)', marginTop: 4 }}>
          {Object.entries(SC).map(([label, c]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 12, height: 8, borderRadius: 2, background: c.bg }} />
              <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 2, height: 12, background: '#3D6B9E', borderRadius: 1 }} />
            <span style={{ fontSize: 9, color: 'var(--text-3)' }}>Vandaag</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 10, background: '#1E2B3C', borderRadius: 1 }} />
            <span style={{ fontSize: 9, color: 'var(--text-3)' }}>Deadline (planning APD)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Hoofd-pagina ────────────────────────────────────────────────────────────── */
export default function PlanningPage() {
  const [boringen,  setBoringen]  = useState<Boring[]>([]);
  const [projecten, setProjecten] = useState<Project[]>([]);
  const [loading,   setLoading]   = useState(true);

  const [filterProject,  setFilterProject]  = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterAannemer, setFilterAannemer] = useState('');
  const [filterType,     setFilterType]     = useState('');
  const [filterKlasse,   setFilterKlasse]   = useState('');
  const [filterAPD,      setFilterAPD]      = useState('');
  const [showVervallen,  setShowVervallen]  = useState(false);
  const [groupByProject, setGroupByProject] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('boringen').select('id,werkpakket_id,boring_nr,werkpakket_nr,locatie,lengte_m,type_boring,aannemer,klasse,apd_verantw,planning_apds,status_ontwerp,hdd_tek_pct,prioritering,vervallen'),
      supabase.from('werkpakketten').select('row_idx,projectnaam').order('row_idx'),
    ]).then(([{ data: b }, { data: p }]) => {
      setBoringen((b ?? []) as Boring[]);
      setProjecten((p ?? []) as Project[]);
      setLoading(false);
    });
  }, []);

  const nu = Date.now();

  /* KPI tellers */
  const kpi = useMemo(() => {
    const active = boringen.filter(b => !b.vervallen);
    const isDone = (b: Boring) => ['Vrijgegeven','Goedgekeurd'].includes(b.status_ontwerp ?? '');
    const kritiek  = active.filter(b => b.planning_apds && new Date(b.planning_apds).getTime() < nu && !isDone(b));
    const attentie = active.filter(b => {
      if (!b.planning_apds || isDone(b)) return false;
      const wk = (new Date(b.planning_apds).getTime() - nu) / (1000*60*60*24*7);
      return wk >= 0 && wk <= 4;
    });
    const opSchema = active.filter(b => {
      if (!b.planning_apds) return false;
      const wk = (new Date(b.planning_apds).getTime() - nu) / (1000*60*60*24*7);
      return wk > 4 || isDone(b);
    });
    return { kritiek: kritiek.length, attentie: attentie.length, opSchema: opSchema.length };
  }, [boringen, nu]);

  /* Unieke filterwaarden */
  const allActive = useMemo(() => boringen.filter(b => !b.vervallen || showVervallen), [boringen, showVervallen]);
  const projectOptions  = useMemo(() => projecten.filter(p => allActive.some(b => b.werkpakket_id === p.row_idx)), [projecten, allActive]);
  const aannemerOptions = useMemo(() => Array.from(new Set(allActive.map(b => b.aannemer).filter(Boolean) as string[])).sort(), [allActive]);
  const typeOptions     = useMemo(() => Array.from(new Set(allActive.map(b => b.type_boring).filter(Boolean) as string[])).sort(), [allActive]);
  const klasseOptions   = useMemo(() => Array.from(new Set(allActive.map(b => b.klasse).filter(Boolean) as string[])).sort(), [allActive]);
  const apdOptions      = useMemo(() => Array.from(new Set(allActive.map(b => b.apd_verantw).filter(Boolean) as string[])).sort(), [allActive]);

  /* Gefilterd */
  const filtered = useMemo(() => {
    return boringen.filter(b => {
      if (!showVervallen && b.vervallen) return false;
      if (filterProject  && String(b.werkpakket_id) !== filterProject) return false;
      if (filterStatus   && b.status_ontwerp !== filterStatus) return false;
      if (filterAannemer && b.aannemer !== filterAannemer) return false;
      if (filterType     && b.type_boring !== filterType) return false;
      if (filterKlasse   && b.klasse !== filterKlasse) return false;
      if (filterAPD      && b.apd_verantw !== filterAPD) return false;
      return true;
    });
  }, [boringen, showVervallen, filterProject, filterStatus, filterAannemer, filterType, filterKlasse, filterAPD]);

  /* Project kleur map */
  const projectColors = useMemo(() => {
    const m = new Map<number, string>();
    projecten.forEach((p, i) => m.set(p.row_idx, PROJECT_COLORS[i % PROJECT_COLORS.length]));
    return m;
  }, [projecten]);

  if (loading) return <div className="page-content"><div className="loading-bar" /></div>;

  return (
    <div className="page-content">

      {/* ── Alert tiles ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Kritiek',   count: kpi.kritiek,  fg: '#991B1B', bg: '#FEE2E2', border: '#FECACA', sub: 'deadline verstreken' },
          { label: 'Attentie',  count: kpi.attentie, fg: '#92400E', bg: '#FEF3C7', border: '#FDE68A', sub: 'deadline ≤ 4 weken' },
          { label: 'Op schema', count: kpi.opSchema, fg: '#065F46', bg: '#D1FAE5', border: '#A7F3D0', sub: '> 4 weken of klaar' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
            borderRadius: 'var(--r-lg)', border: `0.5px solid ${item.border}`,
            background: item.bg, boxShadow: 'var(--sh-sm)' }}>
            <span style={{ fontSize: 22, fontWeight: 600, color: item.fg, lineHeight: 1 }}>{item.count}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: item.fg }}>{item.label}</div>
              <div style={{ fontSize: 9, color: item.fg, opacity: 0.7 }}>{item.sub}</div>
            </div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: 'var(--text-4)' }}>
          {filtered.length} boringen zichtbaar
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="controls-bar" style={{ flexWrap: 'wrap' }}>
        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px', minWidth: 140 }}
          value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">Alle projecten</option>
          {projectOptions.map(p => <option key={p.row_idx} value={p.row_idx}>{p.projectnaam}</option>)}
        </select>
        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }}
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Alle statussen</option>
          {Object.keys(SC).map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }}
          value={filterAannemer} onChange={e => setFilterAannemer(e.target.value)}>
          <option value="">Alle aannemers</option>
          {aannemerOptions.map(a => <option key={a}>{a}</option>)}
        </select>
        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }}
          value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Alle types</option>
          {typeOptions.map(t => <option key={t}>{t}</option>)}
        </select>
        <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }}
          value={filterKlasse} onChange={e => setFilterKlasse(e.target.value)}>
          <option value="">Alle klassen</option>
          {klasseOptions.map(k => <option key={k}>{k}</option>)}
        </select>
        {apdOptions.length > 0 && (
          <select className="field-input" style={{ width: 'auto', padding: '4px 28px 4px 10px' }}
            value={filterAPD} onChange={e => setFilterAPD(e.target.value)}>
            <option value="">Alle APD's</option>
            {apdOptions.map(a => <option key={a}>{a}</option>)}
          </select>
        )}
        <button className={`tab${showVervallen ? ' active' : ''}`}
          onClick={() => setShowVervallen(v => !v)} style={{ fontSize: 11 }}>
          Toon vervallen
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          <button className={`tab${groupByProject ? ' active' : ''}`}
            onClick={() => setGroupByProject(true)} style={{ fontSize: 11 }}>⊞ Per project</button>
          <button className={`tab${!groupByProject ? ' active' : ''}`}
            onClick={() => setGroupByProject(false)} style={{ fontSize: 11 }}>≡ Alle boringen</button>
        </div>
      </div>

      {/* ── Gantt ─────────────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--r-lg)', padding: '0.875rem 1rem', boxShadow: 'var(--sh-sm)' }}>
        <GanttChart
          boringen={filtered}
          projecten={projecten}
          projectColors={projectColors}
          groupByProject={groupByProject}
        />
      </div>
    </div>
  );
}
