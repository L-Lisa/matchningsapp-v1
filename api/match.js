// Vercel Serverless Function – Claude proxy
// ANTHROPIC_API_KEY lever ENBART här (Vercel Dashboard), aldrig i frontend

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 300;
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callAnthropic(prompt, apiKey, attempt = 1) {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (response.status === 429 && attempt < MAX_RETRIES) {
    const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
    await sleep(delay);
    return callAnthropic(prompt, apiKey, attempt + 1);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Anthropic API svarade med ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text ?? '';
  if (!text) throw new Error('Tomt svar från Anthropic');
  return text;
}

export default async function handler(req, res) {
  // Tillåt bara POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metod ej tillåten' });
  }

  // Verifiera Bearer-token
  const authHeader = req.headers['authorization'] ?? '';
  const expectedSecret = process.env.APP_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return res.status(401).json({ error: 'Obehörig åtkomst' });
  }

  // Validera body
  const { prompt } = req.body ?? {};
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Fältet "prompt" saknas eller är tomt' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Serverkonfigurationsfel: API-nyckel saknas' });
  }

  try {
    const text = await callAnthropic(prompt.trim(), apiKey);
    return res.status(200).json({ text });
  } catch (err) {
    console.error('[api/match] Fel:', err.message);
    return res.status(502).json({
      error: 'Kunde inte hämta svar från AI. Försök igen om en stund.',
    });
  }
}
