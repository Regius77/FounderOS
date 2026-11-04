'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { t } from '@/lib/i18n';

type Kind = 'ok' | 'warn' | 'err' | 'busy';
type Toast = { id: number; kind: Kind; text: string; undo?: () => void; born: number; held: boolean; ttl: number };
type Api = {
  ok: (text: string, undo?: () => void) => number;
  warn: (text: string) => number;
  err: (text: string) => number;
  busy: (text: string) => number;
  update: (id: number, kind: Kind, text: string) => void;
  close: (id: number) => void;
};

const Ctx = createContext<Api | null>(null);
export const useToast = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('Wrap the app in <Toaster>');
  return c;
};

// Status colors come from the theme vars so mono/terminal both read honestly.
const color = (k: Kind) => (k === 'ok' ? 'var(--ok)' : k === 'warn' ? 'var(--warn)' : k === 'err' ? 'var(--err)' : 'var(--text)');

/**
 * Toasts are for results that live somewhere else (archived, delegated, created, failed).
 * Actions whose result is visible in place confirm on the button instead (AsyncButton).
 * Rules: one line, verb first, name the object. ok/warn auto-dismiss 2.6s; err stays; hover pauses;
 * destructive actions pass `undo`. Stack bottom-right, newest on top, max 4.
 */
export function Toaster({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const n = useRef(0);
  const push = useCallback((kind: Kind, text: string, undo?: () => void) => {
    const id = ++n.current;
    setList((l) => [...l.slice(-3), { id, kind, text, undo, born: Date.now(), held: false, ttl: kind === 'err' ? Infinity : 2600 }]);
    return id;
  }, []);
  const api = useMemo<Api>(
    () => ({
      ok: (item, u) => push('ok', item, u),
      warn: (item) => push('warn', item),
      err: (item) => push('err', item),
      busy: (item) => push('busy', item),
      update: (id, kind, text) =>
        setList((l) => l.map((item) => (item.id === id ? { ...item, kind, text, born: Date.now(), ttl: kind === 'err' ? Infinity : 2600 } : item))),
      close: (id) => setList((l) => l.filter((item) => item.id !== id)),
    }),
    [push],
  );
  useEffect(() => {
    // The 200ms sweep doubles as the re-render tick that advances the progress
    // hairlines; the empty-list guard keeps an idle app from re-rendering forever.
    const iv = setInterval(() => {
      const now = Date.now();
      setList((l) => (l.length ? l.filter((item) => item.held || item.ttl === Infinity || now - item.born < item.ttl) : l));
    }, 200);
    return () => clearInterval(iv);
  }, []);
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[300px] flex-col-reverse gap-1.5">
        {list.map((item) => (
          <div
            key={item.id}
            data-lens="r"
            onMouseEnter={() => setList((l) => l.map((x) => (x.id === item.id ? { ...x, held: true } : x)))}
            onMouseLeave={() => setList((l) => l.map((x) => (x.id === item.id ? { ...x, held: false, born: Date.now() } : x)))}
            className={`pressable pointer-events-auto relative flex items-center gap-2 rounded-panel border bg-os-bg px-2.5 py-2 font-mono text-[10.5px] shadow-[0_12px_30px_rgba(0,0,0,.7)] animate-enter ${item.kind === 'err' ? 'border-os-err' : 'border-os-border-strong'}`}
          >
            {item.kind === 'busy' ? (
              <span className="inline-block h-[10px] w-[10px] animate-[om-spin_.8s_linear_infinite] rounded-full border-[1.5px] border-os-text border-r-transparent" />
            ) : (
              <span className="animate-pop" style={{ color: color(item.kind) }}>
                {item.kind === 'ok' ? '✓' : item.kind === 'warn' ? '!' : '✕'}
              </span>
            )}
            <span className="min-w-0 flex-1 truncate">{item.text}</span>
            {item.undo && (
              <button
                onClick={() => {
                  item.undo?.();
                  api.close(item.id);
                }}
                className="pressable text-[10px] text-os-muted underline hover:text-os-text"
              >
                {t('undo')}
              </button>
            )}
            <button onClick={() => api.close(item.id)} className="pressable px-0.5 text-[12px] text-os-dim hover:text-os-text">
              ×
            </button>
            {item.ttl !== Infinity && (
              <span
                className="absolute bottom-0 left-2 right-2 h-px origin-left opacity-50 transition-transform duration-200 ease-linear"
                style={{ background: color(item.kind), transform: `scaleX(${item.held ? 1 : Math.max(0, 1 - (Date.now() - item.born) / item.ttl)})` }}
              />
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
