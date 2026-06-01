import type { CelData, FaseDef } from '@/types';

/** Geeft de projectnaam terug (kolom 2, anders rij-label) */
export function getProjectNaam(cd: CelData, rowIdx?: number): string {
  return cd['2'] || (rowIdx !== undefined ? `Project ${rowIdx}` : 'Onbekend project');
}

/** Geeft de engineer terug (kolom 8) */
export function getEngineer(cd: CelData): string {
  return cd['8'] ?? '';
}

/** Berekent de voortgang als percentage op basis van gegeven status-kolommen */
export function getProgressPercent(cd: CelData, statCols: number[]): number {
  if (!statCols.length) return 0;
  const done = statCols.filter(i => cd[String(i)] === 'Gereed').length;
  return Math.round((done / statCols.length) * 100);
}

/** Bepaalt de overkoepelende projectstatus op basis van alle statuskolommen */
export function getProjectStatus(cd: CelData): string {
  const vals = Object.values(cd).filter(v =>
    ['Gereed', 'Loopt', 'Review', 'Geblokkeerd', 'Nog te starten'].includes(v)
  );
  if (!vals.length) return '';
  if (vals.some(v => v === 'Geblokkeerd')) return 'Geblokkeerd';
  if (vals.some(v => v === 'Loopt')) return 'Loopt';
  if (vals.some(v => v === 'Review')) return 'Review';
  if (vals.every(v => v === 'Gereed')) return 'Gereed';
  return 'Nog te starten';
}

/** Berekent het aantal weken resterend vanuit een datumstring (bijv. "15-08-2025") */
export function wekenResterend(val?: string): number | null {
  if (!val) return null;
  // Probeer NL-formaat dd-mm-yyyy en ISO yyyy-mm-dd
  let date: Date | null = null;
  const nlMatch = val.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (nlMatch) {
    date = new Date(
      parseInt(nlMatch[3]),
      parseInt(nlMatch[2]) - 1,
      parseInt(nlMatch[1])
    );
  } else {
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) date = parsed;
  }
  if (!date || isNaN(date.getTime())) return null;
  const diff = date.getTime() - Date.now();
  return Math.round(diff / (1000 * 60 * 60 * 24 * 7));
}

/** Berekent de gezondheidskleur van een project voor een bepaalde fase */
export function calcHealth(cd: CelData, fase: FaseDef): 'groen' | 'oranje' | 'rood' | 'grijs' {
  const vals = fase.statCols.map(i => cd[String(i)] ?? '');
  const filled = vals.filter(v => v !== '');
  if (!filled.length) return 'grijs';

  const geblokkeerd = vals.filter(v => v === 'Geblokkeerd').length;
  const loopt = vals.filter(v => v === 'Loopt').length;
  const gereed = vals.filter(v => v === 'Gereed').length;

  if (geblokkeerd > 0) return 'rood';

  // Controleer deadline als wekenResterend beschikbaar is
  if (fase.wekenResterend > 0) {
    const wk = wekenResterend(cd[String(fase.wekenResterend)]);
    if (wk !== null) {
      if (wk < 0) return 'rood';
      if (wk <= 4 && gereed < fase.statCols.length) return 'oranje';
    }
  }

  if (gereed === fase.statCols.length) return 'groen';
  if (loopt > 0) return 'oranje';
  return 'groen';
}

/** Formatteer een datum string voor weergave */
export function formatDate(val?: string): string {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('nl-NL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}
