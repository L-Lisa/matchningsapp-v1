-- CoachMatch – Supabase schema
-- Kör detta i Supabase Dashboard → SQL Editor

-- Deltagare
CREATE TABLE IF NOT EXISTS deltagare (
  id                    UUID PRIMARY KEY,
  visningsnamn          TEXT NOT NULL,
  slutdatum             DATE,
  fritext               TEXT DEFAULT '',
  aktiv                 BOOLEAN DEFAULT TRUE,
  arkivdatum            TIMESTAMPTZ,
  matchraknare          INTEGER DEFAULT 0,
  kategori_restaurang   BOOLEAN DEFAULT FALSE,
  kategori_stad         BOOLEAN DEFAULT FALSE,
  kategori_truckkort    BOOLEAN DEFAULT FALSE,
  kategori_nystartsjobb BOOLEAN DEFAULT FALSE,
  kategori_bkorkort     BOOLEAN DEFAULT FALSE,
  kategori_extra_1      BOOLEAN DEFAULT FALSE,
  kategori_extra_1_namn TEXT DEFAULT '',
  skapad                TIMESTAMPTZ DEFAULT NOW(),
  uppdaterad            TIMESTAMPTZ DEFAULT NOW()
);

-- CV
CREATE TABLE IF NOT EXISTS cv (
  id           UUID PRIMARY KEY,
  deltagare_id UUID REFERENCES deltagare(id) ON DELETE CASCADE,
  rubrik       TEXT NOT NULL,
  cv_text      TEXT NOT NULL,
  skapad       TIMESTAMPTZ DEFAULT NOW(),
  uppdaterad   TIMESTAMPTZ DEFAULT NOW()
);

-- Tjänster
CREATE TABLE IF NOT EXISTS tjanster (
  id                UUID PRIMARY KEY,
  rekryterare       TEXT NOT NULL,
  foretag           TEXT NOT NULL,
  tjanst            TEXT NOT NULL,
  krav              TEXT DEFAULT '',
  aktiv             BOOLEAN DEFAULT TRUE,
  sorteringsordning INTEGER DEFAULT 0,
  skapad            TIMESTAMPTZ DEFAULT NOW(),
  uppdaterad        TIMESTAMPTZ DEFAULT NOW()
);

-- Matchningar
CREATE TABLE IF NOT EXISTS matchningar (
  id                    UUID PRIMARY KEY,
  deltagare_id          UUID,
  tjanst_id             UUID,
  rekryterare           TEXT NOT NULL,
  ai_motivering         TEXT DEFAULT '',
  ai_motivering_redigerad BOOLEAN DEFAULT FALSE,
  korning_datum         TIMESTAMPTZ DEFAULT NOW(),
  ny_denna_korning      BOOLEAN DEFAULT FALSE
);

-- Tillåt anon-nyckel att läsa/skriva (appen skyddar med lösenord)
ALTER TABLE deltagare   DISABLE ROW LEVEL SECURITY;
ALTER TABLE cv          DISABLE ROW LEVEL SECURITY;
ALTER TABLE tjanster    DISABLE ROW LEVEL SECURITY;
ALTER TABLE matchningar DISABLE ROW LEVEL SECURITY;
