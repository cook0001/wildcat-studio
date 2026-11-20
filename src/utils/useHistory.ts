import { useState, useCallback, useEffect, useRef } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useHistory<T>(initialPresent: T, maxHistory = 50) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialPresent,
    future: [],
  });

  const lastCommittedRef = useRef<T>(initialPresent);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingCommit = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearPendingCommit, [clearPendingCommit]);

  const undo = useCallback(() => {
    clearPendingCommit();
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      lastCommittedRef.current = previous;
      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [prev.present, ...prev.future].slice(0, maxHistory),
      };
    });
  }, [clearPendingCommit, maxHistory]);

  const redo = useCallback(() => {
    clearPendingCommit();
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      lastCommittedRef.current = next;
      return {
        past: [...prev.past, prev.present].slice(-maxHistory),
        present: next,
        future: prev.future.slice(1),
      };
    });
  }, [clearPendingCommit, maxHistory]);

  const set = useCallback((newPresent: T, commitImmediately = false) => {
    clearPendingCommit();

    if (commitImmediately) {
      const committedPrev = lastCommittedRef.current;
      lastCommittedRef.current = newPresent;
      setHistory((prev) => ({
        past: [...prev.past, committedPrev].slice(-maxHistory),
        present: newPresent,
        future: [],
      }));
      return;
    }

    setHistory((prev) => ({
      ...prev,
      present: newPresent,
    }));

    timerRef.current = setTimeout(() => {
      const committedPrev = lastCommittedRef.current;
      lastCommittedRef.current = newPresent;
      timerRef.current = null;
      setHistory((prev) => ({
        past: [...prev.past, committedPrev].slice(-maxHistory),
        present: newPresent,
        future: [],
      }));
    }, 350);
  }, [clearPendingCommit, maxHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      const active = document.activeElement as HTMLElement | null;
      const activeTag = active?.tagName.toLowerCase();
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        active?.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    state: history.present,
    set,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    pastCount: history.past.length,
    futureCount: history.future.length,
  };
}
