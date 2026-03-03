// Vercel Serverless Function – proxy för Arbetsförmedlingens JobSearch API
// Körs server-side för att undvika CORS-problem

const AF_API = 'https://jobsearch.api.jobtechdev.se/search';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metod ej tillåten' });
  }

  const authHeader = req.headers['authorization'] ?? '';
  const expectedSecret = process.env.APP_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return res.status(401).json({ error: 'Obehörig åtkomst' });
  }

  const { query } = req.body ?? {};
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Fältet "query" saknas' });
  }

  try {
    const url = `${AF_API}?q=${encodeURIComponent(query.trim())}&limit=15&offset=0`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return res.status(502).json({ error: `AF API svarade med ${response.status}` });
    }

    const data = await response.json();

    const jobs = (data.hits ?? []).map((job) => {
      const mustHaveSkills = (job.must_have?.skills ?? []).map((s) => s.label).filter(Boolean);
      const mustHaveLangs = (job.must_have?.languages ?? []).map((l) => l.label).filter(Boolean);
      return {
        id: job.id,
        headline: job.headline ?? '',
        employer: job.employer?.name ?? '',
        municipality: job.workplace_address?.municipality ?? '',
        description: (job.description?.text ?? '').substring(0, 1500),
        url: job.webpage_url ?? `https://arbetsformedlingen.se/platsbanken/annonser/${job.id}`,
        drivingLicenseRequired: job.driving_license_required ?? false,
        experienceRequired: job.experience_required ?? false,
        workingHours: job.working_hours_type?.label ?? '',
        duration: job.duration?.label ?? '',
        mustHave: [...mustHaveSkills, ...mustHaveLangs],
        applicationDeadline: job.application_deadline ?? '',
      };
    });

    return res.status(200).json({ jobs });
  } catch (err) {
    console.error('[api/af-jobs] Fel:', err.message);
    return res.status(502).json({ error: 'Kunde inte hämta jobb från AF.' });
  }
}
