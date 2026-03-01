# CoachMatch v1 – Product Requirements Document

**Version:** 1.5
**Datum:** Mars 2026

---

## 1. Produktöversikt

CoachMatch är en privat webbapp för jobbcoachen Lisa som arbetar inom ROM-programmet (Rusta och Matcha). Appen matchar hennes 50–60 deltagare mot jobbannonser från 4 rekryterare varje vecka.

### Kärnflöde
1. Lisa klistrar in deltagarlista (namn + slutdatum) från Excel
2. Nya deltagare identifieras – Lisa laddar upp CV per ny deltagare
3. Lisa klistrar in rekryterarnas tjänstelistor (företag, tjänst, krav)
4. Lisa klickar "Kör matchning" – Claude matchar via säker server-proxy
5. Lisa granskar och redigerar AI-motiveringar vid behov
6. Lisa kopierar färdig lista per rekryterare från exportvyn

---

## 2. Tech Stack

| Del | Val |
|---|---|
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| Styling | Tailwind CSS |
| Databas | Supabase (PostgreSQL, gratis tier) |
| AI-proxy | Vercel Serverless Function (`api/match.js`) |
| Auth | bcryptjs lösenord (sessionStorage) |
| CV-extraktion | mammoth.js (DOCX) + pdfjs-dist 3.x (PDF) |
| Deploy | Vercel (gratis hobby-plan) |
| Git | GitHub |

### Dependencies (`package.json`)

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.22.0",
    "@supabase/supabase-js": "^2.x",
    "mammoth": "^1.7.0",
    "pdfjs-dist": "^3.11.174",
    "bcryptjs": "^2.4.3",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.363.0",
    "uuid": "^9.0.0"
  }
}
```

---

## 3. Miljövariabler

**I `.env` lokalt** (aldrig i git):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_PASSWORD_HASH=
VITE_APP_SECRET=
```

**I Vercel Dashboard** (aldrig i kod, aldrig i git):
```
ANTHROPIC_API_KEY=sk-ant-...
APP_SECRET=samma värde som VITE_APP_SECRET
```

**`.env.example`** (i git, tomma värden):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_PASSWORD_HASH=
VITE_APP_SECRET=
```

---

## 4. Vercel-konfiguration (`vercel.json`)

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "functions": {
    "api/*.js": { "runtime": "nodejs18.x" }
  }
}
```

---

## 5. Claude API-proxy (`api/match.js`)

All kommunikation med Anthropic går via Vercel Serverless Function. `ANTHROPIC_API_KEY` lever enbart i Vercel Dashboard. Frontend anropar `/api/match` med `fetch()`.

- Accepterar POST med `{ prompt: string }` i body
- Verifierar `Authorization: Bearer ${APP_SECRET}` header
- Anropar Anthropic med `claude-sonnet-4-6`, max 300 tokens
- Returnerar `{ text: string }`
- 3 retries med exponential backoff vid 429

---

## 6. Autentisering

### Lösenordsskydd
- Lösenordet bcrypt-hashas och jämförs mot `VITE_APP_PASSWORD_HASH`
- Session i sessionStorage – lever tills webbläsaren stängs

### Route-skydd
Alla routes utom `/` är skyddade via `PrivateRoute`.

**Routes:**
```
/               → Login (publik)
/dashboard      → Dashboard (skyddad)
/deltagare      → Deltagare (skyddad)
/rekryterare    → Rekryterare (skyddad)
/matchning      → Matchning (skyddad)
/export         → Export (skyddad)
/installningar  → Inställningar (skyddad)
```

---

## 7. Supabase Databasstruktur

Schema finns i `docs/supabase-schema.sql`.

### Tabell: `deltagare`
| Kolumn | Typ |
|---|---|
| id | UUID PK |
| visningsnamn | TEXT |
| slutdatum | DATE |
| fritext | TEXT |
| aktiv | BOOLEAN |
| arkivdatum | TIMESTAMPTZ |
| matchraknare | INTEGER |
| kategori_restaurang | BOOLEAN |
| kategori_stad | BOOLEAN |
| kategori_truckkort | BOOLEAN |
| kategori_nystartsjobb | BOOLEAN |
| kategori_bkorkort | BOOLEAN |
| kategori_extra_1 | BOOLEAN |
| kategori_extra_1_namn | TEXT |
| skapad | TIMESTAMPTZ |
| uppdaterad | TIMESTAMPTZ |

### Tabell: `cv`
| Kolumn | Typ |
|---|---|
| id | UUID PK |
| deltagare_id | UUID FK |
| rubrik | TEXT |
| cv_text | TEXT |
| skapad | TIMESTAMPTZ |
| uppdaterad | TIMESTAMPTZ |

Max 4 CV per deltagare.

### Tabell: `tjanster`
| Kolumn | Typ |
|---|---|
| id | UUID PK |
| rekryterare | TEXT |
| foretag | TEXT |
| tjanst | TEXT |
| krav | TEXT |
| aktiv | BOOLEAN |
| sorteringsordning | INTEGER |
| skapad | TIMESTAMPTZ |
| uppdaterad | TIMESTAMPTZ |

### Tabell: `matchningar`
| Kolumn | Typ |
|---|---|
| id | UUID PK |
| deltagare_id | UUID |
| tjanst_id | UUID |
| rekryterare | TEXT |
| ai_motivering | TEXT |
| ai_motivering_redigerad | BOOLEAN |
| korning_datum | TIMESTAMPTZ |
| ny_denna_korning | BOOLEAN |

**Matchningslogik:** Vid ny körning för en rekryterare raderas alla befintliga matchningar för den rekryteraren och ersätts med nya.

---

## 8–16. (Se tidigare sektioner – oförändrade)

Se PRD v1.4 för: CV-extraktion, Import-parsning, Matchningslogik, Appvyer, Exportformat, Designsystem, Filstruktur.

---

## Ändringslogg

| Version | Datum | Ändring |
|---|---|---|
| 1.0 | Mars 2026 | Initial spec |
| 1.1 | Mars 2026 | OAuth→PKCE, Vercel proxy, CV-extraktion, separat exportvy, redigerbara motiveringar, arkiveringsflöde |
| 1.2 | Mars 2026 | vercel.json specificerad, batch-writes, responsiv layout, tom-state texter, trim-logik, spara per rekryterare |
| 1.3 | Mars 2026 | Dependencies med versioner, pdfjs-dist→3.x, borttaget SDK, förenklad kod |
| 1.4 | Mars 2026 | vercel dev förtydligat, pdfjs worker i vite.config, importpaneler vikbara, matchningar ersätts vid ny körning |
| 1.5 | Mars 2026 | Bytt lagring från Google Sheets till Supabase (PostgreSQL). Bytt auth från Google OAuth + lösenord till enbart bcrypt-lösenord. Borttaget @react-oauth/google. Förenklat Login-flöde. |
