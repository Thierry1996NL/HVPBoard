'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/ToastProvider';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import { COLS, FASEN, STATUS_VALUES, statusClass } from '@/lib/constants';
import { getProjectNaam } from '@/lib/utils';
import type { Werkpakket, Contactpersoon, OntwerpLaag, Opmerking, StatusValue, CelData } from '@/types';

type Section = 'status' | 'ontwerp' | 'contactpersonen' | 'opmerkingen';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const mode = 'editor';
  const toast = useToast();

  const [project, setProject] = useState<Werkpakket | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('status');
  const [contactpersonen, setContactpersonen] = useState<Contactpersoon[]>([]);
  const [ontwerplagen, setOntwerplagen] = useState<OntwerpLaag[]>([]);
  const [opmerkingen, setOpmerkingen] = useState<Opmerking[]>([]);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState<{ colIdx: number; x: number; y: number } | null>(null);
  const [contactModal, setContactModal] = useState(false);
  const [contactForm, setContactForm] = useState<Partial<Contactpersoon>>({});
  const [editContactId, setEditContactId] = useState<string | null>(null);
  const [newOpmerking, setNewOpmerking] = useState('');

  const rowIdx = parseInt(id);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: wp } = await supabase.from('werkpakketten').select('*').eq('row_idx', rowIdx).single();
    setProject(wp as Werkpakket | null);
    setLoading(false);
  }, [rowIdx]);

  const loadSection = useCallback(async (section: Section) => {
    const supabase = createClient();
    if (section === 'contactpersonen') {
      const { data } = await supabase.from('contactpersonen').select('*').eq('werkpakket_id', rowIdx).order('created_at', { ascending: true });
      setContactpersonen((data ?? []) as Contactpersoon[]);
    } else if (section === 'ontwerp') {
      const { data } = await supabase.from('ontwerp_lagen').select('*').eq('werkpakket_id', rowIdx).order('created_at', { ascending: true });
      setOntwerplagen((data ?? []) as OntwerpLaag[]);
    } else if (section === 'opmerkingen') {
      const { data } = await supabase.from('opmerkingen').select('*').eq('werkpakket_id', rowIdx).order('created_at', { ascending: false });
      setOpmerkingen((data ?? []) as Opmerking[]);
    }
  }, [rowIdx]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadSection(activeSection); }, [activeSection, loadSection]);

  const updateCell = async (colIdx: number, value: string) => {
    if (!project) return;
    const supabase = createClient();
    const newData: CelData = { ...project.cel_data, [String(colIdx)]: value };
    const { error } = await supabase.from('werkpakketten').update({ cel_data: newData as unknown as never, updated_at: new Date().toISOString() } as never).eq('row_idx', rowIdx);
    if (error) { toast(error.message, 'error'); return; }
    setProject(p => p ? { ...p, cel_data: newData } : p);
    toast('Opgeslagen', 'success');
    setPicker(null);
  };

  const saveContact = async () => {
    const supabase = createClient();
    try {
      if (editContactId) {
        await supabase.from('contactpersonen').update(contactForm as never).eq('id', editContactId);
        toast('Contactpersoon bijgewerkt', 'success');
      } else {
        await supabase.from('contactpersonen').insert({ ...contactForm, werkpakket_id: rowIdx } as never);
        toast('Contactpersoon toegevoegd', 'success');
      }
      setContactModal(false);
      setContactForm({});
      setEditContactId(null);
      loadSection('contactpersonen');
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  const deleteContact = async (id: string) => {
    if (!confirm('Contactpersoon verwijderen?')) return;
    const supabase = createClient();
    await supabase.from('contactpersonen').delete().eq('id', id);
    loadSection('contactpersonen');
    toast('Verwijderd', 'success');
  };

  const addOpmerking = async () => {
    if (!newOpmerking.trim()) return;
    const supabase = createClient();
    await supabase.from('opmerkingen').insert(({
      werkpakket_id: rowIdx,
      tekst: newOpmerking.trim(),
      auteur: 'HVP',
    }) as never);
    setNewOpmerking('');
    loadSection('opmerkingen');
    toast('Opmerking toegevoegd', 'success');
  };

  if (loading) return <div className="page-content"><div className="loading-bar" /></div>;
  if (!project) return <div className="page-content"><div className="empty-state"><strong>Project niet gevonden</strong></div></div>;

  const cd = project.cel_data;
  const naam = getProjectNaam(cd, rowIdx);

  const SECTIONS: { key: Section; label: string }[] = [
    { key: 'status', label: 'Status & Taken' },
    { key: 'ontwerp', label: 'Ontwerpdocumenten' },
    { key: 'contactpersonen', label: 'Contactpersonen' },
    { key: 'opmerkingen', label: 'Opmerkingen' },
  ];

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
        <button className="btn" style={{ fontSize: 12 }} onClick={() => router.push('/projecten')}>← Terug</button>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>{naam}</h1>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
            {cd['0'] && <span>Int: <strong>{cd['0']}</strong></span>}
            {cd['1'] && <span style={{ marginLeft: 10 }}>Ext: <strong>{cd['1']}</strong></span>}
            {cd['5'] && <span style={{ marginLeft: 10 }}>WP: <strong>{cd['5']}</strong></span>}
          </div>
        </div>
      </div>

      <div className="controls-bar" style={{ marginBottom: '1rem' }}>
        {SECTIONS.map(s => (
          <button key={s.key} className={`tab${activeSection === s.key ? ' active' : ''}`} onClick={() => setActiveSection(s.key)}>{s.label}</button>
        ))}
      </div>

      {/* Status & Taken */}
      {activeSection === 'status' && (
        <div>
          {FASEN.map(fase => (
            <div key={fase.f} style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-3)', marginBottom: '0.625rem' }}>{fase.l}</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Taak</th><th>Status</th></tr></thead>
                  <tbody>
                    {fase.statCols.map(ci => {
                      const col = COLS.find(c => c.i === ci);
                      if (!col) return null;
                      const val = cd[String(ci)] ?? '';
                      return (
                        <tr key={ci}>
                          <td>{col.n}</td>
                          <td
                            className={mode === 'editor' ? 'editable' : ''}
                            onClick={mode === 'editor' ? (e) => {
                              const rect = (e.target as HTMLElement).getBoundingClientRect();
                              setPicker({ colIdx: ci, x: rect.left, y: rect.bottom + 4 });
                            } : undefined}
                          >
                            <StatusBadge status={val as StatusValue} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ontwerpdocumenten */}
      {activeSection === 'ontwerp' && (
        <div>
          <div style={{ marginBottom: '0.875rem' }}>
            <button className="btn btn-primary" onClick={async () => {
              const naam = prompt('Naam ontwerpdocument:');
              if (!naam) return;
              const supabase = createClient();
              await supabase.from('ontwerp_lagen').insert({ werkpakket_id: rowIdx, naam } as never);
              loadSection('ontwerp');
              toast('Document toegevoegd', 'success');
            }}>+ Document toevoegen</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Naam</th><th>Versie</th><th>Status</th><th>Opmerking</th><th></th></tr></thead>
              <tbody>
                {ontwerplagen.length === 0 ? (
                  <tr><td colSpan={5}><div className="empty-state"><strong>Geen documenten</strong></div></td></tr>
                ) : ontwerplagen.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.naam}</td>
                    <td>{d.versie || '—'}</td><td>{d.status || '—'}</td>
                    <td style={{ color: 'var(--text-2)' }}>{d.opmerking || '—'}</td>
                    <td>
                      <button className="btn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={async () => {
                        if (!confirm('Verwijderen?')) return;
                        const supabase = createClient();
                        await supabase.from('ontwerp_lagen').delete().eq('id', d.id);
                        loadSection('ontwerp');
                      }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contactpersonen */}
      {activeSection === 'contactpersonen' && (
        <div>
          <div style={{ marginBottom: '0.875rem' }}>
            <button className="btn btn-primary" onClick={() => { setContactForm({}); setEditContactId(null); setContactModal(true); }}>+ Contactpersoon toevoegen</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Naam</th><th>Functie</th><th>Organisatie</th><th>E-mail</th><th>Telefoon</th><th></th></tr></thead>
              <tbody>
                {contactpersonen.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state"><strong>Geen contactpersonen</strong></div></td></tr>
                ) : contactpersonen.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.naam}</td>
                    <td>{c.functie || '—'}</td><td>{c.organisatie || '—'}</td>
                    <td>{c.email ? <a href={`mailto:${c.email}`} style={{ color: 'var(--accent)' }}>{c.email}</a> : '—'}</td>
                    <td>{c.telefoon || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => { setContactForm(c); setEditContactId(c.id); setContactModal(true); }}>✎</button>
                        <button className="btn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => deleteContact(c.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Opmerkingen */}
      {activeSection === 'opmerkingen' && (
        <div>
          <div style={{ marginBottom: '1rem', display: 'flex', gap: 8 }}>
            <textarea value={newOpmerking} onChange={e => setNewOpmerking(e.target.value)} placeholder="Nieuwe opmerking..." style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border-md)', borderRadius: 'var(--r)', fontFamily: 'inherit', fontSize: 13, resize: 'vertical', minHeight: 72, outline: 'none' }} />
            <button className="btn btn-primary" onClick={addOpmerking} style={{ alignSelf: 'flex-end', whiteSpace: 'nowrap' }}>Toevoegen</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {opmerkingen.length === 0 ? (
              <div className="empty-state"><strong>Geen opmerkingen</strong></div>
            ) : opmerkingen.map(o => (
              <div key={o.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '0.875rem 1.125rem', boxShadow: 'var(--sh-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 12 }}>{o.auteur ?? 'Onbekend'}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(o.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{o.tekst}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status picker */}
      {picker && (
        <div className="status-picker" style={{ position: 'fixed', left: picker.x, top: picker.y, zIndex: 200 }}>
          {STATUS_VALUES.map(s => (
            <button key={s} className="sp-option" onClick={() => updateCell(picker.colIdx, s)}>
              <span className={`badge badge-${statusClass(s)}`} style={{ width: 8, height: 8, padding: 0, minWidth: 8, borderRadius: '50%' }} />{s}
            </button>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 0', paddingTop: 4 }}>
            <button className="sp-option" style={{ color: 'var(--text-3)' }} onClick={() => updateCell(picker.colIdx, '')}>Wissen</button>
          </div>
        </div>
      )}

      {/* Contact modal */}
      <Modal open={contactModal} onClose={() => { setContactModal(false); setContactForm({}); setEditContactId(null); }}
        title={editContactId ? 'Contactpersoon bewerken' : 'Contactpersoon toevoegen'}
        footer={<><button className="btn" onClick={() => setContactModal(false)}>Annuleren</button><button className="btn btn-primary" onClick={saveContact}>Opslaan</button></>}>
        {[
          { key: 'naam', label: 'Naam', required: true },
          { key: 'functie', label: 'Functie' },
          { key: 'organisatie', label: 'Organisatie' },
          { key: 'email', label: 'E-mail', type: 'email' },
          { key: 'telefoon', label: 'Telefoon', type: 'tel' },
        ].map(f => (
          <div key={f.key} className="field">
            <label className="field-label">{f.label}{f.required && ' *'}</label>
            <input className="field-input" type={f.type ?? 'text'}
              value={(contactForm as Record<string, string>)[f.key] ?? ''}
              onChange={e => setContactForm(d => ({ ...d, [f.key]: e.target.value }))} />
          </div>
        ))}
      </Modal>
    </div>
  );
}
