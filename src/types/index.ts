export type StatusValue =
  | 'Gereed'
  | 'Loopt'
  | 'Review'
  | 'Geblokkeerd'
  | 'Nog te starten'
  | '';

export type CelData = Record<string, string>;

export interface Werkpakket {
  id?: string;
  row_idx: number;
  projectnaam: string;
  cel_data: CelData;
  updated_at?: string;
  updated_by?: string;
}

export interface Contactpersoon {
  id: string;
  werkpakket_id: number;
  naam: string;
  functie?: string;
  organisatie?: string;
  email?: string;
  telefoon?: string;
  created_at: string;
}

export interface OntwerpLaag {
  id: string;
  werkpakket_id: number;
  naam: string;
  versie?: string;
  status?: string;
  opmerking?: string;
  created_at: string;
}

export interface Opmerking {
  id: string;
  werkpakket_id: number;
  tekst: string;
  auteur?: string;
  created_at: string;
}

export interface FaseDef {
  f: string;          // fase key (uniek ID)
  l: string;          // label (weergavenaam)
  statCols: number[]; // kolom-indices met statuswaarden
  wekenResterend: number;  // kolom-index voor weken resterend (0 = n.v.t.)
  overgangsdatum: number;  // kolom-index voor overgangsdatum (0 = n.v.t.)
}

export interface ColDef {
  i: number;   // kolom-index in cel_data
  n: string;   // naam / label
  f?: string;  // fase-sleutel (optioneel)
}
