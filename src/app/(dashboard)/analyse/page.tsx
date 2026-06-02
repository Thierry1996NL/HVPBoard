'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
         PieChart, Pie, Cell, Legend } from 'recharts';
import { createClient } from '@/lib/supabase/client';

/* ── Types ──────────────────────────────────────────────────────────────────── */
interface Boring {
  id: string;
  werkpakket_id: number;
  boring_nr: string;
  status_ontwerp?: string;
  hdd_tek_pct?: number;
  type_boring?: string;
  klasse?: string;
  aannemer?: string;
  lengte_m?: number;
  planning_apds?: string;
  status_werkterrein?: string;
  status_berekening?: string;
  vervallen?: boolean;
}

interface Project { row_idx: number; projectnaam: string; }

/* ── Kleuren ─────────────────────────────────────────────────────────────────── */
const STATUS_COLORS: Record<string, string> = {
  'Vrijgegeven':  '#1A7F3C',
  'Goedgekeurd':  '#8BC34A',
  'Ter controle': '#F5C842',
  'Gestart':      '#F5A623',
  'Issue':        '#D70015',
  'Vertraagd':    '#C42B00',
  'Niet gestart': '#9CA3AF',
};
const PROJECT_PALETTE = ['#3D6B9E','#2E5488','#4A7FAF','#1D4B7A','#5A8FC4','#2C6FAC','#6BA3D6'];

/* ── KPI kaartje ─────────────────────────────────────────────────────────────── */
function KPI({ num, label, sub, color }: { num: string | number; label: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: '0.875rem 1.125rem', boxShadow: 'var(--sh-sm)', minWidth: 130 }}>
      <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.5px', color: color ?? 'var(--text)', lineHeight: 1 }}>{num}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ── Grafiek kaartje ─────────────────────────────────────────────────────────── */
function ChartCard({ title, children, height = 220 }: { title: string; children: React.ReactNode; height?: number }) {
  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: '1.125rem 1.25rem', boxShadow: 'var(--sh-sm)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: '0.875rem',
        textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

/* ── Analyse pagina ──────────────────────────────────────────────────────────── */
export default function AnalysePage() {
  const [boringen,  setBoringen]  = useState<Boring[]>([]);
  const [projecten, setProjecten] = useState<Project[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('boringen').select('*'),
      supabase.from('werkpakketten').select('row_idx, projectnaam').order('row_idx'),
    ]).then(([{ data: b }, { data: p }]) => {
      setBoringen((b ?? []) as Boring[]);
      setProjecten((p ?? []) as Project[]);
      setLoading(false);
    });
  }, []);

  const active = useMemo(() => boringen.filter(b => !b.vervallen), [boringen]);

  /* ── KPI's ────────────────────────────────────────────────────────────────── */
  const kpi = useMemo(() => {
    const totaalM = active.reduce((s, b) => s + (b.lengte_m ?? 0), 0);
    const vrijgegeven = active.filter(b => ['Vrijgegeven','Goedgekeurd'].includes(b.status_ontwerp ?? '')).length;
    const issue       = active.filter(b => ['Issue','Vertraagd'].includes(b.status_ontwerp ?? '')).length;
    const nu = Date.now();
    const overdue = active.filter(b => b.planning_apds && new Date(b.planning_apds).getTime() < nu
      && !['Vrijgegeven','Goedgekeurd'].includes(b.status_ontwerp ?? '')).length;
    const gemTek = active.length ? Math.round(active.reduce((s, b) => s + (b.hdd_tek_pct ?? 0), 0) / active.length * 100) : 0;
    return { totaal: active.length, vervallen: boringen.filter(b => b.vervallen).length,
             totaalM: Math.round(totaalM), vrijgegeven, issue, overdue, gemTek };
  }, [active, boringen]);

  /* ── Status verdeling ────────────────────────────────────────────────────── */
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of active) {
      const s = b.status_ontwerp ?? 'Niet gestart';
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [active]);

  /* ── Voortgang per project ───────────────────────────────────────────────── */
  const projectVoortgang = useMemo(() => {
    return projecten.map(p => {
      const bors = active.filter(b => b.werkpakket_id === p.row_idx);
      const vg = bors.filter(b => ['Vrijgegeven','Goedgekeurd'].includes(b.status_ontwerp ?? '')).length;
      const pct = bors.length ? Math.round((vg / bors.length) * 100) : 0;
      const gemTek = bors.length ? Math.round(bors.reduce((s, b) => s + (b.hdd_tek_pct ?? 0), 0) / bors.length * 100) : 0;
      return { name: p.projectnaam, vrijgegeven: pct, gemTek, totaal: bors.length };
    }).filter(p => p.totaal > 0);
  }, [projecten, active]);

  /* ── Type verdeling ──────────────────────────────────────────────────────── */
  const typeData = useMemo(() => {
    const c: Record<string, { count: number; m: number }> = {};
    for (const b of active) {
      const t = b.type_boring?.toLowerCase().includes('gyro') ? 'Gyro'
               : b.type_boring?.toLowerCase().includes('nano') ? 'Nanodrill'
               : b.type_boring?.toLowerCase().includes('walk') ? 'Walk-over'
               : b.type_boring ?? 'Overig';
      if (!c[t]) c[t] = { count: 0, m: 0 };
      c[t].count++;
      c[t].m += b.lengte_m ?? 0;
    }
    return Object.entries(c).map(([name, v]) => ({ name, count: v.count, m: Math.round(v.m) }))
      .sort((a, b) => b.count - a.count);
  }, [active]);

  /* ── Per aannemer ────────────────────────────────────────────────────────── */
  const aannemerData = useMemo(() => {
    const c: Record<string, { totaal: number; vg: number; m: number }> = {};
    for (const b of active) {
      const a = b.aannemer ?? 'Onbekend';
      if (!c[a]) c[a] = { totaal: 0, vg: 0, m: 0 };
      c[a].totaal++;
      if (['Vrijgegeven','Goedgekeurd'].includes(b.status_ontwerp ?? '')) c[a].vg++;
      c[a].m += b.lengte_m ?? 0;
    }
    return Object.entries(c)
      .map(([name, v]) => ({ name, totaal: v.totaal, vrijgegeven: v.vg, m: Math.round(v.m),
        pct: Math.round((v.vg / v.totaal) * 100) }))
      .sort((a, b) => b.totaal - a.totaal).slice(0, 8);
  }, [active]);

  /* ── Klasse verdeling ────────────────────────────────────────────────────── */
  const klasseData = useMemo(() => {
    const order = ['9T','17T','27T','50T','>50T','120T'];
    const c: Record<string, number> = {};
    for (const b of active) { const k = b.klasse ?? 'Onbekend'; c[k] = (c[k] ?? 0) + 1; }
    return order.filter(k => c[k]).map(k => ({ name: k, count: c[k] }))
      .concat(Object.entries(c).filter(([k]) => !order.includes(k)).map(([name, count]) => ({ name, count })));
  }, [active]);

  /* ── Deadlines per maand ─────────────────────────────────────────────────── */
  const deadlineData = useMemo(() => {
    const c: Record<string, { totaal: number; vrijgegeven: number }> = {};
    for (const b of active) {
      if (!b.planning_apds) continue;
      const d = new Date(b.planning_apds);
      const key = d.toLocaleDateString('nl-NL', { month: 'short', year: '2-digit' });
      if (!c[key]) c[key] = { totaal: 0, vrijgegeven: 0 };
      c[key].totaal++;
      if (['Vrijgegeven','Goedgekeurd'].includes(b.status_ontwerp ?? '')) c[key].vrijgegeven++;
    }
    return Object.entries(c)
      .sort(([a], [b]) => {
        const parseKey = (k: string) => { const [m, y] = k.split(' '); return parseInt('20'+y)*100 + ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'].indexOf(m.toLowerCase()); };
        return parseKey(a) - parseKey(b);
      })
      .map(([name, v]) => ({ name, totaal: v.totaal, open: v.totaal - v.vrijgegeven, vrijgegeven: v.vrijgegeven }));
  }, [active]);

  /* ── Tek % distributie ───────────────────────────────────────────────────── */
  const tekDistributie = useMemo(() => [
    { name: '100% — Vrijgegeven', count: active.filter(b => (b.hdd_tek_pct ?? 0) >= 1).length,    color: '#1A7F3C' },
    { name: '75% — Goedgekeurd',  count: active.filter(b => (b.hdd_tek_pct ?? 0) >= 0.75 && (b.hdd_tek_pct ?? 0) < 1).length, color: '#8BC34A' },
    { name: '50% — Ter controle', count: active.filter(b => (b.hdd_tek_pct ?? 0) >= 0.5  && (b.hdd_tek_pct ?? 0) < 0.75).length, color: '#F5C842' },
    { name: '25% — Gestart',      count: active.filter(b => (b.hdd_tek_pct ?? 0) > 0 && (b.hdd_tek_pct ?? 0) < 0.5).length, color: '#F5A623' },
    { name: '0% — Niet gestart',  count: active.filter(b => !b.hdd_tek_pct).length, color: '#E5E7EB' },
  ].filter(d => d.count > 0), [active]);

  if (loading) return <div className="page-content"><div className="loading-bar" /></div>;

  return (
    <div className="page-content">

      {/* ── KPI balk ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <KPI num={kpi.totaal}       label="Actieve boringen"    sub={`+ ${kpi.vervallen} vervallen`} />
        <KPI num={`${Math.round(kpi.vrijgegeven/kpi.totaal*100||0)}%`} label="Ontwerp vrijgegeven" sub={`${kpi.vrijgegeven} van ${kpi.totaal}`} color="#1A7F3C" />
        <KPI num={`${kpi.gemTek}%`} label="Gem. tekenwerk"      color={kpi.gemTek >= 75 ? '#1A7F3C' : kpi.gemTek >= 50 ? '#D97706' : '#991B1B'} />
        <KPI num={`${(kpi.totaalM/1000).toFixed(1)} km`} label="Totale boring lengte" />
        <KPI num={kpi.issue}        label="Issue / Vertraagd"   color={kpi.issue > 0 ? '#D70015' : 'var(--text)'} />
        <KPI num={kpi.overdue}      label="Deadline overschreden" color={kpi.overdue > 0 ? '#D70015' : '#1A7F3C'} sub="planning APDs verstreken" />
        <KPI num={projecten.filter(p => active.some(b => b.werkpakket_id === p.row_idx)).length} label="Actieve projecten" />
      </div>

      {/* ── Rij 1: Voortgang + Status verdeling ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <ChartCard title="Voortgang ontwerp per project" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectVoortgang} layout="vertical" margin={{ top: 0, right: 40, left: 70, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 10, fill: 'var(--text-4)' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-2)' }} width={70} />
              <Tooltip formatter={(v: number) => [`${v}%`, '']} />
              <Bar dataKey="vrijgegeven" name="Vrijgegeven %" radius={[0, 4, 4, 0]}>
                {projectVoortgang.map((_, i) => (
                  <Cell key={i} fill={PROJECT_PALETTE[i % PROJECT_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status verdeling" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusData.filter(d => d.value > 0)} cx="50%" cy="45%"
                innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] ?? '#9CA3AF'} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number, name: string) => [`${v} boringen`, name]} />
              <Legend formatter={(v) => <span style={{ fontSize: 10 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Rij 2: Deadlines + Tek % ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <ChartCard title="Boringen per deadline maand (planning APDs)" height={220}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deadlineData} margin={{ top: 0, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-4)' }} angle={-35} textAnchor="end" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-4)' }} />
              <Tooltip />
              <Bar dataKey="vrijgegeven" name="Vrijgegeven" stackId="a" fill="#1A7F3C" />
              <Bar dataKey="open"        name="Open"        stackId="a" fill="#F5A623" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tekenwerk % verdeling" height={220}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={tekDistributie} cx="50%" cy="45%"
                innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="count">
                {tekDistributie.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v} boringen`, '']} />
              <Legend formatter={(v) => <span style={{ fontSize: 9 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Rij 3: Per aannemer + Type & Klasse ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <ChartCard title="Boringen per aannemer" height={220}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={aannemerData} layout="vertical" margin={{ top: 0, right: 30, left: 75, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-4)' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-2)' }} width={75} />
              <Tooltip formatter={(v: number, name: string) => [v, name === 'vrijgegeven' ? 'Vrijgegeven' : 'Totaal']} />
              <Bar dataKey="totaal"     name="Totaal"      fill="var(--border-md)" radius={[0,3,3,0]} />
              <Bar dataKey="vrijgegeven" name="Vrijgegeven" fill="#1A7F3C" radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Type boring" height={220}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-2)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-4)' }} />
              <Tooltip formatter={(v: number, name: string) => [v, name === 'count' ? 'Boringen' : 'Meters']} />
              <Bar dataKey="count" name="Boringen" fill="#3D6B9E" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Boorstelling klasse" height={220}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={klasseData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-2)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-4)' }} />
              <Tooltip formatter={(v: number) => [v, 'Boringen']} />
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {klasseData.map((_, i) => {
                  const colors = ['#8BC34A','#3D6B9E','#F5A623','#D70015','#9C27B0','#795548'];
                  return <Cell key={i} fill={colors[i % colors.length]} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
