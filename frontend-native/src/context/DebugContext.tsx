import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';

export interface DebugErrorEntry {
  id: string;
  message: string;
  stack?: string;
  timestamp: number;
  source: 'boundary' | 'unhandled' | 'promise' | 'console';
}

const listeners = new Set<() => void>();
let errors: DebugErrorEntry[] = [];

function notify() {
  // Defer so we don't setState during render (avoids "Cannot update a component while rendering another")
  const cbs = Array.from(listeners);
  if (typeof queueMicrotask !== 'undefined') {
    queueMicrotask(() => cbs.forEach((cb) => cb()));
  } else {
    setTimeout(() => cbs.forEach((cb) => cb()), 0);
  }
}

export function addDebugError(
  error: Error | { message: string; stack?: string },
  source: DebugErrorEntry['source'] = 'boundary'
) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const entry: DebugErrorEntry = {
    id,
    message: error?.message ?? String(error),
    stack: error?.stack,
    timestamp: Date.now(),
    source,
  };
  errors = [entry, ...errors].slice(0, 100);
  notify();
}

export function getDebugErrors(): DebugErrorEntry[] {
  return [...errors];
}

export function clearDebugErrors(): void {
  errors = [];
  notify();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

interface DebugContextType {
  errors: DebugErrorEntry[];
  addError: (error: Error | { message: string; stack?: string }, source?: DebugErrorEntry['source']) => void;
  clearErrors: () => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export function DebugProvider({ children }: { children: ReactNode }) {
  const [errorsState, setErrorsState] = useState<DebugErrorEntry[]>(getDebugErrors);

  useEffect(() => {
    return subscribe(() => setErrorsState(getDebugErrors()));
  }, []);

  const addError = useCallback((error: Error | { message: string; stack?: string }, source?: DebugErrorEntry['source']) => {
    addDebugError(error, source ?? 'boundary');
  }, []);

  const clearErrors = useCallback(() => {
    clearDebugErrors();
  }, []);

  return (
    <DebugContext.Provider value={{ errors: errorsState, addError, clearErrors }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const ctx = useContext(DebugContext);
  if (ctx === undefined) throw new Error('useDebug must be used within DebugProvider');
  return ctx;
}
