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

export async function deleteTjansterByRekryterare(rekryterare) {
  const { error } = await supabase.from('tjanster').delete().eq('rekryterare', rekryterare);
  check(error, 'Kunde inte rensa tjänster');
}

// ─── Matchningar ─────────────────────────────────────────────────────────────

export async function getMatchningar() {
  const { data, error } = await supabase.from('matchningar').select('*');
  check(error, 'Kunde inte hämta matchningar');
  return data;
}

/**
 * Smart replace av matchningar för en rekryterare.
 *
 * - Tar bort matchningar som inte längre finns i newList
 * - Sätter in genuint nya matchningar (nytt id)
 * - Uppdaterar befintliga icke-redigerade med ny AI-motivering
 * - Lämnar redigerade matchningar (ai_motivering_redigerad=true) helt orörda
 */
export async function replaceMatchningarForRekryterare(rekryterare, newList) {
  // Hämta befintliga matchningar för denna rekryterare
  const { data: current, error: fetchErr } = await supabase
    .from('matchningar')
    .select('id, deltagare_id, tjanst_id')
    .eq('rekryterare', rekryterare);
  check(fetchErr, 'Kunde inte hämta befintliga matchningar');

  const currentById = new Map((current ?? []).map((m) => [m.id, m]));
  const newIds = new Set(newList.map((m) => m.id));

  // 1. Ta bort matchningar som inte längre finns i resultatet
  const toDeleteIds = [...currentById.keys()].filter((id) => !newIds.has(id));
  if (toDeleteIds.length > 0) {
    const { error } = await supabase.from('matchningar').delete().in('id', toDeleteIds);
    check(error, 'Kunde inte ta bort gamla matchningar');
  }

  // 2. Sätt in genuint nya matchningar (id finns inte i DB)
  const toInsert = newList.filter((m) => !currentById.has(m.id));
  if (toInsert.length > 0) {
    const { error } = await supabase.from('matchningar').insert(toInsert);
    check(error, 'Kunde inte spara nya matchningar');
  }

  // 3. Uppdatera befintliga icke-redigerade med ny motivering och nytt datum
  //    Redigerade (ai_motivering_redigerad=true) lämnas oförändrade i DB
  const toUpdate = newList.filter(
    (m) => currentById.has(m.id) && !m.ai_motivering_redigerad
  );
  for (const m of toUpdate) {
    const { error } = await supabase
      .from('matchningar')
      .update({ ai_motivering: m.ai_motivering, korning_datum: m.korning_datum })
      .eq('id', m.id);
    check(error, 'Kunde inte uppdatera matchning');
  }
}

export async function updateMatchningById(id, fields) {
  const { error } = await supabase.from('matchningar').update(fields).eq('id', id);
  check(error, 'Kunde inte uppdatera motivering');
}

export async function insertMatchning(matchning) {
  const { error } = await supabase.from('matchningar').insert([matchning]);
  check(error, 'Kunde inte lägga till matchning');
}

export async function deleteMatchningById(id) {
  const { error } = await supabase.from('matchningar').delete().eq('id', id);
  check(error, 'Kunde inte ta bort matchning');
}
