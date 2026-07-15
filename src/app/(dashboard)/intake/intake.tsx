'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { bepaalOpdrachtgever, OPDRACHTGEVERS } from '@/lib/proces';

interface Boring {
  id: string;
  werkpakket_id?: number;
  werkpakket_nr?: string;
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
  const [loading, setLoading] = useState(true);
  const [bezig, setBezig] = useState(false);
  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: string } | null>(null);
  const [inlineVal, setInlineVal] = useState('');
  const [verwijderId, setVerwijderId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Partial<Boring>>({});

  const KLASSEN = ['9T', '17T', '27T', '50T'];
  const TYPES = ['Walk-over', 'Gyro', 'Nanodrill'];

  /* Eerstvolgende oplopende boornummer binnen een project (HDD-XXX). */
  const nextBoringNr = (projectWp: number): string => {
    let max = 0;
    for (const b of data) {
      if (b.werkpakket_id !== projectWp) continue;
      const m = (b.boring_nr ?? '').match(/(\d+)/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `HDD-${String(max + 1).padStart(3, '0')}`;
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await createClient()
      .from('boringen')
      .select('id, werkpakket_id, werkpakket_nr, boring_nr, locatie, klasse, lengte_m, type_boring, aannemer, vervallen, intake_compleet')
      .order('boring_nr', { ascending: true });
    setData((rows ?? []) as unknown as Boring[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const pending = useMemo(
    () => data.filter(b => !b.vervallen && b.intake_compleet !== true && (wp === 0 || b.werkpakket_id === wp)),
    [data, wp]
  );

  const gekozen = (b: Boring) => b.aannemer ?? bepaalOpdrachtgever(b.klasse, b.lengte_m) ?? '';

  /* Opdrachtgever-keuze meteen opslaan zodra je 'm kiest, zodat een refresh
     de keuze niet meer kwijtraakt (voorheen alleen lokale state tot je op
     'Doorzetten' klikte). */
  const saveKeuze = async (id: string, value: string) => {
    setData(prev => prev.map(x => (x.id === id ? { ...x, aannemer: value || undefined } : x)));
    const { error } = await createClient().from('boringen').update({ aannemer: value || null } as never).eq('id', id);
    if (error) toast(error.message, 'error');
  };

  /* Inline bewerken van een boring in de intake-lijst. */
  const startInline = (b: Boring, field: string) => {
    const v = (b as unknown as Record<string, unknown>)[field];
    setInlineEdit({ id: b.id, field });
    setInlineVal(v == null ? '' : String(v));
  };
  const saveInline = async (id: string, field: string, raw: string) => {
    setInlineEdit(null);
    let value: unknown = raw.trim();
    if (value === '') value = null;
    else if (field === 'lengte_m') { const n = Number(String(value).replace(',', '.')); value = isNaN(n) ? null : n; }
    const { error } = await createClient().from('boringen').update({ [field]: value } as never).eq('id', id);
    if (error) { toast(error.message, 'error'); return; }
    setData(prev => prev.map(x => (x.id === id ? { ...x, [field]: value } : x)));
  };

  /* Boring verwijderen uit de intake (harde delete — staat nog niet in een project). */
  const verwijderBoring = async (b: Boring) => {
    const { error } = await createClient().from('boringen').delete().eq('id', b.id);
    setVerwijderId(null);
    if (error) { toast(error.message, 'error'); return; }
    setData(prev => prev.filter(x => x.id !== b.id));
    toast(`${b.boring_nr ?? 'Boring'} verwijderd`, 'success');
  };

  const openNieuw = () => {
    const startWp = wp === 0 ? 1 : wp;
    setForm({ werkpakket_id: startWp, boring_nr: nextBoringNr(startWp), klasse: '', type_boring: '' });
    setFormOpen(true);
  };

  const aanmaken = async () => {
    if (!form.werkpakket_id) { toast('Kies een project', 'error'); return; }
    if (!form.boring_nr) { toast('Vul een boornummer in', 'error'); return; }
    setBezig(true);
    const payload = {
      werkpakket_id: form.werkpakket_id,
      werkpakket_nr: form.werkpakket_nr ?? null,
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
              {['Project', 'Boor nr', 'WP', 'Locatie', 'Klasse', 'L (m)', 'Type', 'Voorstel', 'Opdrachtgever', '', ''].map((h, i) => (
                <th key={i} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-2)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)' }}>Laden…</td></tr>
            ) : pending.length === 0 ? (
              <tr><td colSpan={11} style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}>Geen boringen in de intake — alles is doorgezet naar het project.</td></tr>
            ) : pending.map(b => {
              const voorstel = bepaalOpdrachtgever(b.klasse, b.lengte_m);
              const isEd = (f: string) => inlineEdit?.id === b.id && inlineEdit.field === f;
              const inp = (field: string, kind: 'text' | 'number' = 'text', width = 90) => (
                <input autoFocus type={kind} value={inlineVal}
                  style={{ width, fontSize: 12, padding: '2px 5px', border: '1px solid var(--accent)', borderRadius: 4, boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--text)' }}
                  onChange={e => setInlineVal(e.target.value)}
                  onBlur={() => saveInline(b.id, field, inlineVal)}
                  onKeyDown={e => { if (e.key === 'Enter') saveInline(b.id, field, inlineVal); else if (e.key === 'Escape') setInlineEdit(null); }} />
              );
              const sel = (field: string, opts: string[]) => (
                <select autoFocus value={inlineVal}
                  style={{ fontSize: 12, padding: '2px 4px', border: '1px solid var(--accent)', borderRadius: 4, background: 'var(--surface)', color: 'var(--text)' }}
                  onChange={e => saveInline(b.id, field, e.target.value)}
                  onBlur={() => setInlineEdit(null)}>
                  <option value="">—</option>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              );
              return (
                <tr key={b.id}>
                  <td style={cel}>{PROJECTEN.find(p => p.wp === b.werkpakket_id)?.naam ?? '—'}</td>
                  <td style={{ ...cel, fontWeight: 700, cursor: 'pointer' }} onClick={() => !isEd('boring_nr') && startInline(b, 'boring_nr')}>
                    {isEd('boring_nr') ? inp('boring_nr') : (b.boring_nr ?? '—')}</td>
                  <td style={{ ...cel, color: 'var(--text-3)', cursor: 'pointer' }} onClick={() => !isEd('werkpakket_nr') && startInline(b, 'werkpakket_nr')}>
                    {isEd('werkpakket_nr') ? inp('werkpakket_nr', 'text', 70) : (b.werkpakket_nr ?? '—')}</td>
                  <td style={{ ...cel, cursor: 'pointer' }} onClick={() => !isEd('locatie') && startInline(b, 'locatie')}>
                    {isEd('locatie') ? inp('locatie', 'text', 180) : (b.locatie ?? '—')}</td>
                  <td style={{ ...cel, cursor: 'pointer' }} onClick={() => !isEd('klasse') && startInline(b, 'klasse')}>
                    {isEd('klasse') ? sel('klasse', KLASSEN) : (b.klasse ?? '—')}</td>
                  <td style={{ ...cel, cursor: 'pointer' }} onClick={() => !isEd('lengte_m') && startInline(b, 'lengte_m')}>
                    {isEd('lengte_m') ? inp('lengte_m', 'number', 70) : (b.lengte_m ?? '—')}</td>
                  <td style={{ ...cel, cursor: 'pointer' }} onClick={() => !isEd('type_boring') && startInline(b, 'type_boring')}>
                    {isEd('type_boring') ? sel('type_boring', TYPES) : (b.type_boring ?? '—')}</td>
                  <td style={{ ...cel, fontWeight: 600, color: voorstel ? 'var(--accent)' : 'var(--text-4)' }}>{voorstel ?? 'handmatig'}</td>
                  <td style={cel}>
                    <select className="field-input" style={{ fontSize: 12, minWidth: 110, padding: '3px 8px' }}
                      value={gekozen(b)} onChange={e => saveKeuze(b.id, e.target.value)}>
                      <option value="">— kies —</option>
                      {OPDRACHTGEVERS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td style={cel}>
                    <button className="btn btn-primary" style={{ fontSize: 12, padding: '3px 12px', whiteSpace: 'nowrap' }} onClick={() => doorzetten(b)}>Doorzetten →</button>
                  </td>
                  <td style={cel}>
                    <button className="btn" style={{ fontSize: 12, padding: '3px 8px', color: 'var(--b-fg)' }} title="Verwijderen" onClick={() => setVerwijderId(b.id)}>✕</button>
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
            <select className="field-input" value={form.werkpakket_id ?? ''} onChange={e => { const w = Number(e.target.value); setForm(f => ({ ...f, werkpakket_id: w, boring_nr: nextBoringNr(w) })); }}>
              {PROJECTEN.map(p => <option key={p.wp} value={p.wp}>{p.naam}</option>)}
            </select>
          </label>
          <label style={veldLabel}>Boornummer <span style={{ fontWeight: 400, color: 'var(--text-4)' }}>(automatisch voorgesteld — aan te passen)</span>
            <input className="field-input" placeholder="bijv. HDD-001" value={form.boring_nr ?? ''} onChange={e => setForm(f => ({ ...f, boring_nr: e.target.value }))} />
          </label>
          <label style={veldLabel}>Werkpakket <span style={{ fontWeight: 400, color: 'var(--text-4)' }}>(optioneel, bijv. WP-4)</span>
            <input className="field-input" placeholder="bijv. WP-4" value={form.werkpakket_nr ?? ''} onChange={e => setForm(f => ({ ...f, werkpakket_nr: e.target.value }))} />
          </label>
          <label style={veldLabel}>Locatie
            <input className="field-input" value={form.locatie ?? ''} onChange={e => setForm(f => ({ ...f, locatie: e.target.value }))} />
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ ...veldLabel, flex: 1 }}>Klasse
              <select className="field-input" value={form.klasse ?? ''} onChange={e => setForm(f => ({ ...f, klasse: e.target.value }))}>
                <option value="">Onbekend / n.t.b.</option>
                {KLASSEN.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <label style={{ ...veldLabel, flex: 1 }}>Lengte (m)
              <input className="field-input" type="number" value={form.lengte_m ?? ''} onChange={e => setForm(f => ({ ...f, lengte_m: e.target.value === '' ? undefined : Number(e.target.value) }))} />
            </label>
          </div>
          <label style={veldLabel}>Type
            <select className="field-input" value={form.type_boring ?? ''} onChange={e => setForm(f => ({ ...f, type_boring: e.target.value }))}>
              <option value="">Onbekend / n.t.b.</option>
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

      <Modal open={!!verwijderId} onClose={() => setVerwijderId(null)} title="Boring verwijderen" maxWidth={380}
        footer={
          <>
            <button className="btn" onClick={() => setVerwijderId(null)}>Annuleren</button>
            <button className="btn" style={{ background: 'var(--b-bg)', color: 'var(--b-fg)', borderColor: 'var(--b-fg)' }}
              onClick={() => { const b = data.find(x => x.id === verwijderId); if (b) verwijderBoring(b); }}>Verwijderen</button>
          </>
        }>
        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>
          Weet je zeker dat je <strong>{data.find(x => x.id === verwijderId)?.boring_nr ?? 'deze boring'}</strong> wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
        </p>
      </Modal>
    </div>
  );
}

const cel: React.CSSProperties = { padding: '7px 12px', borderBottom: '0.5px solid var(--border)', color: 'var(--text-2)', whiteSpace: 'nowrap' };
const veldLabel: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-2)' };
