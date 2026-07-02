'use client';

import React, { useState } from 'react';

/* Inhoud uit "Procesbeschrijving HDD-engineering" (v1.0). Statische referentiepagina. */
const DATA = {"secties": [{"h": "1 · Doel", "p": ["Dit document stelt het definitieve HDD-engineeringproces vast tussen HVP (tracé-engineering) en de boorpartners (DTE, Voskuilen en Pol), inclusief de doorlooptijden per processtap. Per stap zijn de definitie, verantwoordelijke, input, output en doorlooptijd vastgelegd, zodat helder is welke activiteit is uitgevoerd, waar het ligt en wie verantwoordelijk is — en partijen elkaar hierop kunnen aanspreken.", "Het proces is voor alle drie de boorpartners gelijk. Voor DTE wordt het hiermee expliciet geformaliseerd. Voor Voskuilen en Pol loopt de samenwerking al goed; voor hen bevestigt en herijkt dit stuk de bestaande afspraken. Het belangrijkste verschil per partij is de uitvoeringsafstemming (zie Rolverdeling)."]}, {"h": "2 · Ontwerpprincipe — één duidelijke gate", "p": ["Het kantelpunt in het proces is het overdrachtsmoment tussen tracé-engineer (HVP) en boor-engineer (boorpartner). Vóór die gate is HVP eigenaar (tracé, voorgestelde boorlijn en afwijkruimte); ná de gate is de boorpartner eigenaar (HDD-haalbaarheid, boorengineering t/m oplevering).", "De HDD-haalbaarheid (maakbaarheid) ligt bewust bij de boorpartner als boorspecialist; deze optimaliseert de boorlijn bínnen de door HVP aangegeven afwijkruimte. De gate gaat alleen ‘open’ als de complete aanleverset er is. Daarmee is ‘documenten compleet aangeleverd’ een harde, dateerbare mijlpaal in plaats van een grijs gebied."]}, {"h": "3 · Het overdrachtsmoment (gate)", "p": ["Een korte, vaste sessie (± 0,5 dag) tussen tracé-engineer en boor-engineer waarin tracé en boorlijn worden besproken, inclusief aandachtspunten techniek en omgeving, de afwijkruimte van de boorlijn en de status van het overleg met perceeleigenaren. De gate is pas ‘gehaald’ als de aanleverset compleet is en het overdrachtsverslag is afgetekend."]}], "doorloop": ["Zonder aanvullende sonderingen: indicatief ± 8–10 weken van vrijgave tracé tot definitieve oplevering, mits stappen 3/5/6 deels parallel lopen en reviews (7/8) gebundeld worden.", "Mét aanvullende sonderingen: + 3–4 weken — veruit de grootste en meest onzekere doorlooptijd (extern veldwerk). Behandel ‘sonderingen nodig?’ als kritiek-pad-beslissing: zo vroeg mogelijk in Fase 1, niet pas bij de D-GEO.", "Reviews/akkoorden door de uitvoeringspartij (7 en 11) zijn niet-beheersbare wachttijden — bij DTE via Heijmans, bij Voskuilen en Pol via eigen uitvoering. Maak hierover per partij een service-afspraak (bv. toets binnen 10 werkdagen).", "Parallelliseren: inrichtingstekening (6) naast boortekening (3); schouw (8) inplannen tijdens de concept-toets (7)."], "vervolg": ["DTE (nieuw): aanleverset en gate-definitie vaststellen; overdrachtsverslag als vast sjabloon (1 A4-checklist); dashboard-kolommen invoeren.", "Voskuilen en Pol (herijken): bestaande werkwijze naast dit proces leggen, bevestigen wat al goed loopt en alleen waar nodig bijstellen.", "Uitvoeringsafstemming per partij borgen: DTE via Heijmans (Lizanne); Voskuilen en Pol via hun eigen uitvoering.", "Doorlooptijden kalibreren met de boorpartners en omzetten in concrete service-afspraken.", "Eerste DTE-boringen langs dit proces draaien als pilot; na 2–3 boringen evalueren en bijstellen."], "stappen": [{"fase": "FASE 0 — Voorontwerp / tracé-engineering (HVP)", "items": [{"nr": "1", "titel": "Check tracé & bepalen boorlijn", "def": "Verifiëren van het tracé op maakbaarheid, knelpunten en kruisingen; vaststellen waar een gestuurde boring nodig is, de voorgestelde boorlijn (intrede/uittrede) en de afwijkruimte t.o.v. die boorlijn (techniek + perceelgrenzen). Afstemming met perceeleigenaren.", "input": "Input: Vastgesteld tracé, KLIC/omgevingsdata", "verantw": "Tracé-engineer (HVP)", "output": "Geverifieerd tracé + voorgestelde boorlijn + afwijkruimte + knelpuntenlijst + status perceeleigenaren", "tijd": "Bew. 1–2 d / Doorloop 3–5 wd"}]}, {"fase": "GATE — Overdrachtsmoment tracé-engineering → boor-engineering", "items": [{"nr": "G", "titel": "Overdracht tracé → boring", "def": "Formele overdracht tussen tracé-engineer (HVP) en boor-engineer (boorpartner). Bespreken: tracé en boorlijn, aandachtspunten techniek én omgeving, afwijkruimte van de boorlijn en status overleg perceeleigenaren. Dossier moet 100% compleet zijn (zie aanleverset) — dit is de dashboard-mijlpaal ‘documenten compleet aangeleverd’.", "input": "Input: Complete aanleverset (Tracé+boorlijn DWG/PDF, kadaster, QuickScan, bestaande sonderingen DWG)", "verantw": "Tracé-engineer (HVP) → Boor-engineer (boorpartner)", "output": "Getekend overdrachtsverslag/-checklist + datum ‘compleet aangeleverd’", "tijd": "Sessie 0,5 d"}]}, {"fase": "FASE 1 — Definitief ontwerp / boor-engineering (boorpartner)", "items": [{"nr": "2", "titel": "Haalbaarheidsstudie HDD", "def": "Beoordelen van de maakbaarheid van de boring (bodemopbouw, trekkracht, boogstralen, in-/uittrede) en de boorlijn optimaliseren bínnen de door HVP aangegeven afwijkruimte. Go/no-go op de boring. Bij no-go: loop-back naar de tracé-engineer (HVP).", "input": "Input: Overdrachtsdossier (tracé, voorgestelde boorlijn, afwijkruimte, QuickScan, sonderingen)", "verantw": "Boor-engineer (boorpartner)", "output": "HDD-haalbaarheidsoordeel + geoptimaliseerde boorlijn (binnen afwijkruimte) + go/no-go", "tijd": "Bew. 1–2 d / Doorloop 3–5 wd"}, {"nr": "3", "titel": "Concept boortekening", "def": "Uitwerken van de boring: intrede-/uittredepunt, boogstralen, diepteverloop, dekking en kruisingen.", "input": "Input: Haalbaarheidsoordeel + geoptimaliseerde boorlijn", "verantw": "Boor-engineer (boorpartner)", "output": "Concept boortekening (DWG + PDF)", "tijd": "Bew. 2–3 d / Doorloop 5 wd"}, {"nr": "4", "titel": "Beslismoment sonderingen", "def": "Bepalen of aanvullend grondonderzoek nodig is. Zo ja: aanvragen via de projectleider HVP (veldwerk + rapportage = extern).", "input": "Input: QuickScan, bestaande sonderingen, concept boortekening", "verantw": "Boor-engineer (boorpartner) / Projectleider HVP", "output": "Besluit J/N; bij ja: sonderingsopdracht → sonderingsrapport + DWG", "tijd": "Besluit 0,5 d / bij ja doorloop 3–4 wk (extern)"}, {"nr": "5", "titel": "Concept D-GEO-berekening", "def": "Geotechnische berekening van de boring (sterkte/maakbaarheid: trekkracht, spoeldruk, opbarstrisico).", "input": "Input: Concept boortekening + sonderingsgegevens", "verantw": "Boor-engineer (boorpartner)", "output": "Concept D-GEO-berekening (onderbouwing maakbaarheid)", "tijd": "Bew. 1–2 d / Doorloop 5 wd (na sonderingen)"}, {"nr": "6", "titel": "Voorlopige inrichtingstekening werkterrein", "def": "Inrichting van in-/uittredelocatie: opstelruimte, boorstelling, rijbaan, ruimtebeslag binnen perceelgrenzen.", "input": "Input: Boorlijn, kadaster, afwijkruimte", "verantw": "Boor-engineer (boorpartner)", "output": "Voorlopige inrichtingstekening werkterreinen", "tijd": "Bew. 1 d / Doorloop 3 wd (parallel aan 3–5)"}, {"nr": "7", "titel": "Toets concept boring", "def": "Inhoudelijke toets van de conceptboring door de uitvoeringspartij; commentaar of conceptakkoord. Partijspecifiek: DTE via Heijmans Uitvoering (Lizanne van Hal), Voskuilen en Pol via eigen uitvoering.", "input": "Input: Conceptpakket (boortekening, D-GEO, inrichting)", "verantw": "Uitvoeringspartij (partijspecifiek)", "output": "Toetsverslag / commentaarlijst (conceptakkoord)", "tijd": "Doorloop 5–10 wd (review)"}, {"nr": "8", "titel": "Schouw", "def": "Veldschouw op de boorlocatie om concept te toetsen aan de werkelijke situatie.", "input": "Input: Conceptboring + locatie", "verantw": "Schouwteam (partijspecifiek)", "output": "Schouwverslag met veldbevindingen/aandachtspunten", "tijd": "Doorloop 5–10 wd (plannen+uitvoeren; parallel aan 7)"}]}, {"fase": "FASE 2 — Definitief maken & oplevering", "items": [{"nr": "9", "titel": "Tekeningen aanpassen", "def": "Verwerken van toetscommentaar (7) en schouwbevindingen (8) in de tekeningen.", "input": "Input: Toetsverslag + schouwverslag", "verantw": "Boor-engineer (boorpartner)", "output": "Bijgewerkte boor- en inrichtingstekeningen", "tijd": "Bew. 1–2 d / Doorloop 3 wd"}, {"nr": "10", "titel": "Engineering aanvullen & definitief maken", "def": "Engineering compleet en consistent maken; definitief dossier samenstellen.", "input": "Input: Bijgewerkte tekeningen + D-GEO", "verantw": "Boor-engineer (boorpartner)", "output": "Definitief boringdossier (def. boortekening, def. D-GEO, inrichting, onderbouwing)", "tijd": "Bew. 2–3 d / Doorloop 5 wd"}, {"nr": "11", "titel": "Akkoord definitieve boring", "def": "Definitieve toets en vrijgave door de uitvoeringspartij: boring is uitvoeringsgereed. Partijspecifiek: DTE via Heijmans Uitvoering (Lizanne van Hal), Voskuilen en Pol via eigen uitvoering.", "input": "Input: Definitief boringdossier", "verantw": "Uitvoeringspartij (partijspecifiek)", "output": "Akkoord / vrijgave definitieve boring", "tijd": "Doorloop 5–10 wd (review)"}, {"nr": "12", "titel": "Definitieve oplevering", "def": "Opleveren en vastleggen van het complete, vrijgegeven boringdossier.", "input": "Input: Vrijgegeven dossier", "verantw": "Boor-engineer (boorpartner)", "output": "Opgeleverd dossier in Relatics/DMS — status ‘gereed voor uitvoering’", "tijd": "1 d"}]}], "rollen": [["Rol / organisatie", "Verantwoordelijk voor", "Persoon"], ["Tracé-engineer — HVP", "Tracéontwerp en voorgestelde boorlijn, afwegen techniek/omgeving, bepalen afwijkruimte boorlijn, afstemming perceeleigenaren. Eigenaar tot en met het overdrachtsmoment.", "HVP tracé-engineering"], ["Boor-engineer — boorpartner (DTE / Voskuilen / Pol)", "HDD-haalbaarheid (maakbaarheid) en boorengineering: boortekening, D-GEO-berekening, inrichtingstekening werkterrein. Eigenaar van het DO-traject ná de overdracht. Ontvanger van het overdrachtsdossier.", "Eigen coördinator p.p. (DTE: Henk)"], ["Toets / akkoord uitvoering — partijspecifiek", "Toetst concept- en definitieve boring en geeft akkoord (vrijgave voor uitvoering). Per boorpartner een andere uitvoeringspartij.", "DTE: Lizanne van Hal (Heijmans); Voskuilen/Pol: eigen uitvoering"], ["Schouw — veld", "Voert veldschouw uit op de boorlocatie, levert schouwbevindingen.", "Eigen schouwteam p.p. (DTE: Wilco & Henk)"], ["Sonderingen — coördinatie", "Aanvraag en coördinatie aanvullend grondonderzoek (veldwerk + rapportage).", "Projectleider HVP"], ["Proceseigenaar / regie", "Bewaakt proces, dashboard, afspraken en doorlooptijden; spreekt partijen aan.", "Patrick (HVP) / Thierry"]], "partners": [["Boorpartner", "Coördinator", "Uitvoeringsafstemming (toets & akkoord) via", "Status afspraken"], ["DTE", "Henk", "Heijmans Uitvoering — Lizanne van Hal", "Nieuw: proces & dashboard worden nu geformaliseerd"], ["Voskuilen", "Eigen coördinator", "Eigen uitvoering Voskuilen", "Loopt al goed — herijken/bevestigen van bestaande afspraken"], ["Pol", "Eigen coördinator", "Eigen uitvoering Pol", "Loopt al goed — herijken/bevestigen van bestaande afspraken"]], "aanleverset": [["Document / item", "Formaat", "Toelichting"], ["Tracé + boorlijn", "DWG én PDF", "Definitieve tracélijn en voorgestelde boorlijn (intrede/uittrede, lengte, globaal verloop)."], ["Kadasteroverzicht percelen", "PDF", "Percelen langs de boring met eigenaarsgegevens; basis voor inrichting en afwijkruimte."], ["Grondonderzoek (QuickScan)", "PDF / data", "Bodemopbouw op hoofdlijnen; bepaalt of aanvullende sonderingen nodig zijn."], ["Bestaande sonderingsgegevens", "DWG", "Reeds beschikbare sonderingen op de juiste coördinaten ingemeten."], ["Afwijkruimte boorlijn", "Notitie / op tekening", "Hoeveel ruimte er is om van de boorlijn af te wijken (techniek + perceelgrenzen)."], ["Status perceeleigenaren", "Notitie", "Of/wanneer overleg met eigenaren heeft plaatsgevonden en eventuele beperkingen."]], "dashkol": [["Kolom", "Inhoud / definitie", "Voorbeeld"], ["Boring-ID / locatie", "Unieke aanduiding van de boring + locatie/deelgebied.", "B-014 / Spannenburg"], ["Boorpartner", "Welke partij de boring uitvoert (DTE / Voskuilen / Pol).", "DTE"], ["Huidige processtap", "De stap waar de boring nu in staat (1–12 / Gate).", "5 — Concept D-GEO"], ["Status stap", "Stoplichtstatus van de huidige stap (zie statusdefinities).", "Loopt / Geblokkeerd"], ["Verantwoordelijke", "Persoon/rol die nú aan zet is — ‘wie’.", "Boor-engineer (boorpartner)"], ["Documenten compleet aangeleverd", "Datum waarop het overdrachtsdossier 100% compleet is (de gate).", "12-06-2026"], ["Tekenvoortgang %", "Voortgang binnen de teken-stappen (behouden, maar alleen binnen stap 3/9/10).", "60%"], ["Sonderingen nodig?", "J/N + status; markeert het kritieke pad.", "Ja — in uitvoering"], ["Gepland / werkelijk", "Geplande einddatum van de stap vs. werkelijke datum.", "20-06 / —"], ["Normdoorlooptijd stap", "Afgesproken normdoorloop voor de huidige stap (uit §6).", "5 wd"], ["Doorlooptijd / slip", "Werkelijke doorloop van de stap en afwijking t.o.v. de norm (+ = over norm).", "7 wd (+2 wd)"], ["Toets-/akkoordstatus", "Status toets concept (7) en akkoord definitief (11).", "Concept akkoord"], ["Knelpunten / opmerking", "Korte notitie bij afwijking of blokkade — ‘waarom’.", "Wacht op sondering"]], "statussen": [["Status", "Betekenis"], ["Open", "Stap nog niet gestart; wacht op voorgaande stap."], ["Loopt", "Stap in bewerking door de verantwoordelijke."], ["Gereed", "Stap afgerond én output geleverd/vastgelegd."], ["Geblokkeerd", "Wacht op externe input of akkoord (bv. sonderingen, toets uitvoeringspartij) — staat op het kritieke pad."]], "kpis": [["KPI", "Meetwijze", "Norm / streefwaarde"], ["Doorlooptijd per processtap", "Werkelijke kalenderdoorloop per stap, afgezet tegen de normtijd uit §6.", "≥ 90% binnen norm"], ["On-time per stap", "Aandeel afgeronde stappen dat binnen de normdoorlooptijd is afgerond.", "≥ 90%"], ["Doorlooptijd tot gate", "Tijd van start tracé tot ‘documenten compleet’ (gate-datum).", "≤ 5 wd"], ["Toets-/akkoorddoorloop", "Tijd tussen indienen en toets (stap 7) resp. akkoord (stap 11) bij de uitvoeringspartij.", "≤ 10 wd (service-afspraak)"], ["Totale doorlooptijd per boring", "Van gate tot definitieve oplevering.", "≤ 10 wkn (zonder sondering)"], ["Slip per boring", "Som van (werkelijk − norm) over alle stappen van de boring.", "≤ 0 (binnen norm)"], ["Sondering-impact", "% boringen met aanvullende sondering + gemiddelde extra doorlooptijd.", "monitoren; trend ↓"], ["Blokkadeduur (rood)", "Aantal en totale duur van stappen met status ‘geblokkeerd’.", "minimaliseren"]]} as const;

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

function ProcesHVP() {
  return (
    <div style={{ maxWidth: 1000, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Procesbeschrijving HDD-engineering</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>Overdracht, processtappen, outputs &amp; doorlooptijden — HVP &amp; boorpartners (DTE, Voskuilen, Pol) · v1.0</p>
      </div>

      {DATA.secties.map((s, i) => (
        <section key={i} style={card}>
          <h2 style={h2}>{s.h}</h2>
          {s.p.map((p, j) => <p key={j} style={par}>{p}</p>)}
        </section>
      ))}

      <section>
        <h2 style={{ ...h2, fontSize: 17, marginBottom: 12 }}>Processtappen, outputs &amp; doorlooptijden</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {DATA.stappen.map((f, fi) => {
            const isGate = f.fase.startsWith('GATE');
            return (
              <div key={fi}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase', color: isGate ? 'var(--b-fg)' : 'var(--accent)', margin: '4px 0 8px' }}>{f.fase}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {f.items.map((s, si) => (
                    <div key={si} style={{ ...card, borderLeft: '3px solid ' + (isGate ? 'var(--b-fg)' : 'var(--accent)'), padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, color: isGate ? 'var(--b-fg)' : 'var(--accent)', fontSize: 13, minWidth: 18 }}>{s.nr}</span>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{s.titel}</span>
                      </div>
                      <p style={{ ...par, margin: '0 0 6px' }}>{s.def}</p>
                      {s.input ? <p style={{ fontSize: 11.5, color: 'var(--text-4)', margin: '0 0 8px', fontStyle: 'italic' }}>{s.input}</p> : null}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-3)' }}><b style={{ color: 'var(--text-2)' }}>Wie:</b> {s.verantw}</span>
                        <span style={{ color: 'var(--text-3)' }}><b style={{ color: 'var(--text-2)' }}>Output:</b> {s.output}</span>
                        <span style={{ color: 'var(--text-3)' }}><b style={{ color: 'var(--text-2)' }}>Doorloop:</b> {s.tijd}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 8 }}>* Doorlooptijd = kalenderdoorloop incl. wacht-/reviewtijd; ‘Bew.’ = netto bewerkingstijd. wd = werkdagen, wk = weken. Waarden zijn uitgangspunten, te kalibreren met de boorpartners.</p>
      </section>

      <section style={card}>
        <h2 style={h2}>Totale doorlooptijd &amp; kritiek pad</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>{DATA.doorloop.map((b, i) => <li key={i} style={{ ...par, margin: '0 0 6px' }}>{b}</li>)}</ul>
      </section>

      <section><h2 style={{ ...h2, fontSize: 16, marginBottom: 10 }}>Rolverdeling</h2><Tabel rows={DATA.rollen} /></section>
      <section><h2 style={{ ...h2, fontSize: 16, marginBottom: 10 }}>Boorpartners &amp; uitvoeringsafstemming</h2><Tabel rows={DATA.partners} /></section>
      <section><h2 style={{ ...h2, fontSize: 16, marginBottom: 10 }}>Verplichte aanleverset (gate)</h2><Tabel rows={DATA.aanleverset} /></section>
      <section><h2 style={{ ...h2, fontSize: 16, marginBottom: 10 }}>Statusdefinities (stoplicht)</h2><Tabel rows={DATA.statussen} /></section>
      <section><h2 style={{ ...h2, fontSize: 16, marginBottom: 10 }}>Dashboard — kolommen per boring</h2><Tabel rows={DATA.dashkol} /></section>
      <section><h2 style={{ ...h2, fontSize: 16, marginBottom: 10 }}>Doorlooptijd-KPI&apos;s</h2><Tabel rows={DATA.kpis} /></section>

      <section style={card}>
        <h2 style={h2}>Vervolgstappen</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>{DATA.vervolg.map((b, i) => <li key={i} style={{ ...par, margin: '0 0 6px' }}>{b}</li>)}</ul>
      </section>
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
  const [tab, setTab] = useState<'hvp' | 'dte'>('hvp');
  const tabBtn = (actief: boolean): React.CSSProperties => ({
    fontSize: 13, fontWeight: 600, padding: '7px 16px', border: '1px solid var(--border)',
    borderRadius: 'var(--r-md, 10px)', cursor: 'pointer',
    background: actief ? 'var(--accent)' : 'var(--surface)',
    color: actief ? '#fff' : 'var(--text-2)',
    borderColor: actief ? 'var(--accent)' : 'var(--border)',
  });
  return (
    <div className="page-content">
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 14px' }}>Procesomschrijving</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button type="button" style={tabBtn(tab === 'hvp')} onClick={() => setTab('hvp')}>Proces HVP</button>
        <button type="button" style={tabBtn(tab === 'dte')} onClick={() => setTab('dte')}>Proces DTE</button>
      </div>
      {tab === 'hvp' ? <ProcesHVP /> : <ProcesDTE />}
    </div>
  );
}
