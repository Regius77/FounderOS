import it from './it';
import { locale } from './index';

/**
 * Display text for a raw enum value that comes from the database or an API
 * (`completed`, `timed_out`, `heartbeat`, `buy`...). The raw value stays what
 * code compares, stores, keys and styles on; only the rendered text goes
 * through here.
 *
 * English output is unchanged: `english` when given (the label the site used
 * to print, e.g. a capitalised or humanised form), else the raw value.
 * Italian looks up `context|value` (gender follows the noun: `run|failed`
 * is "fallita", `agent|idle` is "inattivo"), then `status|value`, and
 * falls back to the English text when neither exists. Entries live in
 * lib/i18n/it/status.ts; tests/status-labels.test.ts checks every known
 * enum value has one.
 */
export type StatusContext =
  | 'status'
  | 'run'
  | 'runstatus'
  | 'trigger'
  | 'board'
  | 'agent'
  | 'tier'
  | 'task'
  | 'kind'
  | 'transfer'
  | 'computer'
  | 'client'
  | 'post'
  | 'order'
  | 'ordertype'
  | 'verdict'
  | 'media'
  | 'source'
  | 'labsource'
  | 'labrun'
  | 'labcost'
  | 'transcript'
  | 'health'
  | 'timing';

export function statusLabel(value: string | null | undefined, context: StatusContext = 'status', english?: string): string {
  const raw = value ?? '';
  const shown = english ?? raw;
  if (!raw || locale() !== 'it') return shown;
  const low = raw.toLowerCase();
  return it[`${context}|${raw}`] ?? it[`${context}|${low}`] ?? it[`status|${raw}`] ?? it[`status|${low}`] ?? shown;
}
