'use client';

import { useGc } from '@/components/system-g/style-context';
import { forwardRef, useImperativeHandle, useRef, useState, type CSSProperties } from 'react';
import { Send, X } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import type { HAny, HKind } from '@/lib/blueprint/hierarchy';
import { t } from '@/lib/i18n';

export interface AskHandle {
  focus: () => void;
  isFocused: () => boolean;
}

const SUGGEST: Partial<Record<HKind | '_general' | 'container' | 'group' | 'default', string[]>> = {
  _general: [t('What is not wired yet?'), t('Which agents actually run, and on what?'), t('Where does the OS depend on one thing?')],
  agent: [t('What does {n} do, and is it wired?'), t('Which connectors and models does {n} depend on?'), t('Why is {n} marked the way it is?')],
  daemon: [t('What breaks if {n} stops?'), t('What does {n} read and write?'), t('Who approves what {n} sends?')],
  skill: [t('Which agents load {n}?'), t('What would improve {n}?')],
  connector: [t('Is {n} configured here?'), t('Which agents use {n}?'), t('What would it take to make {n} live?')],
  model: [t('What routes to {n}?'), t('Is {n} the only path, or is there a fallback?')],
  store: [t('Who reads and writes {n}?'), t('What page shows {n}?')],
  department: [t('Which agents in {n} actually run?'), t('What is missing in {n}?')],
  group: [t('Summarise {n} in three lines.'), t('What in {n} is not configured?')],
  container: [t('Summarise what runs on {n}.'), t('What is the biggest risk on {n}?')],
  machine: [t('Summarise what runs on {n}.'), t('What is the biggest risk on {n}?')],
  operator: [t('What do I touch directly, and what runs without me?'), t('Where am I the single point of failure?')],
  command: [t('What runs on {n}?'), t('What happens if {n} is missing?')],
  app: [t('Summarise the OS in three lines.'), t('What in the OS is designed but not wired?')],
  router: [t('What does {n} decide?'), t('What lands on each side of {n}?')],
  surface: [t('What does {n} read?'), t('Which agents feed {n}?')],
  person: [t('What does {n} own?'), t('Which agents work beside {n}?')],
  cloud: [t('What depends on {n}?'), t('What happens if {n} is unavailable?')],
  default: [t('What is {n} and what is it connected to?'), t('What is wrong with {n}?')],
};

type Answer = { state: 'thinking'; text: string } | { state: 'ok'; text: string; model: string | null; scope: string } | { state: 'error'; text: string };

/**
 * The ask bar: AdPilot's frosted glass with the orbiting light, docked at
 * the bottom of the map. It knows what is selected — the scope chip takes
 * the selection's kind colour, the suggested questions change with it —
 * and the answer is grounded server-side in that scope's chain, members
 * and relations. `/` focuses it.
 */
export const AskBar = forwardRef<AskHandle, { scope: HAny | null; onClearScope: () => void }>(function AskBar({ scope, onClearScope }, ref) {
  const gc = useGc();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus(), isFocused: () => document.activeElement === inputRef.current }), []);

  const kindKey: keyof typeof SUGGEST = scope ? (scope.type === 'container' ? (scope.kind === 'machine' ? 'machine' : 'container') : scope.type === 'group' ? (scope.kind === 'department' ? 'department' : 'group') : scope.kind) : '_general';
  const chips = (SUGGEST[kindKey] ?? SUGGEST.default ?? []).map((q) => q.replace('{n}', scope ? scope.name : ''));
  const style = scope ? ({ '--sc': `var(--bh-k-${scope.kind}, var(--accent))` } as CSSProperties) : undefined;

  async function ask(question?: string) {
    const q = (question ?? value).trim();
    if (q.length < 3 || busy) return;
    setBusy(true);
    setAnswer({ state: 'thinking', text: scope ? t('Looking at {name}, its members and its connections…', { name: scope.name }) : t('Looking at the whole map…') });
    try {
      const r = await fetch('/api/blueprint/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: q, selected: scope?.id ?? null }) });
      const j = (await r.json()) as { ok: boolean; text?: string; model?: string | null; scope?: string; error?: string };
      if (!j.ok) setAnswer({ state: 'error', text: j.error || t('No answer.') });
      else setAnswer({ state: 'ok', text: j.text ?? '', model: j.model ?? null, scope: j.scope ?? (scope ? scope.name : t('whole system')) });
    } catch (e) {
      setAnswer({ state: 'error', text: t('Could not reach the analyst: {message}', { message: (e as Error).message }) });
    }
    setBusy(false);
    setValue('');
  }

  return (
    <div className={`bh-ask ${scope ? 'has-scope' : 'has-chips'} ${busy ? 'is-busy' : ''}`} style={style}>
      <div className="bh-ask-orbit" aria-hidden="true" />
      <div className="bh-ask-glass" />
      <div className="bh-ask-inner">
        <div className="bh-ask-row">
          <button type="button" className={gc('bh-ask-scope g-chip', 'bh-ask-scope')} title={scope ? t('Clear selection (esc)') : t('Ask about the whole system')} onClick={() => (scope ? onClearScope() : inputRef.current?.focus())}>
            <i className="sw" />
            <span>{scope ? t('Ask about {name}', { name: scope.name }) : t('Ask {brand}', { brand: BRAND.name })}</span>
          </button>
          <input
            ref={inputRef}
            type="text"
            className={gc('g-input kg-bp-ask-input', '') || undefined}
            aria-label={t('Ask about the system')}
            value={value}
            placeholder={scope ? t('ask about {name}…', { name: scope.name }) : t('ask anything about the system…')}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void ask();
              if (e.key === 'Escape') inputRef.current?.blur();
            }}
          />
          <button type="button" className={gc('bh-ask-send g-btn g-btn-icon g-btn-sm', 'bh-ask-send')} aria-label={t('Ask')} onClick={() => void ask()}>
            <Send />
          </button>
        </div>
        <div className="bh-ask-chips">
          {chips.map((q) => (
            <button key={q} type="button" className={gc('bh-ask-chip g-chip', 'bh-ask-chip')} onClick={() => void ask(q)}>
              {q}
            </button>
          ))}
        </div>
        {answer && (
          <div className={`bh-ask-answer is-on ${answer.state === 'thinking' ? 'is-thinking' : answer.state === 'error' ? 'is-error' : ''}`}>
            <div>{answer.text}</div>
            {answer.state === 'ok' && (
              <div className="meta">
                <span>
                  {t('scope:')} {answer.scope}
                  {answer.model ? ` · ${answer.model}` : ''}
                </span>
                <button type="button" className={gc('g-btn g-btn-sm', '') || undefined} onClick={() => setAnswer(null)}>
                  <X /> {t('clear')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
