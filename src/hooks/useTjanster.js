import { useState, useCallback } from 'react';
import { getTjanster, insertTjanster, updateTjanstById, deleteTjanstById } from '../lib/supabaseService.js';
import { parseTjansterText, mergeTjanster } from '../lib/parseImport.js';
import { nowTimestamp } from '../lib/utils.js';

export const REKRYTERARE = ['Petra', 'Nancy', 'Julia', 'Nikola'];

export function useTjanster() {
  const [tjanster, setTjanster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTjanster(await getTjanster());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const importTjanster = useCallback(async (text, rekryterare) => {
    const { rows, errors } = parseTjansterText(text);
    if (errors.length > 0 && rows.length === 0) {
      return { success: false, errors };
    }

    const existing = tjanster.filter((t) => t.rekryterare === rekryterare);
    const { added, updated, deactivated, unchanged } = mergeTjanster(rows, existing, rekryterare);

    if (added.length > 0) await insertTjanster(added);

    for (const u of updated) {
      await updateTjanstById(u.id, { krav: u.krav, uppdaterad: nowTimestamp() });
    }
    for (const id of deactivated) {
      await updateTjanstById(id, { aktiv: false, uppdaterad: nowTimestamp() });
    }

    await load();
    return { success: true, added: added.length, updated: updated.length, deactivated: deactivated.length, unchanged, errors };
  }, [tjanster, load]);

  const reaktiveraTjanst = useCallback(async (id) => {
    await updateTjanstById(id, { aktiv: true, uppdaterad: nowTimestamp() });
    await load();
  }, [load]);

  const updateTjanst = useCallback(async (id, fields) => {
    await updateTjanstById(id, { ...fields, uppdaterad: nowTimestamp() });
    setTjanster((prev) => prev.map((t) => t.id === id ? { ...t, ...fields } : t));
  }, []);

  const deleteTjanst = useCallback(async (id) => {
    await deleteTjanstById(id);
    setTjanster((prev) => prev.filter((t) => t.id !== id));
  }, []);

  function getTjansterForRekryterare(rekryterare) {
    return tjanster.filter((t) => t.rekryterare === rekryterare);
  }

  function getAktiva() {
    return tjanster.filter((t) => t.aktiv);
  }

  return { tjanster, loading, error, load, importTjanster, reaktiveraTjanst, updateTjanst, deleteTjanst, getTjansterForRekryterare, getAktiva };
}
