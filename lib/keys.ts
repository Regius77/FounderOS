/**
 * API key management for the Connections board. Keys live in .env.local
 * (gitignored) — this module lists slot status with MASKED values and
 * writes updates. Raw secret values never leave the server.
 */
import fs from 'node:fs';
import path from 'node:path';
import { runtimeEnv } from '@/lib/creds';
import { t } from '@/lib/i18n';

export type KeySlot = { envVar: string; label: string; group: string; hint?: string };

export const KEY_SLOTS: KeySlot[] = [
  { envVar: 'INBOX_1_HOST', label: t('Inbox 1 host'), group: 'Email' },
  { envVar: 'INBOX_1_USER', label: t('Inbox 1 user'), group: 'Email' },
  { envVar: 'INBOX_1_PASS', label: t('Inbox 1 app password'), group: 'Email', hint: t('Gmail app password') },
  { envVar: 'INBOX_2_HOST', label: t('Inbox 2 host'), group: 'Email' },
  { envVar: 'INBOX_2_USER', label: t('Inbox 2 user'), group: 'Email' },
  { envVar: 'INBOX_2_PASS', label: t('Inbox 2 app password'), group: 'Email' },
  { envVar: 'INBOX_3_HOST', label: t('Inbox 3 host'), group: 'Email' },
  { envVar: 'INBOX_3_USER', label: t('Inbox 3 user'), group: 'Email' },
  { envVar: 'INBOX_3_PASS', label: t('Inbox 3 app password'), group: 'Email' },
  { envVar: 'INBOX_4_HOST', label: t('Inbox 4 host'), group: 'Email' },
  { envVar: 'INBOX_4_USER', label: t('Inbox 4 user'), group: 'Email' },
  { envVar: 'INBOX_4_PASS', label: t('Inbox 4 app password'), group: 'Email' },
  { envVar: 'SLACK_BOT_TOKEN', label: t('Slack bot token'), group: 'Slack', hint: t('xoxb-… needs chat:write to reply from the OS') },
  { envVar: 'STRIPE_SECRET_KEY', label: t('Stripe secret key'), group: 'Payments' },
  { envVar: 'PAYPAL_CLIENT_ID', label: t('PayPal client id'), group: 'Payments' },
  { envVar: 'PAYPAL_CLIENT_SECRET', label: t('PayPal client secret'), group: 'Payments' },
  { envVar: 'SQUARE_ACCESS_TOKEN', label: t('Square access token'), group: 'Payments' },
  { envVar: 'WHOP_API_KEY', label: t('Whop API key'), group: 'Payments' },
  { envVar: 'NOTION_API_KEY', label: t('Notion integration secret'), group: 'Notion' },
  { envVar: 'MANYCHAT_API_KEY', label: t('ManyChat API key'), group: 'Social', hint: t('ManyChat → Settings → API (Instagram DM automation)') },
  { envVar: 'GBRAIN_STORE', label: t('Brain-store path override'), group: 'Optimal Engine' },
  { envVar: 'ATTIO_API_KEY', label: t('Attio API key'), group: 'CRM', hint: t('read-scoped — Attio writes stay manual by standing rule') },
  { envVar: 'AI_GATEWAY_API_KEY', label: t('Vercel AI Gateway key'), group: 'Orchestration' },
  { envVar: 'GHL_API_KEY', label: t('GoHighLevel API key'), group: 'CRM' },
  { envVar: 'GHL_LOCATION_ID', label: t('GoHighLevel location id'), group: 'CRM' },
  { envVar: 'BEEHIIV_API_KEY', label: t('Beehiiv API key'), group: 'Social' },
  { envVar: 'BEEHIIV_PUBLICATION_ID', label: t('Beehiiv publication id'), group: 'Social' },
  { envVar: 'DEAL_ALERTS_BOT_TOKEN', label: t('Deal Alerts bot token'), group: 'Telegram', hint: t('from BotFather, for the loud alerts bot') },
  { envVar: 'FOREPLAY_API_KEY', label: t('Foreplay API key'), group: 'Ads', hint: t('app.foreplay.co → settings → API; the ad library behind AdPilot and the Creative Engine') },
  { envVar: 'MIOSA_API_KEY', label: t('MIOSA API key'), group: 'Compute', hint: t('miosa auth token create --name glados; the cloud computers on the Compute page') },
  { envVar: 'ARCADS_BASIC_AUTH', label: t('Arcads Basic auth'), group: 'Ads', hint: t('app.arcads.ai → settings → API; paste the base64 or the full "Basic …" header value') },
];

export function maskSecret(value: string): string {
  if (!value) return '';
  if (value.length <= 4) return '••••';
  return `••••${value.slice(-4)}`;
}

export type KeyStatus = KeySlot & { present: boolean; masked: string };

export function listKeyStatuses(env: Record<string, string | undefined> = runtimeEnv()): KeyStatus[] {
  return KEY_SLOTS.map((slot) => {
    const value = env[slot.envVar] ?? '';
    return { ...slot, present: value.length > 0, masked: maskSecret(value) };
  });
}

const ENV_NAME_RE = /^[A-Z_][A-Z0-9_]*$/;

/** Update or append KEY=value in an env file, preserving everything else. */
export function upsertEnvLocal(filePath: string, key: string, value: string): void {
  if (!ENV_NAME_RE.test(key)) throw new Error(`invalid env var name: ${key}`);
  if (/[\n\r]/.test(value)) throw new Error('value must be a single line');

  let lines: string[] = [];
  try {
    lines = fs.readFileSync(filePath, 'utf8').split('\n');
  } catch {
    // file does not exist yet — start fresh
  }

  const prefix = `${key}=`;
  let replaced = false;
  const next = lines.map((line) => {
    if (!replaced && line.trim().startsWith(prefix)) {
      replaced = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (!replaced) {
    while (next.length > 0 && next[next.length - 1].trim() === '') next.pop();
    next.push(`${key}=${value}`);
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${next.join('\n')}\n`, { encoding: 'utf8', mode: 0o600 });
  // mode only applies on create: tighten a file that already existed too.
  fs.chmodSync(filePath, 0o600);
}
