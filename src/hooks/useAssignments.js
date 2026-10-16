import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

export function useAssignments() {
  const [assignments, setAssignments] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => {
    setError(null);
    setAssignments(null);
    api.getAssignments().then(setAssignments).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);
  return { assignments, error, reload: load };
}
