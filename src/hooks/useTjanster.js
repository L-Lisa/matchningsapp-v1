import { useState, useCallback } from 'react';
import { getTjanster, addTjanster, updateAllTjanster } from '../lib/sheetsService.js';
import { parseTjansterText, mergeTjanster } from '../lib/parseImport.js';
import { nowTimestamp, parseBoolean, toSheetsBoolean } from '../lib/utils.js';

export const REKRYTERARE = ['Petra', 'Nancy', 'Julia', 'Nikola'];

export function useTjanster() {
  const [tjanster, setTjanster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTjanster();
      setTjanster(data);
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

    const existing = tjanster.filter(
      (t) => t.rekryterare === rekryterare
    );
    const { added, updated, deactivated, unchanged } = mergeTjanster(rows, existing, rekryterare);

    const all = await getTjanster();
    const now = nowTimestamp();

    let patched = all.map((t) => {
      if (deactivated.includes(t.id)) {
        return { ...t, aktiv: toSheetsBoolean(false), uppdaterad: now };
      }
      const upd = updated.find((u) => u.id === t.id);
      if (upd) {
        return { ...t, krav: upd.krav, uppdaterad: now };
      }
      return t;
    });

    if (added.length > 0) {
      await addTjanster(added);
      patched = await getTjanster();
    } else {
      await updateAllTjanster(patched);
    }

    await load();
    return {
      success: true,
      added: added.length,
      updated: updated.length,
      deactivated: deactivated.length,
      unchanged,
      errors,
    };
  }, [tjanster, load]);

  const reaktiveraTjanst = useCallback(async (id) => {
    const all = await getTjanster();
    const patched = all.map((t) =>
      t.id === id ? { ...t, aktiv: toSheetsBoolean(true), uppdaterad: nowTimestamp() } : t
    );
    await updateAllTjanster(patched);
    await load();
  }, [load]);

  function getTjansterForRekryterare(rekryterare) {
    return tjanster.filter((t) => t.rekryterare === rekryterare);
  }

  function getAktiva() {
    return tjanster.filter((t) => parseBoolean(t.aktiv));
  }

  return {
    tjanster,
    loading,
    error,
    load,
    importTjanster,
    reaktiveraTjanst,
    getTjansterForRekryterare,
    getAktiva,
  };
}
