import { useCallback, useRef, useState } from 'react';
import { readJSON, writeJSON } from '../utils/storage';

/**
 * useState + localStorage + a synchronous ref.
 * `update(fn)` computes the next value from the *latest* value (even when called
 * several times in one tick), persists it, and returns it, so action handlers can
 * log / toast based on the result without waiting for a re-render.
 */
export function usePersistedStore(key, createDefault, normalize = (v) => v) {
  const [state, setState] = useState(() => {
    const stored = readJSON(key, null);
    return stored === null ? createDefault() : normalize(stored, createDefault);
  });
  const ref = useRef(state);

  const update = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(ref.current) : updater;
      ref.current = next;
      setState(next);
      writeJSON(key, next);
      return next;
    },
    [key],
  );

  const getLatest = useCallback(() => ref.current, []);
  return [state, update, getLatest];
}
