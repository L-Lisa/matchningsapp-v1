import { v4 as uuidv4 } from 'uuid';
import { format, parseISO, isValid, differenceInWeeks } from 'date-fns';
import { sv } from 'date-fns/locale';

// UUID
export function generateId() {
  return uuidv4();
}

// Timestamp ISO (används vid DB-skrivning)
export function nowTimestamp() {
  return new Date().toISOString();
}

// Formatera datum för visning: "12 jul 2026"
export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (!isValid(d)) return dateStr;
    return format(d, 'd MMM yyyy', { locale: sv });
  } catch {
    return dateStr;
  }
}

// Antal veckor till slutdatum (negativt = passerat)
export function weeksUntil(dateStr) {
  if (!dateStr) return null;
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (!isValid(d)) return null;
    return differenceInWeeks(d, new Date());
  } catch {
    return null;
  }
}

// Trim med null-säkerhet
export function safeTrim(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

// Normalisera för jämförelse: trim + lowercase
export function normalize(value) {
  return safeTrim(value).toLowerCase();
}

// Boolean-parsing från Sheets (Sheets returnerar strängar)
export function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 'TRUE' || value === true || value === '1' || value === 1) return true;
  return false;
}

// Klassnamn-hjälp (enkel, ingen extern dep)
export function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Dela upp array i batches
export function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Sleep (för retry-logik)
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
