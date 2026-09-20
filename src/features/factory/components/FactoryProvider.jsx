import { useCallback, useEffect, useRef, useState } from 'react';
import { FactoryContext } from '../hooks/FactoryContext';
import { fetchSnapshot } from '../services/millApi';
import { errorMessage } from '../../../lib/format';

export function FactoryProvider({ children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [version, setVersion] = useState(0);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setRefreshing(true);
    try {
      const next = await fetchSnapshot();
      if (request !== sequence.current) return;
      setData(next); setError(''); setVersion(v => v + 1);
    } catch (err) {
      if (request === sequence.current) setError(errorMessage(err));
    } finally { if (request === sequence.current) setRefreshing(false); }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) refresh(); });
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => { active = false; window.removeEventListener('focus', onFocus); };
  }, [refresh]);
  return <FactoryContext.Provider value={{ data, error, refresh, refreshing, version }}>{children}</FactoryContext.Provider>;
}
