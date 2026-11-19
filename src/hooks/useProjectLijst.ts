'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CelData } from '@/types';

/**
 * Projectlijst voor de tabs bovenaan (Boringen, Intake) en de project-dropdowns.
 *
 * De vaste lijst (`basis`) blijft leidend voor bekende projecten (fase, case, PL, sortering),
 * maar elk project dat via 'Nieuw project' in de tabel `werkpakketten` is toegevoegd komt
 * er automatisch bij. `werkpakketten.row_idx` === `boringen.werkpakket_id`.
 * Gearchiveerde projecten en de interne '__config__'-rij worden overgeslagen.
 */
export interface ProjectBasis {
  wp: number;
  naam: string;
  fase?: string;
  case?: string;
  pl?: string;
  sorteerOpBoornr?: boolean;
}

interface WpRij { row_idx: number; projectnaam: string | null; cel_data: CelData | null }

export function useProjectLijst<T extends ProjectBasis>(
  basis: T[],
  maakNieuw: (r: { wp: number; naam: string; case: string; pl: string }) => T,
): T[] {
  const [rijen, setRijen] = useState<WpRij[]>([]);

  useEffect(() => {
    let actief = true;
    createClient()
      .from('werkpakketten')
      .select('row_idx, projectnaam, cel_data')
      .order('row_idx', { ascending: true })
      .then(({ data, error }) => {
        if (error) { console.error('Fout bij laden projecten:', error); return; }
        if (actief) setRijen((data ?? []) as unknown as WpRij[]);
      });
    return () => { actief = false; };
  }, []);

  return useMemo(() => {
    const lijst = [...basis];
    const bekend = new Set(basis.map(p => p.wp));
    for (const r of rijen) {
      const cd = r.cel_data ?? {};
      const naam = (cd['2'] || r.projectnaam || '').trim();
      if (!naam || naam === '__config__' || r.projectnaam === '__config__') continue;
      if (cd['archief'] === '1') continue;
      if (bekend.has(r.row_idx)) continue;
      bekend.add(r.row_idx);
      lijst.push(maakNieuw({
        wp: r.row_idx,
        naam,
        case: (cd['1'] || '—').trim() || '—',
        pl: (cd['179'] || cd['8'] || '—').trim() || '—',
      }));
    }
    return lijst;
    // maakNieuw is een stabiele mapper; alleen basis/rijen bepalen de uitkomst.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basis, rijen]);
}
