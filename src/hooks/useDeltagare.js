import { useState, useCallback } from 'react';
import {
  getDeltagare, insertDeltagare, updateDeltagareById,
  getAllCV, insertCV, updateCVById, deleteCVById,
} from '../lib/supabaseService.js';
import { parseDeltagareText, mergeDeltagare } from '../lib/parseImport.js';
import { generateId, nowTimestamp } from '../lib/utils.js';

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

    const aktiva = deltagare.filter((d) => d.aktiv);
    const { added, updated, unchanged } = mergeDeltagare(rows, aktiva);

    if (added.length > 0) await insertDeltagare(added);

    for (const u of updated) {
      await updateDeltagareById(u.id, { slutdatum: u.slutdatum, uppdaterad: nowTimestamp() });
    }

    await load();
    return { success: true, added: added.length, updated: updated.length, unchanged, errors };
  }, [deltagare, load]);

  const arkiveraDeltagare = useCallback(async (id) => {
    await updateDeltagareById(id, { aktiv: false, arkivdatum: nowTimestamp(), uppdaterad: nowTimestamp() });
    await load();
  }, [load]);

  const updateFritext = useCallback(async (id, fritext) => {
    await updateDeltagareById(id, { fritext, uppdaterad: nowTimestamp() });
    setDeltagare((prev) => prev.map((d) => d.id === id ? { ...d, fritext } : d));
  }, []);

  const updateKategorier = useCallback(async (id, kategorier) => {
    await updateDeltagareById(id, { ...kategorier, uppdaterad: nowTimestamp() });
    setDeltagare((prev) => prev.map((d) => d.id === id ? { ...d, ...kategorier } : d));
  }, []);

  const resetMatchraknare = useCallback(async (id) => {
    await updateDeltagareById(id, { matchraknare: 0, uppdaterad: nowTimestamp() });
    setDeltagare((prev) => prev.map((d) => d.id === id ? { ...d, matchraknare: 0 } : d));
  }, []);

  const saveCv = useCallback(async (deltagareId, rubrik, cvText, existingCvId = null) => {
    const now = nowTimestamp();
    if (existingCvId) {
      await updateCVById(existingCvId, { rubrik, cv_text: cvText, uppdaterad: now });
    } else {
      const deltagaresCv = cvData.filter((c) => c.deltagare_id === deltagareId);
      if (deltagaresCv.length >= 4) throw new Error('Max 4 CV per deltagare');
      await insertCV({
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
  }, [cvData]);

  const deleteCv = useCallback(async (cvId) => {
    await deleteCVById(cvId);
    setCvData((prev) => prev.filter((c) => c.id !== cvId));
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
