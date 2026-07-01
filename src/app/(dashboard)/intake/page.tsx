'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import { bepaalOpdrachtgever, OPDRACHTGEVERS } from '@/lib/proces';

interface Boring {
  id: string;
  werkpakket_id?: number;
  boring_nr?: string;
  locatie?: string;
  klasse?: string;
  lengte_m?: number;
  type_boring?: string;
  aannemer?: string;
  vervallen?: boolean;
  intake_compleet?: boolean;
}

const PROJECTEN = [
  { wp: 1, naam: 'Akkrum' },
  { wp: 2, naam: 'Lemmer-oost' },
  { wp: 3, naam: 'Wolvega' },
  { wp: 4, naam: 'Joure' },
  { wp: 5, naam: 'Urk-Zuid' },
  { wp: 6, naam: 'Luinjeberd' },
  { wp: 7, naam: 'Urk WP2' },
];

export default function IntakePage() {
  const toast = useToast();
  const [data, setData] = useState<Boring[]>([]);
  const [wp, setWp] = useState<number>(0);
  const [keuze, setKeuze] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [bezig, setBezig] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await createClient()
      .from('boringen')
      .select('id, werkpakket_id, boring_nr, locatie, klasse, lengte_m, type_boring, aannemer, vervallen, intake_compleet')
      .order('boring_nr', { ascending: true });
    setData((rows ?? []) as unknown as Boring[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const pending = useMemo(
    () => data.filter(b => !b.vervallen && b.intake_compleet !== true && (wp === 0 || b.werkpakket_id === wp)),
    [data, wp]
  );

  const gekozen = (b: Boring) => keuze[b.id] ?? bepaalOpdrachtgever(b.klasse, b.lengte_m) ?? '';

  const doorzetten = async (b: Boring) => {
    const g = gekozen(b);
    if (!g) { toast('Kies eerst een opdrachtgever', 'error'); return; }
    const { error } = await createClient().from('boringen').update({ aannemer: g, intake_compleet: true } as never).eq('id', b.id);
    if (error) { toast(error.message, 'error'); return; }
    setData(prev => prev.map(x => (x.id === b.id ? { ...x, aannemer: g, intake_compleet: true } : x)));
    toast(`✓ ${b.boring_nr ?? 'Boring'} doorgezet naar ${g}`, 'success');
  };

  const doorzetAlle = async () => {
    const todo = pending.map(b => ({ b, g: gekozen(b) })).filter(x => x.g);
    if (!todo.length) { toast('Geen boringen met een opdrachtgever om door te zetten', 'error'); return; }
    setBezig(true);
    let ok = 0;
    for (const { b, g } of todo) {
      const { error } = await createClient().from('boringen').update({ aannemer: g, intake_compleet: true } as never).eq('id', b.id);
      if (!error) { ok++; setData(prev => prev.map(x => (x.id === b.id ? { ...x, aannemer: g, intake_compleet: true } : x))); }
    }
    setBezig(false);
    toast(`✓ ${ok} boringen doorgezet naar het project`, 'success');
  };

  const tab: React.CSSProperties = { fontSize: 12, padding: '5px 12px', fontWeight: 500 };
  const tabActief: React.CSSProperties = { ...tab, background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)', fontWeight: 700 };

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'var(--font)', color: 'var(--text)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Intake</h1>
        <span style={{ fontSize: 12, color: 'var(--text-4)' }}>
          {loading ? 'laden…' : `${pending.length} boringen te beoordelen`}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        <button type="button" className="btn" style={wp === 0 ? tabActief : tab} onClick={() => setWp(0)}>Alle projecten</button>
        {PROJECTEN.map(p => (
          <button key={p.wp} type="button" className="btn" style={p.wp === wp ? tabActief : tab} onClick={() => setWp(p.wp)}>{p.naam}</button>
        ))}
      </div>

      <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-3)' }}>
        De formule stelt op basis van klasse (tonnage) + lengte een opdrachtgever voor. Controleer, pas eventueel aan, en zet door — de boring komt dan in het project (Boringen).
      </div>

      {pending.length > 0 && (
        <button className="btn btn-primary" onClick={doorzetAlle} disabled={bezig} style={{ fontSize: 12, marginBottom: 12 }}>
          {bezig ? 'Bezig…' : `Alles doorzetten (${pending.length})`}
        </button>
      )}

      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md, 10px)', overflow: 'hidden' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface-2, #f5f7fa)' }}>
              {['Project', 'Boor nr', 'Locatie', 'Klasse', 'L (m)', 'Type', 'Voorstel', 'Opdrachtgever', ''].map((h, i) => (
                <th key={i} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-2)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)' }}>Laden…</td></tr>
            ) : pending.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}>Geen boringen in de intake — alles is doorgezet naar het project.</td></tr>
            ) : pending.map(b => {
              const voorstel = bepaalOpdrachtgever(b.klasse, b.lengte_m);
              return (
                <tr key={b.id}>
                  <td style={cel}>{PROJECTEN.find(p => p.wp === b.werkpakket_id)?.naam ?? '—'}</td>
                  <td style={{ ...cel, fontWeight: 700 }}>{b.boring_nr ?? '—'}</td>
                  <td style={cel}>{b.locatie ?? '—'}</td>
                  <td style={cel}>{b.klasse ?? '—'}</td>
                  <td style={cel}>{b.lengte_m ?? '—'}</td>
                  <td style={cel}>{b.type_boring ?? '—'}</td>
                  <td style={{ ...cel, fontWeight: 600, color: voorstel ? 'var(--accent)' : 'var(--text-4)' }}>{voorstel ?? 'handmatig'}</td>
                  <td style={cel}>
                    <select className="field-input" style={{ fontSize: 12, minWidth: 110, padding: '3px 8px' }}
                      value={gekozen(b)} onChange={e => setKeuze(k => ({ ...k, [b.id]: e.target.value }))}>
                      <option value="">— kies —</option>
                      {OPDRACHTGEVERS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td style={cel}>
                    <button className="btn btn-primary" style={{ fontSize: 12, padding: '3px 12px', whiteSpace: 'nowrap' }} onClick={() => doorzetten(b)}>Doorzetten →</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const cel: React.CSSProperties = { padding: '7px 12px', borderBottom: '0.5px solid var(--border)', color: 'var(--text-2)', whiteSpace: 'nowrap' };
