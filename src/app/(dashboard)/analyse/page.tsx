'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useProjects } from '@/hooks/useProjects';
import { FASEN, COLS } from '@/lib/constants';
import { getEngineer, getProgressPercent, calcHealth } from '@/lib/utils';

const STATUS_COLS_ALL = FASEN.flatMap(f => f.statCols);

const COLORS = {
  Gereed: '#1A7F3C',
  Loopt: '#0071E3',
  Review: '#8E6000',
  Geblokkeerd: '#D70015',
  'Nog te starten': '#6E6E73',
};

export default function AnalysePage() {
  const { projects, loading } = useProjects();

  const realProjects = useMemo(() =>
    projects.filter(p => p.projectnaam !== '__config__'),
    [projects]
  );

  // Status distribution across all projects
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      Gereed: 0, Loopt: 0, Review: 0, Geblokkeerd: 0, 'Nog te starten': 0,
    };
    realProjects.forEach(p => {
      STATUS_COLS_ALL.forEach(ci => {
        const v = p.cel_data[String(ci)];
        if (v && v in counts) counts[v]++;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [realProjects]);

  // Per-fase progress
  const faseProgress = useMemo(() => {
    return FASEN.map(fase => {
      const progresses = realProjects.map(p => getProgressPercent(p.cel_data, fase.statCols));
      const avg = progresses.length ? Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length) : 0;
      return { name: fase.l, voortgang: avg };
    });
  }, [realProjects]);

  // Per-engineer project count + health
  const engineerStats = useMemo(() => {
    const map: Record<string, { total: number; groen: number; oranje: number; rood: number }> = {};
    realProjects.forEach(p => {
      const eng = getEngineer(p.cel_data) || 'Onbekend';
      if (!map[eng]) map[eng] = { total: 0, groen: 0, oranje: 0, rood: 0 };
      map[eng].total++;
      // Health based on first fase
      const h = calcHealth(p.cel_data, FASEN[0]);
      if (h === 'groen') map[eng].groen++;
      else if (h === 'oranje') map[eng].oranje++;
      else if (h === 'rood') map[eng].rood++;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [realProjects]);

  // Health distribution per fase
  const healthByFase = useMemo(() => {
    return FASEN.map(fase => {
      const counts = { groen: 0, oranje: 0, rood: 0, grijs: 0 };
      realProjects.forEach(p => {
        const h = calcHealth(p.cel_data, fase);
        counts[h]++;
      });
      return { name: fase.l, ...counts };
    });
  }, [realProjects]);

  if (loading) return <div className="page-content"><div className="loading-bar" /></div>;

  return (
    <div className="page-content">
      {/* Summary KPIs */}
      <div className="stats-bar" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card">
          <span className="stat-num">{realProjects.length}</span>
          <span className="stat-label">Projecten</span>
        </div>
        {(['Gereed', 'Loopt', 'Geblokkeerd'] as const).map(s => {
          const count = statusCounts.find(x => x.name === s)?.value ?? 0;
          const cls = s === 'Gereed' ? 'G' : s === 'Loopt' ? 'L' : 'B';
          return (
            <div key={s} className={`stat-card stat-${cls}`}>
              <span className="stat-num">{count}</span>
              <span className="stat-label">{s}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>

        {/* Status distribution pie */}
        <ChartCard title="Statusverdeling (alle taken)">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusCounts.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {statusCounts.map(entry => (
                  <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS] ?? '#999'} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v} taken`, '']} />
              <Legend formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Fase progress bar chart */}
        <ChartCard title="Gemiddelde voortgang per fase">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={faseProgress} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-2)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-2)' }} domain={[0, 100]} unit="%" />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Voortgang']} />
              <Bar dataKey="voortgang" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Health by fase */}
        <ChartCard title="Projectgezondheid per fase">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={healthByFase} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-2)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-2)' }} />
              <Tooltip />
              <Bar dataKey="groen" name="Op schema" stackId="a" fill="#1A7F3C" />
              <Bar dataKey="oranje" name="Attentie" stackId="a" fill="#8E6000" />
              <Bar dataKey="rood" name="Kritiek" stackId="a" fill="#D70015" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Engineer overview */}
        <ChartCard title="Projecten per engineer">
          <div style={{ overflowY: 'auto', maxHeight: 220 }}>
            <table style={{ width: '100%', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600, color: 'var(--text-2)', fontSize: 11 }}>Engineer</th>
                  <th style={{ textAlign: 'center', padding: '4px 8px', fontSize: 11, color: 'var(--g-fg)' }}>Groen</th>
                  <th style={{ textAlign: 'center', padding: '4px 8px', fontSize: 11, color: 'var(--r-fg)' }}>Oranje</th>
                  <th style={{ textAlign: 'center', padding: '4px 8px', fontSize: 11, color: 'var(--b-fg)' }}>Rood</th>
                  <th style={{ textAlign: 'center', padding: '4px 8px', fontSize: 11 }}>Totaal</th>
                </tr>
              </thead>
              <tbody>
                {engineerStats.map(e => (
                  <tr key={e.name} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '5px 8px', fontWeight: 500 }}>{e.name}</td>
                    <td style={{ textAlign: 'center', padding: '5px 8px', color: 'var(--g-fg)' }}>{e.groen || '—'}</td>
                    <td style={{ textAlign: 'center', padding: '5px 8px', color: 'var(--r-fg)' }}>{e.oranje || '—'}</td>
                    <td style={{ textAlign: 'center', padding: '5px 8px', color: 'var(--b-fg)' }}>{e.rood || '—'}</td>
                    <td style={{ textAlign: 'center', padding: '5px 8px', fontWeight: 600 }}>{e.total}</td>
                  </tr>
                ))}
                {engineerStats.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>Geen data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '1.125rem 1.25rem', boxShadow: 'var(--sh-sm)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: '0.875rem', color: 'var(--text)' }}>{title}</div>
      {children}
    </div>
  );
}
