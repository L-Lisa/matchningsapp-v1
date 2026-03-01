// CV-textextraktion – mammoth.js (DOCX) + pdfjs-dist 3.x (PDF)

// pdfjs-dist 3.x: worker sätts via CDN eller lokal sökväg
// Vi sätter workerSrc dynamiskt för att undvika Vite-bundlingproblem

let pdfjsLib = null;

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    // Worker för pdfjs-dist 3.x
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.js',
      import.meta.url
    ).toString();
  }
  return pdfjsLib;
}

async function extractFromPdf(file) {
  const pdfjs = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const textParts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    textParts.push(pageText);
  }

  return textParts.join('\n\n').trim();
}

async function extractFromDocx(file) {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

const SUPPORTED_TYPES = {
  'application/pdf': extractFromPdf,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': extractFromDocx,
};

/**
 * Extraherar text från en PDF eller DOCX-fil.
 * Returnerar { text: string } vid framgång eller { error: string } vid fel.
 */
export async function extractCVText(file) {
  if (!file) return { error: 'Ingen fil vald' };

  const extractor = SUPPORTED_TYPES[file.type];
  if (!extractor) {
    const ext = file.name?.split('.').pop()?.toLowerCase();
    return {
      error: `Filformatet stöds inte. Ladda upp en PDF eller DOCX-fil (du laddade upp .${ext ?? file.type}).`,
    };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { error: 'Filen är för stor (max 10 MB)' };
  }

  try {
    const text = await extractor(file);
    if (!text || text.length < 10) {
      return { error: 'Kunde inte extrahera text från filen. Kontrollera att filen inte är skyddad eller tom.' };
    }
    return { text };
  } catch (err) {
    console.error('[cvExtraktion] Fel:', err);
    return { error: 'Ett fel uppstod vid textextraktion. Prova en annan fil.' };
  }
}
