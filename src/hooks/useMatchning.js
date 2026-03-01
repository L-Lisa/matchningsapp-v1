import { useState, useCallback } from 'react';
import {
  getMatchningar, replaceMatchningarForRekryterare, updateMatchningById,
  insertMatchning, deleteMatchningById,
} from '../lib/supabaseService.js';
import { runMatchningForRekryterare } from '../lib/matchningService.js';
import { generateId, nowTimestamp } from '../lib/utils.js';

export function useMatchning() {
  const [matchningar, setMatchningar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMatchningar(await getMatchningar());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const runMatchning = useCallback(async (rekryterareList, aktiva, allaTjanster) => {
    setProgress({});
    const allMatchningar = await getMatchningar();

    for (const rek of rekryterareList) {
      setProgress((p) => ({
        ...p,
        [rek]: { done: 0, total: 0, message: `Tar bort gamla matchningar för ${rek}...`, status: 'running' },
      }));

      const previous = allMatchningar.filter((m) => m.rekryterare === rek);
      const tjansterForRek = allaTjanster.filter((t) => t.rekryterare === rek && t.aktiv);

      try {
        const nya = await runMatchningForRekryterare(
          rek,
          aktiva,
          tjansterForRek,
          previous,
          (done, total, message) => {
            setProgress((p) => ({ ...p, [rek]: { done, total, message, status: 'running' } }));
          }
        );

        setProgress((p) => ({
          ...p,
          [rek]: { done: nya.length, total: nya.length, message: `Sparar matchningar för ${rek}...`, status: 'running' },
        }));

        await replaceMatchningarForRekryterare(rek, nya);

        setProgress((p) => ({
          ...p,
          [rek]: { done: nya.length, total: nya.length, message: `Klar! ${nya.length} matchningar.`, status: 'done' },
        }));
      } catch (err) {
        setProgress((p) => ({
          ...p,
          [rek]: { done: 0, total: 0, message: `Fel: ${err.message}`, status: 'error' },
        }));
      }
    }

    await load();
  }, [load]);

  const editMotivering = useCallback(async (id, nyText) => {
    await updateMatchningById(id, { ai_motivering: nyText, ai_motivering_redigerad: true });
    setMatchningar((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, ai_motivering: nyText, ai_motivering_redigerad: true } : m
      )
    );
  }, []);

  const addMatchning = useCallback(async (deltagareId, tjanstId, rekryterare, motivering) => {
    const matchning = {
      id: generateId(),
      deltagare_id: deltagareId,
      tjanst_id: tjanstId,
      rekryterare,
      ai_motivering: motivering || '',
      ai_motivering_redigerad: true, // manuellt tillagd → bevaras vid omkörning
      korning_datum: nowTimestamp(),
      ny_denna_korning: false,
    };
    await insertMatchning(matchning);
    setMatchningar((prev) => [...prev, matchning]);
  }, []);

  const removeMatchning = useCallback(async (id) => {
    await deleteMatchningById(id);
    setMatchningar((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { matchningar, progress, loading, error, load, runMatchning, editMotivering, addMatchning, removeMatchning };
}
