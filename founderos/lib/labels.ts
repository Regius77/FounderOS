import { t } from '@/lib/i18n';

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
