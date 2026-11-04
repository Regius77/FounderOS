/**
 * The Wizard dock's bottom-right launcher (SPEC S08). Pure helpers so the
 * state precedence and the copy are unit-tested in the node env
 * (tests/wizard-launcher.test.ts); ConductorPanel renders from them.
 */

/** Fired by ConductorPanel whenever the dock opens, closes or changes width:
 *  `{ open, width }`. The Topbar wand reads it for aria-expanded; the sidebar
 *  reads it to give room back when the dock leaves too little (S09 FR-9). */
import { t } from '@/lib/i18n';

export const CONDUCTOR_STATE_EVENT = 'conductor:state';
/** Ask the dock to toggle (the Topbar wand: opens when closed, closes when open). */
export const CONDUCTOR_TOGGLE_EVENT = 'conductor:toggle';

export type ConductorStateDetail = { open: boolean; width: number };

export type LauncherState = 'open' | 'error' | 'thinking' | 'unread' | 'idle';

/** Open wins over everything; then error > thinking > unread > idle (FR-4). */
export function launcherState(s: { open: boolean; sending: boolean; unread: number; error: string | null | boolean }): LauncherState {
  if (s.open) return 'open';
  if (s.error) return 'error';
  if (s.sending) return 'thinking';
  if (s.unread > 0) return 'unread';
  return 'idle';
}

/** The unread count as the badge prints it: nothing for 0 or 1 (a plain dot), "9+" past nine. */
export function unreadBadge(unread: number): string {
  if (unread <= 1) return '';
  return unread > 9 ? '9+' : String(unread);
}

/** Accessible name and the pop-out label for each state (FR-4, FR-6). */
export function launcherCopy(state: LauncherState, unread: number): { aria: string; pop: string } {
  switch (state) {
    case 'error':
      return { aria: t('Open the Wizard, last message failed'), pop: t('Failed, open to retry') };
    case 'thinking':
      return { aria: t('Open the Wizard (working on your last message)'), pop: t('Working…') };
    case 'unread':
      return {
        aria: unread === 1 ? t('Open the Wizard, {n} new reply', { n: unread }) : t('Open the Wizard, {n} new replies', { n: unread }),
        pop: t('{n} new', { n: unread > 9 ? '9+' : unread }),
      };
    default:
      return { aria: t('Open the Wizard'), pop: t('Ask Wizard') };
  }
}
