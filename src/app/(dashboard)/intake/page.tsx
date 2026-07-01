'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import Modal from '@/components/ui/Modal';
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
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Partial<Boring>>({});

  const KLASSEN = ['9T', '17T', '27T', '50T'];
  const TYPES = ['Walk-over', 'Gyro'];

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

  const openNieuw = () => {
    setForm({ werkpakket_id: wp === 0 ? 1 : wp, klasse: '9T', type_boring: 'Walk-over' });
    setFormOpen(true);
  };

  const aanmaken = async () => {
    if (!form.werkpakket_id) { toast('Kies een project', 'error'); return; }
    if (!form.boring_nr) { toast('Vul een boornummer in', 'error'); return; }
    setBezig(true);
    const payload = {
      werkpakket_id: form.werkpakket_id,
      boring_nr: form.boring_nr,
      locatie: form.locatie ?? null,
      klasse: form.klasse ?? null,
      lengte_m: form.lengte_m ?? null,
      type_boring: form.type_boring ?? null,
      intake_compleet: false,
      vervallen: false,
    };
    const { data: ins, error } = await createClient().from('boringen').insert(payload as never).select();
    setBezig(false);
    if (error) { toast(error.message, 'error'); return; }
    if (ins) setData(prev => [...prev, ...(ins as unknown as Boring[])]);
    setFormOpen(false);
    toast('Boring toegevoegd aan de intake', 'success');
  };

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

      <div style={{ marginBottom: 14, fontSize: 12.5, color: 'var(--text-2)', background: 'var(--surface-2, #f5f7fa)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', maxWidth: 720 }}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>Hoe de formule de opdrachtgever kiest</div>
        <div style={{ lineHeight: 1.6 }}>De opdrachtgever wordt bepaald uit <strong>klasse (tonnage)</strong> en <strong>lengte</strong> van de boring:</div>
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
          <li><strong>17T, 27T, 50T</strong> en zwaarder → <strong>Heijmans</strong> (alleen zij hebben deze boorstellingen)</li>
          <li><strong>9T</strong> tot en met <strong>150 m</strong> → <strong>Pol</strong> (korte boringen)</li>
          <li><strong>9T</strong> langer dan <strong>150 m</strong> → <strong>Voskuilen</strong> (kan tot 180 m)</li>
          <li>Onbekende of lege klasse → <strong>handmatig</strong> kiezen</li>
        </ul>
        <div style={{ marginTop: 8, color: 'var(--text-4)', fontSize: 11.5 }}>Het voorstel is een suggestie — je kunt het per boring aanpassen voordat je doorzet.</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={openNieuw} style={{ fontSize: 12 }}>+ Nieuwe boring</button>
        {pending.length > 0 && (
          <button className="btn" onClick={doorzetAlle} disabled={bezig} style={{ fontSize: 12 }}>
            {bezig ? 'Bezig…' : `Alles doorzetten (${pending.length})`}
          </button>
        )}
      </div>

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

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Nieuwe boring — intake" maxWidth={460}
        footer={
          <>
            <button className="btn" onClick={() => setFormOpen(false)}>Annuleren</button>
            <button className="btn btn-primary" onClick={aanmaken} disabled={bezig}>{bezig ? 'Bezig…' : 'Aanmaken'}</button>
          </>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={veldLabel}>Project
            <select className="field-input" value={form.werkpakket_id ?? ''} onChange={e => setForm(f => ({ ...f, werkpakket_id: Number(e.target.value) }))}>
              {PROJECTEN.map(p => <option key={p.wp} value={p.wp}>{p.naam}</option>)}
            </select>
          </label>
          <label style={veldLabel}>Boornummer
            <input className="field-input" placeholder="bijv. HDD-001" value={form.boring_nr ?? ''} onChange={e => setForm(f => ({ ...f, boring_nr: e.target.value }))} />
          </label>
          <label style={veldLabel}>Locatie
            <input className="field-input" value={form.locatie ?? ''} onChange={e => setForm(f => ({ ...f, locatie: e.target.value }))} />
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ ...veldLabel, flex: 1 }}>Klasse
              <select className="field-input" value={form.klasse ?? ''} onChange={e => setForm(f => ({ ...f, klasse: e.target.value }))}>
                {KLASSEN.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <label style={{ ...veldLabel, flex: 1 }}>Lengte (m)
              <input className="field-input" type="number" value={form.lengte_m ?? ''} onChange={e => setForm(f => ({ ...f, lengte_m: e.target.value === '' ? undefined : Number(e.target.value) }))} />
            </label>
          </div>
          <label style={veldLabel}>Type
            <select className="field-input" value={form.type_boring ?? ''} onChange={e => setForm(f => ({ ...f, type_boring: e.target.value }))}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <div style={{ fontSize: 12, color: 'var(--text-2)', background: 'var(--surface-2, #f5f7fa)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
            Voorstel opdrachtgever (formule):{' '}
            <strong style={{ color: bepaalOpdrachtgever(form.klasse, form.lengte_m ?? null) ? 'var(--accent)' : 'var(--text-4)' }}>
              {bepaalOpdrachtgever(form.klasse, form.lengte_m ?? null) ?? 'handmatig te kiezen'}
            </strong>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const cel: React.CSSProperties = { padding: '7px 12px', borderBottom: '0.5px solid var(--border)', color: 'var(--text-2)', whiteSpace: 'nowrap' };
const veldLabel: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-2)' };
