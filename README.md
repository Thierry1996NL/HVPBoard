# HVP Board

Dashboard voor projectbeheer en voortgang. Gebouwd met Next.js + React + Supabase.

## 🚀 Installatie & opstarten

### 1. Vereisten
- Node.js 18 of hoger
- Een Supabase project (gratis op [supabase.com](https://supabase.com))

### 2. Afhankelijkheden installeren
```bash
npm install
```

### 3. Omgevingsvariabelen instellen
Kopieer het voorbeeld bestand:
```bash
cp .env.example .env.local
```

Vul je Supabase gegevens in in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://jouw-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=jouw-anon-key
```

Je vindt deze waarden in Supabase onder **Project Settings → API**.

### 4. Lokaal starten
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Bouwen voor productie
```bash
npm run build
npm start
```

## 📐 Kolom-indices aanpassen

De fase-definities en kolom-indices in `src/lib/constants.ts` moeten overeenkomen
met je Supabase `werkpakketten.cel_data` structuur.

Pas de `FASEN` array aan met de juiste `statCols`, `wekenResterend` en `overgangsdatum`
indices voor jouw dataset.

## 🗄️ Supabase tabellen

De app verwacht de volgende tabellen:

| Tabel | Beschrijving |
|-------|-------------|
| `werkpakketten` | Hoofdtabel met projecten (row_idx, projectnaam, cel_data JSONB) |
| `boringen` | HDD-boringen per project |
| `duikers` | Duikers per project |
| `proefsleuven` | Proefsleuven per project |
| `omgevingsmanagement` | Omgevingsmanagement taken |
| `contactpersonen` | Contactpersonen per project |
| `ontwerp_lagen` | Ontwerpdocumenten per project |
| `opmerkingen` | Opmerkingen per project |

## 🏗️ Architectuur

```
src/
├── app/
│   ├── (dashboard)/       # Alle pagina's (geen login vereist)
│   │   ├── projecten/
│   │   ├── planning/
│   │   ├── analyse/
│   │   ├── boringen/
│   │   ├── duikers/
│   │   ├── proefsleuven/
│   │   └── omgevingsmanagement/
│   └── project/[id]/      # Project detail
├── components/
│   ├── layout/            # Sidebar, Header
│   └── ui/                # StatusBadge, Modal, ToastProvider
├── hooks/                 # useProjects, useModuleData
├── lib/                   # constants, utils, supabase client
└── types/                 # TypeScript typen
```

## 🚀 Deployen op Vercel

1. Push naar GitHub
2. Importeer in [Vercel](https://vercel.com)
3. Voeg de omgevingsvariabelen toe in Vercel project settings
4. Deploy!
