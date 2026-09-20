import { useContext, useRef, useState } from 'react';
import { FactoryContext } from '../providers/FactoryContext.js';
import { postEntry } from '../services/millApi.js';
import { errorMessage } from '../lib/format.js';
export const useFactory = () => useContext(FactoryContext);

export function useMutation() {
  const { refresh } = useFactory();
  const request = useRef(null);
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function save(kind, data) {
    if (running.current) return null;
    running.current = true; setBusy(true); setError(''); setSuccess('');
    const signature = JSON.stringify({ kind, data });
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
    try {
      const id = await postEntry(kind, data, request.current.id);
      request.current = null;
      setSuccess("Saved successfully.");
      await refresh();
      return id;
    } catch (err) { setError(errorMessage(err)); return null; }
    finally { running.current = false; setBusy(false); }
  }
  return { save, busy, error, setError, success, setSuccess };
}
