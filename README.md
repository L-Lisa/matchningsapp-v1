# CoachMatch

Privat matchningsverktyg för jobbcoacher inom ROM-programmet (Rusta och Matcha).
Matchar deltagare mot jobbannonser via AI (Claude) med Google Sheets som lagring.

## Förkrav

- Node 18+
- Gmail-konto (för Google Sheets-lagring)
- Anthropic API-nyckel
- Vercel-konto (gratis) – https://vercel.com

## Setup

### 1. Google Cloud OAuth

1. Gå till https://console.cloud.google.com
2. Skapa ett nytt projekt
3. Aktivera **Google Sheets API** under "APIs & Services"
4. Gå till "APIs & Services" → "Credentials" → "Create Credentials" → "OAuth Client ID"
5. Välj "Web Application"
6. Lägg till Authorized JavaScript Origins:
   - `http://localhost:5173`
   - `https://din-app.vercel.app` (lägg till efter deploy)
7. Kopiera **Client ID**

### 2. Google Sheet-setup

1. Öppna ett nytt Google Sheet: https://sheets.google.com
2. Gå till **Verktyg → Apps Script**
3. Klistra in koden från `docs/setup-sheet.js` i detta repo
4. Klicka **Kör → setupCoachMatchSheet**
5. Kopiera Sheet-ID från URL:en (strängen mellan `/d/` och `/edit`)

### 3. Lokal installation

```bash
npm install
npm install -g vercel

# Kopiera .env.example och fyll i dina värden
cp .env.example .env
```

Öppna `.env` och fyll i:
- `VITE_GOOGLE_CLIENT_ID` – från steg 1
- `VITE_GOOGLE_SHEET_ID` – från steg 2
- `VITE_APP_SECRET` – slumpmässig lång sträng (generera med `openssl rand -hex 32`)
- `VITE_APP_PASSWORD_HASH` – generera med:
  ```bash
  node -e "require('bcryptjs').hash('dittlösenord',10).then(console.log)"
  ```

### 4. Starta lokalt

```bash
vercel dev
```

> ⚠️ Använd **`vercel dev`** – inte `npm run dev`.
> `npm run dev` startar inte Claude-proxyn och AI-matchning fungerar inte.

### 5. Deploy till Vercel

```bash
vercel --prod
```

Lägg sedan till dessa miljövariabler i **Vercel Dashboard**:
- `ANTHROPIC_API_KEY` – din Anthropic-nyckel (`sk-ant-...`)
- `APP_SECRET` – samma värde som `VITE_APP_SECRET` i din `.env`

Glöm inte att lägga till din Vercel-URL i Google Cloud OAuth authorized origins.

## Tester

```bash
npm test
```

## Teknikstack

- React 18 + Vite + Tailwind CSS
- Google Sheets API v4 (lagring)
- Claude (`claude-sonnet-4-6`) via Vercel Serverless Function
- Google OAuth 2.0 med PKCE
- Deploy: Vercel
