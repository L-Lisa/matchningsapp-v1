import { supabase } from './supabaseClient.js';

// Hjälp: kasta tydligt fel vid Supabase-fel
function check(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

// ─── Deltagare ───────────────────────────────────────────────────────────────

export async function getDeltagare() {
  const { data, error } = await supabase.from('deltagare').select('*').order('slutdatum');
  check(error, 'Kunde inte hämta deltagare');
  return data;
}

export async function insertDeltagare(list) {
  const { error } = await supabase.from('deltagare').insert(list);
  check(error, 'Kunde inte spara deltagare');
}

export async function updateDeltagareById(id, fields) {
  const { error } = await supabase.from('deltagare').update(fields).eq('id', id);
  check(error, 'Kunde inte uppdatera deltagare');
}

// ─── CV ──────────────────────────────────────────────────────────────────────

export async function getAllCV() {
  const { data, error } = await supabase.from('cv').select('*');
  check(error, 'Kunde inte hämta CV');
  return data;
}

export async function insertCV(cvObj) {
  const { error } = await supabase.from('cv').insert(cvObj);
  check(error, 'Kunde inte spara CV');
}

export async function updateCVById(id, fields) {
  const { error } = await supabase.from('cv').update(fields).eq('id', id);
  check(error, 'Kunde inte uppdatera CV');
}

export async function deleteCVById(id) {
  const { error } = await supabase.from('cv').delete().eq('id', id);
  check(error, 'Kunde inte ta bort CV');
}

// ─── Tjänster ────────────────────────────────────────────────────────────────

export async function getTjanster() {
  const { data, error } = await supabase.from('tjanster').select('*').order('sorteringsordning');
  check(error, 'Kunde inte hämta tjänster');
  return data;
}

export async function insertTjanster(list) {
  const { error } = await supabase.from('tjanster').insert(list);
  check(error, 'Kunde inte spara tjänster');
}

export async function updateTjanstById(id, fields) {
  const { error } = await supabase.from('tjanster').update(fields).eq('id', id);
  check(error, 'Kunde inte uppdatera tjänst');
}

export async function deleteTjanstById(id) {
  const { error } = await supabase.from('tjanster').delete().eq('id', id);
  check(error, 'Kunde inte ta bort tjänst');
}

// ─── Matchningar ─────────────────────────────────────────────────────────────

export async function getMatchningar() {
  const { data, error } = await supabase.from('matchningar').select('*');
  check(error, 'Kunde inte hämta matchningar');
  return data;
}

export async function replaceMatchningarForRekryterare(rekryterare, newList) {
  const { error: delError } = await supabase
    .from('matchningar')
    .delete()
    .eq('rekryterare', rekryterare);
  check(delError, `Kunde inte rensa matchningar för ${rekryterare}`);

  if (newList.length > 0) {
    const { error: insError } = await supabase.from('matchningar').insert(newList);
    check(insError, `Kunde inte spara matchningar för ${rekryterare}`);
  }
}

export async function updateMatchningById(id, fields) {
  const { error } = await supabase.from('matchningar').update(fields).eq('id', id);
  check(error, 'Kunde inte uppdatera motivering');
}
