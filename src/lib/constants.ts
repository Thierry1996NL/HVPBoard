import type { FaseDef, ColDef, StatusValue } from '@/types';

// ─── Status waarden ──────────────────────────────────────────────────────────
export const STATUS_VALUES: StatusValue[] = [
  'Gereed',
  'Loopt',
  'Review',
  'Geblokkeerd',
  'Nog te starten',
];

export function statusClass(s: string): string {
  if (s === 'Gereed') return 'G';
  if (s === 'Loopt') return 'L';
  if (s === 'Review') return 'R';
  if (s === 'Geblokkeerd') return 'B';
  return 'N';
}

// ─── Basiskolommen (altijd zichtbaar) ────────────────────────────────────────
// Kolom-indices 0–8 = project-stamgegevens
// Pas de indices aan op je eigen Supabase kolom-structuur!
export const BASE_COLS: ColDef[] = [
  { i: 0,  n: 'Proj.nr intern' },
  { i: 1,  n: 'Proj.nr extern' },
  { i: 2,  n: 'Projectnaam' },
  { i: 3,  n: 'APD Bouwdeel' },
  { i: 4,  n: 'Liander Tracédeel' },
  { i: 5,  n: 'WP nummer' },
  { i: 8,  n: 'Engineer' },
];

// ─── Fase-definities ─────────────────────────────────────────────────────────
// Pas statCols, wekenResterend en overgangsdatum aan op je eigen structuur.
// statCols   = de kolom-indices die een StatusValue bevatten voor deze fase
// wekenResterend = kolom-index met "weken resterend" tekst (0 = niet van toepassing)
// overgangsdatum = kolom-index met datum string (0 = niet van toepassing)
export const FASEN: FaseDef[] = [
  {
    f: 'analyse',
    l: 'Analyse',
    statCols: [10, 11, 12, 13, 14],
    wekenResterend: 20,
    overgangsdatum: 21,
  },
  {
    f: 'vo',
    l: 'VO',
    statCols: [25, 26, 27, 28, 29],
    wekenResterend: 30,
    overgangsdatum: 31,
  },
  {
    f: 'do',
    l: 'DO',
    statCols: [35, 36, 37, 38, 39],
    wekenResterend: 40,
    overgangsdatum: 41,
  },
  {
    f: 'onderzoek',
    l: 'Onderzoek',
    statCols: [45, 46, 47, 48],
    wekenResterend: 50,
    overgangsdatum: 51,
  },
  {
    f: 'uo',
    l: 'UO',
    statCols: [55, 56, 57, 58, 59],
    wekenResterend: 60,
    overgangsdatum: 61,
  },
  {
    f: 'natuur',
    l: 'Natuur',
    statCols: [65, 66, 67, 68],
    wekenResterend: 70,
    overgangsdatum: 71,
  },
  {
    f: 'archeologie',
    l: 'Archeologie',
    statCols: [75, 76, 77, 78],
    wekenResterend: 80,
    overgangsdatum: 81,
  },
  {
    f: 'bodem',
    l: 'Bodem',
    statCols: [85, 86, 87, 88],
    wekenResterend: 90,
    overgangsdatum: 91,
  },
  {
    f: 'nge',
    l: 'NGE',
    statCols: [95, 96, 97],
    wekenResterend: 100,
    overgangsdatum: 101,
  },
  {
    f: 'geo',
    l: 'Geo',
    statCols: [105, 106, 107, 108],
    wekenResterend: 110,
    overgangsdatum: 111,
  },
];

// ─── Alle kolom-definities (statuskolommen per fase) ─────────────────────────
export const COLS: ColDef[] = [
  // Analyse
  { i: 10, n: 'Tracé analyse',        f: 'analyse' },
  { i: 11, n: 'Stakeholderanalyse',   f: 'analyse' },
  { i: 12, n: 'Risicoanalyse',        f: 'analyse' },
  { i: 13, n: 'Kostenraming',         f: 'analyse' },
  { i: 14, n: 'GO/NoGO besluit',      f: 'analyse' },
  // VO
  { i: 25, n: 'Tracéontwerp VO',      f: 'vo' },
  { i: 26, n: 'Dwarsprofielen',       f: 'vo' },
  { i: 27, n: 'Grondbalans VO',       f: 'vo' },
  { i: 28, n: 'Raming VO',            f: 'vo' },
  { i: 29, n: 'Review VO',            f: 'vo' },
  // DO
  { i: 35, n: 'Tracéontwerp DO',      f: 'do' },
  { i: 36, n: 'Tekeningen DO',        f: 'do' },
  { i: 37, n: 'Bestek',               f: 'do' },
  { i: 38, n: 'Raming DO',            f: 'do' },
  { i: 39, n: 'Review DO',            f: 'do' },
  // Onderzoek
  { i: 45, n: 'Desk study',           f: 'onderzoek' },
  { i: 46, n: 'Veldonderzoek',        f: 'onderzoek' },
  { i: 47, n: 'Rapportage',           f: 'onderzoek' },
  { i: 48, n: 'Beoordeling',          f: 'onderzoek' },
  // UO
  { i: 55, n: 'Aanbesteding',         f: 'uo' },
  { i: 56, n: 'Gunning',              f: 'uo' },
  { i: 57, n: 'Uitvoering',           f: 'uo' },
  { i: 58, n: 'Oplevering',           f: 'uo' },
  { i: 59, n: 'Nazorg',               f: 'uo' },
  // Natuur
  { i: 65, n: 'Quickscan ecologie',   f: 'natuur' },
  { i: 66, n: 'Vervolgonderzoek',     f: 'natuur' },
  { i: 67, n: 'Natura 2000 toets',    f: 'natuur' },
  { i: 68, n: 'AERIUS berekening',    f: 'natuur' },
  // Archeologie
  { i: 75, n: 'Bureauonderzoek',      f: 'archeologie' },
  { i: 76, n: 'IVO fase 1',           f: 'archeologie' },
  { i: 77, n: 'Proefsleuven',         f: 'archeologie' },
  { i: 78, n: 'Definitief onderzoek', f: 'archeologie' },
  // Bodem
  { i: 85, n: 'Historisch onderzoek', f: 'bodem' },
  { i: 86, n: 'Verkennend bodem',     f: 'bodem' },
  { i: 87, n: 'Nader bodemonderzoek', f: 'bodem' },
  { i: 88, n: 'Saneringsplan',        f: 'bodem' },
  // NGE
  { i: 95, n: 'Quickscan NGE',        f: 'nge' },
  { i: 96, n: 'Detectieonderzoek',    f: 'nge' },
  { i: 97, n: 'Begeleiding',          f: 'nge' },
  // Geo
  { i: 105, n: 'Grondonderzoek',      f: 'geo' },
  { i: 106, n: 'Grondwateronderzoek', f: 'geo' },
  { i: 107, n: 'Geotechnisch advies', f: 'geo' },
  { i: 108, n: 'Sondeerrapport',      f: 'geo' },
];
