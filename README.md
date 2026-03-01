# CoachMatch

Privat matchningsverktyg för jobbcoacher inom ROM-programmet (Rusta och Matcha).
Matchar deltagare mot jobbannonser via AI (Claude) med Supabase som databas.

## Förkrav

- Node 18+
- Supabase-konto (gratis) – https://supabase.com
- Anthropic API-nyckel
- Vercel-konto (gratis) – https://vercel.com

## Setup

### 1. Skapa Supabase-projekt

1. Gå till https://supabase.com och skapa ett konto (gratis)
2. Klicka **"New project"** – välj ett namn, ett lösenord (spara det), och närmaste region (t.ex. Frankfurt)
3. Vänta tills projektet startat (ca 1 minut)
4. Gå till **SQL Editor** i vänstermenyn
5. Klistra in hela innehållet från `docs/supabase-schema.sql` och klicka **Run**
6. Gå till **Settings → API**
7. Kopiera **Project URL** och **anon / public key**

### 2. Lokal installation

```bash
npm install
npm install -g vercel

# Kopiera .env.example och fyll i dina värden
cp .env.example .env
```

Öppna `.env` och fyll i:
- `VITE_SUPABASE_URL` – Project URL från steg 1
- `VITE_SUPABASE_ANON_KEY` – anon key från steg 1
- `VITE_APP_SECRET` – slumpmässig lång sträng, generera med:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `VITE_APP_PASSWORD_HASH` – generera med:
  ```bash
  node -e "require('bcryptjs').hash('dittlösenord',10).then(console.log)"
  ```

### 3. Starta lokalt

```bash
vercel dev
```

> ⚠️ Använd **`vercel dev`** – inte `npm run dev`.
> `npm run dev` startar inte Claude-proxyn och AI-matchning fungerar inte.

### 4. Deploy till Vercel

```bash
vercel --prod
```

Lägg sedan till dessa miljövariabler i **Vercel Dashboard**:
- `ANTHROPIC_API_KEY` – din Anthropic-nyckel (`sk-ant-...`)
- `APP_SECRET` – samma värde som `VITE_APP_SECRET` i din `.env`

## Tester

```bash
npm test
```

## Teknikstack

- React 18 + Vite + Tailwind CSS
- Supabase (PostgreSQL) – databas
- Claude (`claude-sonnet-4-6`) via Vercel Serverless Function
- Lösenordsskydd med bcrypt
- Deploy: Vercel
