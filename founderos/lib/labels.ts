import { t } from '@/lib/i18n';
import { statusLabel } from '@/lib/i18n/status';

/**
 * Display labels for enum values stored in the database. The raw value stays
 * the key everywhere it is compared; only the rendered text goes through t().
 * Unknown values fall back to the raw string.
 */
export function agentStatusLabel(s: string): string {
  const map: Record<string, string> = { active: t('active'), idle: t('idle'), training: t('training'), planned: t('planned'), paused: t('paused'), running: t('running'), error: t('error') };
  return map[s] ?? s;
}

export function agentTierLabel(s: string): string {
  const map: Record<string, string> = { lead: t('lead'), specialist: t('specialist'), worker: t('worker') };
  return map[s] ?? s;
}

export function taskStatusLabel(s: string): string {
  const map: Record<string, string> = { open: t('open'), doing: t('doing'), blocked: t('blocked'), done: t('done') };
  return map[s] ?? s;
}

/**
 * Paperclip issue and run statuses (snake_case on the wire) as display text.
 * English keeps the humanised wording; Italian reads `board|<raw>` from
 * lib/i18n/it/status.ts (feminine: attività / esecuzione).
 */
const BOARD_EN: Record<string, string> = {
  in_progress: 'in progress',
  in_review: 'in review',
  review: 'review',
  blocked: 'blocked',
  todo: 'todo',
  backlog: 'backlog',
  done: 'done',
  cancelled: 'cancelled',
  running: 'running',
  failed: 'failed',
  error: 'error',
  timed_out: 'timed out',
  unknown: 'unknown',
};

export function boardStatusLabel(s: string): string {
  return statusLabel(s, 'board', BOARD_EN[s] ?? s.replace(/_/g, ' '));
}
