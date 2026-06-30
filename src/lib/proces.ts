/* Gedeelde proceslogica (HDD-engineering) — gebruikt door de Boringen-module
   en de Projecten-pagina, zodat stoplicht, voortgang en deadlines overal gelijk zijn. */

export type StapData = { status?: string; eigenaar?: string; plandatum?: string; deadline?: string; afgerond?: boolean };
export interface ProcesStap { id: string; nr: string; titel: string; wie: string; tijd: string }

export const PROCES_FASEN: { fase: string; stappen: ProcesStap[] }[] = [
  { fase: 'Fase 0 — VO / tracé-engineering (HVP)', stappen: [
    { id: '1', nr: '1', titel: 'Check tracé & bepalen boorlijn', wie: 'Tracé-engineer (HVP)', tijd: '3–5 wd' },
  ] },
  { fase: 'Gate — Overdracht tracé → boring', stappen: [
    { id: 'G', nr: 'G', titel: 'Overdracht naar boorpartner (aanleverset 100% compleet)', wie: 'Tracé → Boor-engineer', tijd: '0,5 d' },
  ] },
  { fase: 'Fase 1 — DO / boor-engineering (boorpartner)', stappen: [
    { id: '2', nr: '2', titel: 'Haalbaarheidsstudie HDD (go/no-go)', wie: 'Boor-engineer', tijd: '3–5 wd' },
    { id: '3', nr: '3', titel: 'Concept boortekening', wie: 'Boor-engineer', tijd: '5 wd' },
    { id: '4', nr: '4', titel: 'Beslismoment sonderingen (kritiek pad)', wie: 'Boor-engineer / PL HVP', tijd: '+3–4 wk' },
    { id: '5', nr: '5', titel: 'Concept D-GEO-berekening', wie: 'Boor-engineer', tijd: '5 wd' },
    { id: '6', nr: '6', titel: 'Voorlopige inrichtingstekening werkterrein', wie: 'Boor-engineer', tijd: '3 wd' },
    { id: '7', nr: '7', titel: 'Toets concept boring', wie: 'Uitvoeringspartij', tijd: '5–10 wd' },
    { id: '8', nr: '8', titel: 'Schouw', wie: 'Schouwteam', tijd: '5–10 wd' },
  ] },
  { fase: 'Fase 2 — Definitief maken & oplevering', stappen: [
    { id: '9', nr: '9', titel: 'Tekeningen aanpassen', wie: 'Boor-engineer', tijd: '3 wd' },
    { id: '10', nr: '10', titel: 'Engineering aanvullen & definitief maken', wie: 'Boor-engineer', tijd: '5 wd' },
    { id: '11', nr: '11', titel: 'Akkoord definitieve boring', wie: 'Uitvoeringspartij', tijd: '5–10 wd' },
    { id: '12', nr: '12', titel: 'Definitieve oplevering (gereed voor uitvoering)', wie: 'Boor-engineer', tijd: '1 d' },
  ] },
];

export const ALLE_STAPPEN: ProcesStap[] = PROCES_FASEN.flatMap(f => f.stappen);

export interface BoringProces {
  stappen?: Record<string, StapData | string> | null;
  engineering_afgerond?: boolean | null;
  vervallen?: boolean | null;
}

export function getStap(b: BoringProces, id: string): StapData {
  const raw = (b.stappen ?? {})[id] as StapData | string | undefined;
  return typeof raw === 'string' ? { status: raw } : (raw ?? {});
}

export function stapDone(sd: StapData): boolean {
  return sd.afgerond === true || sd.status === 'Gereed';
}

export function stappenGereed(b: BoringProces): number {
  return ALLE_STAPPEN.filter(s => stapDone(getStap(b, s.id))).length;
}

function dagenTot(deadline: string): number {
  const d0 = new Date(deadline); d0.setHours(0, 0, 0, 0);
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  return Math.round((d0.getTime() - t0.getTime()) / 86400000);
}

export type Health = 'groen' | 'geel' | 'rood';

/* Stoplicht per boring: open stap over datum = rood, deadline ≤ 2 weken = geel. */
export function boringHealth(b: BoringProces): Health {
  if (b.engineering_afgerond) return 'groen';
  let geel = false;
  for (const s of ALLE_STAPPEN) {
    const sd = getStap(b, s.id);
    if (stapDone(sd) || sd.status === 'N.v.t.' || !sd.deadline) continue;
    const dagen = dagenTot(sd.deadline);
    if (dagen <= 0) return 'rood';
    if (dagen <= 14) geel = true;
  }
  return geel ? 'geel' : 'groen';
}

/* Vroegste openstaande stap-deadline (meest urgent). */
export function eersteOpenDeadline(b: BoringProces): string | null {
  let best: string | null = null;
  for (const s of ALLE_STAPPEN) {
    const sd = getStap(b, s.id);
    if (stapDone(sd) || sd.status === 'N.v.t.' || !sd.deadline) continue;
    if (best === null || sd.deadline < best) best = sd.deadline;
  }
  return best;
}

/* Stoplicht-rollup over een set boringen (project): rood > geel > groen. */
export function projectHealth(bors: BoringProces[]): Health {
  let geel = false;
  for (const b of bors) {
    if (b.vervallen) continue;
    const h = boringHealth(b);
    if (h === 'rood') return 'rood';
    if (h === 'geel') geel = true;
  }
  return geel ? 'geel' : 'groen';
}
