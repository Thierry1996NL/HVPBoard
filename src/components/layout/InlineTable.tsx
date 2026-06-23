'use client';

import { useState } from 'react';

/* ── Status kleur-codering (gelijk aan Boringen) ─────────────────────────────── */
export const STATUS_COLORS: Record<string, { bg: string; fg: string; pct: number; label: string }> = {
  'Issue':        { bg: '#D70015', fg: '#fff',    pct: 0,   label: 'Issue' },
  'Gestart':      { bg: '#F5A623', fg: '#fff',    pct: 25,  label: 'Gestart' },
  'Afgekeurd':    { bg: '#E8830A', fg: '#fff',    pct: 40,  label: 'Afgekeurd' },
  'Ter controle': { bg: '#F5C842', fg: '#1A1A1A', pct: 50,  label: 'Ter controle' },
  'Goedgekeurd':  { bg: '#8BC34A', fg: '#fff',    pct: 75,  label: 'Goedgekeurd' },
  'Vrijgegeven':  { bg: '#1A7F3C', fg: '#fff',    pct: 100, label: 'Vrijgegeven' },
  'Vertraagd':    { bg: '#D70015', fg: '#fff',    pct: 0,   label: 'Vertraagd' },
  'Voldoet':      { bg: '#8BC34A', fg: '#fff',    pct: 100, label: 'Voldoet' },
  'N.v.t.':       { bg: '#EBEBEB', fg: '#6E6E73', pct: 0,   label: 'N.v.t.' },
  'Vervallen':    { bg: '#EBEBEB', fg: '#6E6E73', pct: 0,   label: 'Vervallen' },
  'Niet gestart': { bg: '#F5F5F7', fg: '#6E6E73', pct: 0,   label: 'Niet gestart' },
};

export const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

export const statusPill = (s?: string) => {
  const c = STATUS_COLORS[s ?? ''];
  return c
    ? <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>{s}</span>
    : <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>;
};

export type InlineOpt = { value: string | number; label: string };

/* Bouwt opties voor een inline-select; voegt standaard een lege ('—') optie toe. */
export const toOpts = (arr: string[], empty = true): InlineOpt[] =>
  (empty ? [{ value: '', label: '—' }] : []).concat(arr.map(s => ({ value: s, label: s })));

export function Check({ v }: { v?: boolean }) {
  return v
    ? <span style={{ color: '#1A7F3C', fontWeight: 700, fontSize: 13 }}>✓</span>
    : <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>;
}

/* Datumveld dat de kalender opent zodra je érgens in het veld klikt. */
export function DateInput({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  const open = (el: HTMLInputElement) => {
    try { (el as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch { /* oudere browser */ }
  };
  return (
    <input className="field-input" type="date" value={value ?? ''} style={{ cursor: 'pointer' }}
      onClick={e => open(e.currentTarget)} onFocus={e => open(e.currentTarget)}
      onChange={e => onChange(e.target.value || undefined)} />
  );
}

/* Inline-bewerkbare tabelcel. Klik opent een invoerveld; opslaan gebeurt direct.
   'bool' wisselt meteen bij klik. Klik op een editbare cel borrelt niet door naar de rij. */
export function InlineCell({
  type, value, display, onSave, options, tdStyle,
}: {
  type: 'text' | 'number' | 'date' | 'select' | 'bool';
  value: string | number | boolean | undefined;
  display: React.ReactNode;
  onSave: (v: string | number | boolean | undefined) => void;
  options?: InlineOpt[];
  tdStyle?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);

  if (type === 'bool') {
    return (
      <td className="inline-cell" title="Klik om te wisselen"
        style={{ textAlign: 'center', cursor: 'pointer', ...tdStyle }}
        onClick={e => { e.stopPropagation(); onSave(!value); }}>
        {display}
      </td>
    );
  }

  if (!editing) {
    return (
      <td className="inline-cell" title="Klik om te bewerken"
        style={{ cursor: 'pointer', ...tdStyle }}
        onClick={e => { e.stopPropagation(); setEditing(true); }}>
        {display}
      </td>
    );
  }

  const numericSelect = type === 'select' && (options?.some(o => typeof o.value === 'number') ?? false);
  const commit = (raw: string) => {
    setEditing(false);
    let next: string | number | undefined;
    if (raw === '') next = undefined;
    else if (type === 'number' || numericSelect) next = Number(raw);
    else next = raw;
    if (String(next ?? '') !== String(value ?? '')) onSave(next);
  };
  const openPicker = (el: HTMLInputElement) => {
    try { (el as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch { /* icoon werkt nog */ }
  };

  return (
    <td className="inline-cell editing" style={{ ...tdStyle }} onClick={e => e.stopPropagation()}>
      {type === 'select' ? (
        <select className="inline-edit" autoFocus defaultValue={String(value ?? '')}
          onChange={e => commit(e.target.value)} onBlur={() => setEditing(false)}>
          {options?.map(o => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
        </select>
      ) : type === 'date' ? (
        <input className="inline-edit" type="date" autoFocus defaultValue={value ? String(value) : ''}
          onChange={e => commit(e.target.value)} onBlur={() => setEditing(false)}
          onFocus={e => openPicker(e.currentTarget)} onClick={e => openPicker(e.currentTarget)} />
      ) : (
        <input className="inline-edit" type={type === 'number' ? 'number' : 'text'} autoFocus
          defaultValue={value !== undefined ? String(value) : ''}
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
            else if (e.key === 'Escape') { e.preventDefault(); setEditing(false); }
          }} />
      )}
    </td>
  );
}
