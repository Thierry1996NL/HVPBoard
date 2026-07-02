'use client';

import React from 'react';

/* Inhoud uit "Procesbeschrijving HDD-engineering" (v1.0). Statische referentiepagina. */

const card: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 'var(--r-md, 10px)', background: 'var(--surface)', padding: '14px 16px' };
const h2: React.CSSProperties = { fontSize: 15, fontWeight: 700, margin: '0 0 8px', color: 'var(--text)' };
const par: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, color: 'var(--text-2)', margin: '0 0 8px' };

function Tabel({ rows }: { rows: readonly (readonly string[])[] }) {
  if (!rows.length) return null;
  const [head, ...body] = rows;
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r-md, 10px)' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
        <thead>
          <tr>{head.map((c, i) => (
            <th key={i} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2, #f5f7fa)', color: 'var(--text-2)', fontWeight: 600, whiteSpace: 'nowrap' }}>{c}</th>
          ))}</tr>
        </thead>
        <tbody>{body.map((r, ri) => (
          <tr key={ri}>{r.map((c, ci) => (
            <td key={ci} style={{ padding: '8px 12px', borderBottom: '0.5px solid var(--border)', color: 'var(--text-2)', lineHeight: 1.5, verticalAlign: 'top' }}>{c}</td>
          ))}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}

/* ── Proces DTE — inhoud uit het kernblad (v1.0, 1-7-2026) ─────────────────── */
function ProcesDTE() {
  const stappen = [
    { fase: 'FASE 0 — Voorontwerp / tracé-engineering (HVP)', items: [
      { nr: '1', titel: 'Check tracé & bepalen boorlijn + afwijkruimte', tijd: '3–5 wd' },
      { nr: '2', titel: 'Haalbaarheidsstudie HDD + boorlijn optimaliseren (go/no-go)', tijd: '2 wk (10 wd)' },
      { nr: '4', titel: 'Beslismoment sonderingen — kritiek pad', tijd: 'besluit 0,5 d / bij ja 6 wk (30 wd)' },
    ] },
    { fase: 'GATE — Overdracht tracé → boring (sessie ± 0,5 d) · mijlpaal ‘documenten compleet’', items: [
      { nr: 'G', titel: 'Overdracht naar boorpartner — aanleverset 100% compleet + overdrachtsverslag afgetekend', tijd: '± 0,5 d' },
    ] },
    { fase: 'FASE 1 — Definitief ontwerp / boor-engineering (boorpartner)', items: [
      { nr: '3', titel: 'Concept boortekening', tijd: '3 wk (15 wd)' },
      { nr: '5–6', titel: 'Concept D-GEO + voorlopige inrichtingstekening (parallel aan 3)', tijd: '3+5+6 samen ± 5 wk (25 wd)' },
      { nr: '7', titel: 'Toets concept boring (uitvoeringspartij)', tijd: '5–10 wd review' },
      { nr: '8', titel: 'Schouw (parallel aan 7)', tijd: '5–10 wd' },
    ] },
    { fase: 'FASE 2 — Definitief maken & oplevering', items: [
      { nr: '9', titel: 'Tekeningen aanpassen (toets + schouw verwerken)', tijd: '3 wd' },
      { nr: '10', titel: 'Engineering aanvullen & definitief maken', tijd: '5 wd' },
      { nr: '11', titel: 'Akkoord definitieve boring (uitvoeringspartij)', tijd: '5–10 wd review' },
      { nr: '12', titel: 'Definitieve oplevering in Relatics/DMS', tijd: '1 d' },
    ] },
  ];
  const rollen: string[][] = [
    ['Rol', 'Verantwoordelijk voor'],
    ['Tracé-engineer — HVP', 'Tracéontwerp, voorgestelde boorlijn, afwijkruimte, afstemming perceeleigenaren. Eigenaar t/m de gate.'],
    ['Boor-engineer — boorpartner', 'HDD-haalbaarheid + boorengineering (boortekening, D-GEO, inrichtingstekening). Eigenaar van het DO-traject ná de gate.'],
    ['Toets / akkoord uitvoering', 'Vrijgave voor uitvoering. Partijspecifiek: DTE → Heijmans (Lizanne van Hal); Voskuilen/Pol → eigen uitvoering.'],
    ['Proceseigenaar / regie', 'Bewaakt proces, dashboard en doorlooptijden — Patrick H. / ontwerpleiders.'],
  ];
  const aanleverset: string[][] = [
    ['Document / item', 'Formaat'],
    ['Tracé + boorlijn', 'DWG + PDF'],
    ['Kadasteroverzicht percelen', 'PDF'],
    ['Grondonderzoek (QuickScan)', 'PDF / data'],
    ['Bestaande sonderingen', 'DWG'],
    ['Afwijkruimte boorlijn', 'Notitie / tekening'],
    ['Status perceeleigenaren', 'Notitie'],
  ];
  const afspraken = [
    'Totale doorlooptijd ± 12–14 weken van vrijgave tracé tot oplevering, zónder aanvullende sonderingen (3/5/6 parallel, reviews gebundeld).',
    'Sonderingen = grootste onzekerheid. Bij vergunningsplichtige boringen al in de VO-fase aanvragen, niet pas bij de D-GEO. Betredingstoestemming en bevoegd gezag (ProRail/RWS) kunnen weken extra kosten.',
    'Service-afspraak reviews: toets (7) en akkoord (11) door de uitvoeringspartij ≤ 10 werkdagen — per partij vastleggen, zodat ze planbaar worden.',
    'Bij no-go op haalbaarheid (stap 2): loop-back naar de tracé-engineer (HVP).',
    'Dashboard verplicht per boring: processtap, status (open/loopt/gereed/geblokkeerd), wie aan zet, norm- vs. werkelijke doorlooptijd en gate-datum.',
  ];

  return (
    <div style={{ maxWidth: 1000, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Procesafspraken HDD-engineering — kernblad</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>Project NuLelie (Liander) · v1.0 · HVP ↔ boorpartners DTE, Voskuilen, Pol · 1-7-2026</p>
      </div>

      <section style={card}>
        <h2 style={h2}>Kernprincipe — één gate</h2>
        <p style={par}>Eén overdrachtsmoment tussen tracé-engineer (HVP) en boor-engineer (boorpartner). Vóór de gate is HVP eigenaar (tracé, boorlijn, afwijkruimte); ná de gate de boorpartner (HDD-haalbaarheid t/m oplevering).</p>
        <p style={par}>De gate gaat alleen open als de aanleverset 100% compleet is — dit is de harde, dateerbare mijlpaal ‘documenten compleet aangeleverd’. Zelfde proces voor alle drie de boorpartners (DTE nieuw geformaliseerd; Voskuilen/Pol herijken).</p>
      </section>

      <section>
        <h2 style={{ ...h2, fontSize: 17, marginBottom: 12 }}>Processtappen &amp; doorlooptijd-normen</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {stappen.map((f, fi) => {
            const isGate = f.fase.startsWith('GATE');
            return (
              <div key={fi}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase', color: isGate ? 'var(--b-fg)' : 'var(--accent)', margin: '4px 0 8px' }}>{f.fase}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {f.items.map((s, si) => (
                    <div key={si} style={{ ...card, borderLeft: '3px solid ' + (isGate ? 'var(--b-fg)' : 'var(--accent)'), padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontWeight: 800, color: isGate ? 'var(--b-fg)' : 'var(--accent)', fontSize: 13, minWidth: 30 }}>{s.nr}</span>
                        <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{s.titel}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}><b style={{ color: 'var(--text-2)' }}>Norm:</b> {s.tijd}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 8 }}>Stappen 2 en 4 zijn in dit kernblad naar Fase 0 (vóór de gate) verplaatst t.o.v. het HVP-proces. wd = werkdagen, wk = weken.</p>
      </section>

      <section style={card}>
        <h2 style={h2}>Hardste afspraken &amp; kritiek pad</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>{afspraken.map((b, i) => <li key={i} style={{ ...par, margin: '0 0 6px' }}>{b}</li>)}</ul>
      </section>

      <section><h2 style={{ ...h2, fontSize: 16, marginBottom: 10 }}>Wie is waar eigenaar</h2><Tabel rows={rollen} /></section>
      <section><h2 style={{ ...h2, fontSize: 16, marginBottom: 10 }}>Verplichte aanleverset (gate-checklist)</h2><Tabel rows={aanleverset} /></section>
    </div>
  );
}

export default function ProcesPage() {
  return (
    <div className="page-content">
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 16px' }}>Procesomschrijving</h1>
      <ProcesDTE />
    </div>
  );
}
