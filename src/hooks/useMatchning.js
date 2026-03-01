import { useState, useCallback } from 'react';
import {
  getMatchningar, replaceMatchningarForRekryterare, updateMatchningById,
} from '../lib/supabaseService.js';
import { runMatchningForRekryterare } from '../lib/matchningService.js';

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

  return { matchningar, progress, loading, error, load, runMatchning, editMotivering };
}
