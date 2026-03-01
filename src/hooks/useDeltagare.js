import { useState, useCallback } from 'react';
import {
  getDeltagare, addDeltagare, updateDeltagare,
  getAllCV, addCV, updateAllCV,
} from '../lib/sheetsService.js';
import { parseDeltagareText, mergeDeltagare } from '../lib/parseImport.js';
import { generateId, nowTimestamp, parseBoolean, toSheetsBoolean } from '../lib/utils.js';

export function useDeltagare() {
  const [deltagare, setDeltagare] = useState([]);
  const [cvData, setCvData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, c] = await Promise.all([getDeltagare(), getAllCV()]);
      setDeltagare(d);
      setCvData(c);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const importDeltagare = useCallback(async (text) => {
    const { rows, errors } = parseDeltagareText(text);
    if (errors.length > 0 && rows.length === 0) {
      return { success: false, errors };
    }

    const aktiva = deltagare.filter((d) => parseBoolean(d.aktiv));
    const { added, updated, unchanged } = mergeDeltagare(rows, aktiva);

    // Lägg till nya
    if (added.length > 0) await addDeltagare(added);

    // Uppdatera slutdatum för befintliga
    if (updated.length > 0) {
      const updatedMap = new Map(updated.map((u) => [u.id, u]));
      const all = await getDeltagare();
      const patched = all.map((d) =>
        updatedMap.has(d.id)
          ? { ...d, slutdatum: updatedMap.get(d.id).slutdatum, uppdaterad: nowTimestamp() }
          : d
      );
      await updateDeltagare(patched);
    }

    await load();
    return { success: true, added: added.length, updated: updated.length, unchanged, errors };
  }, [deltagare, load]);

  const arkiveraDeltagare = useCallback(async (id) => {
    const all = await getDeltagare();
    const patched = all.map((d) =>
      d.id === id
        ? { ...d, aktiv: toSheetsBoolean(false), arkivdatum: nowTimestamp(), uppdaterad: nowTimestamp() }
        : d
    );
    await updateDeltagare(patched);
    await load();
  }, [load]);

  const updateFritext = useCallback(async (id, fritext) => {
    const all = await getDeltagare();
    const patched = all.map((d) =>
      d.id === id ? { ...d, fritext, uppdaterad: nowTimestamp() } : d
    );
    await updateDeltagare(patched);
    setDeltagare(patched);
  }, []);

  const updateKategorier = useCallback(async (id, kategorier) => {
    const all = await getDeltagare();
    const patched = all.map((d) =>
      d.id === id ? { ...d, ...kategorier, uppdaterad: nowTimestamp() } : d
    );
    await updateDeltagare(patched);
    setDeltagare(patched);
  }, []);

  const resetMatchraknare = useCallback(async (id) => {
    const all = await getDeltagare();
    const patched = all.map((d) =>
      d.id === id ? { ...d, matchraknare: 0, uppdaterad: nowTimestamp() } : d
    );
    await updateDeltagare(patched);
    setDeltagare(patched);
  }, []);

  const saveCv = useCallback(async (deltagareId, rubrik, cvText, existingCvId = null) => {
    const all = await getAllCV();
    const now = nowTimestamp();

    if (existingCvId) {
      const patched = all.map((c) =>
        c.id === existingCvId ? { ...c, rubrik, cv_text: cvText, uppdaterad: now } : c
      );
      await updateAllCV(patched);
    } else {
      const deltagaresCv = all.filter((c) => c.deltagare_id === deltagareId);
      if (deltagaresCv.length >= 4) {
        throw new Error('Max 4 CV per deltagare');
      }
      await addCV({
        id: generateId(),
        deltagare_id: deltagareId,
        rubrik,
        cv_text: cvText,
        skapad: now,
        uppdaterad: now,
      });
    }

    const updated = await getAllCV();
    setCvData(updated);
  }, []);

  const deleteCv = useCallback(async (cvId) => {
    const all = await getAllCV();
    await updateAllCV(all.filter((c) => c.id !== cvId));
    const updated = await getAllCV();
    setCvData(updated);
  }, []);

  function getCvForDeltagare(deltagareId) {
    return cvData.filter((c) => c.deltagare_id === deltagareId);
  }

  return {
    deltagare,
    cvData,
    loading,
    error,
    load,
    importDeltagare,
    arkiveraDeltagare,
    updateFritext,
    updateKategorier,
    resetMatchraknare,
    saveCv,
    deleteCv,
    getCvForDeltagare,
  };
}
