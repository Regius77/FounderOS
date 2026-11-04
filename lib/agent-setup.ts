/**
 * Per-agent setup guides. An agent that is not yet active gets a green
 * SET UP box on its roster card linking to /agents/setup/<id>, which walks
 * the real wiring steps: env keys (entered inline via /api/keys), external
 * actions only the operator can do, and builds that are still owed.
 */

import type { Agent } from '@/lib/schemas';
import { BRAND } from '@/lib/brand';
import { t } from '@/lib/i18n';

export type SetupStep =
  | { kind: 'env'; envVar: string; label: string; hint?: string }
  | { kind: 'external'; label: string; detail: string; href?: string }
  | { kind: 'build'; label: string; detail: string };

export type AgentSetup = { agentId: string; blurb: string; steps: SetupStep[] };

export const AGENT_SETUPS: AgentSetup[] = [
  {
    agentId: 'crm-pulse',
    blurb: t('Reads the pipeline from your CRM. Read-only by standing rule.'),
    steps: [
      {
        kind: 'env',
        envVar: 'ATTIO_API_KEY',
        label: t('Attio API key'),
        hint: t('Attio → your workspace → Settings → Developers → create a read-scoped key'),
      },
      {
        kind: 'external',
        label: t('Keep the read-only rule'),
        detail: t('CRM writes stay manual unless the operator asks in the moment — scope the key read-only.'),
      },
    ],
  },
  {
    agentId: 'gmail-worker',
    blurb: t('IMAP triage across the inboxes. Needs the the verified sender app password.'),
    steps: [
      { kind: 'env', envVar: 'INBOX_1_HOST', label: t('Inbox 1 host'), hint: 'imap.gmail.com' },
      { kind: 'env', envVar: 'INBOX_1_USER', label: t('Inbox 1 user'), hint: 'you@yourdomain.com' },
      {
        kind: 'env',
        envVar: 'INBOX_1_PASS',
        label: t('Inbox 1 app password'),
        hint: t('Google account → Security → App passwords (needs 2FA on)'),
      },
    ],
  },
  {
    agentId: 'comms-agent',
    blurb: t('The unified comms lead. Wakes up once at least one inbox slot is keyed.'),
    steps: [
      { kind: 'env', envVar: 'INBOX_1_HOST', label: t('Inbox 1 host'), hint: 'imap.gmail.com' },
      { kind: 'env', envVar: 'INBOX_1_USER', label: t('Inbox 1 user'), hint: 'you@yourdomain.com' },
      { kind: 'env', envVar: 'INBOX_1_PASS', label: t('Inbox 1 app password') },
    ],
  },
  {
    agentId: 'slack-worker',
    blurb: t('Latest messages across joined Slack channels.'),
    steps: [
      {
        kind: 'env',
        envVar: 'SLACK_BOT_TOKEN',
        label: t('Slack bot token'),
        hint: t('xoxb-… with chat:write, from api.slack.com → your app → OAuth'),
      },
    ],
  },
  {
    agentId: 'whatsapp-worker',
    blurb: t('Reads the local WhatsApp store. No key — a macOS permission.'),
    steps: [
      {
        kind: 'external',
        label: t('Grant Full Disk Access'),
        detail:
          t('System Settings → Privacy & Security → Full Disk Access → allow the {brand} node process on the mini so ChatStorage.sqlite is readable.', { brand: BRAND.name }),
      },
      {
        kind: 'external',
        label: t('Decide the ingestion path'),
        detail: t('Bridge vs WhatsApp Cloud API is still an open decision — this worker covers local reads either way.'),
      },
    ],
  },
  {
    agentId: 'notion-sync',
    blurb: t('Mirrors Notion docs into reach of the brain.'),
    steps: [
      {
        kind: 'env',
        envVar: 'NOTION_API_KEY',
        label: t('Notion integration secret'),
        hint: t('notion.so/my-integrations → new internal integration → share the target pages with it'),
      },
    ],
  },
  {
    agentId: 'data-agent',
    blurb: t('Optimal Engine retrieval. Runs on the grep fallback until the CLI lands.'),
    steps: [
      {
        kind: 'external',
        label: t('Install the engine CLI'),
        detail: t('Install with `bun install -g github:garrytan/gbrain` (never the npm package of the same name). Once it is on PATH (or GBRAIN_BIN is set), hybrid retrieval replaces the grep fallback.'),
      },
      { kind: 'env', envVar: 'GBRAIN_STORE', label: t('Brain-store path override'), hint: t('defaults to ~/knowledge/brain-store') },
    ],
  },
  {
    agentId: 'deal-alerts',
    blurb: t('The loud chat bot: deal-closed alerts, action-needed pings, team briefings.'),
    steps: [
      {
        kind: 'external',
        label: t('Create the bot in BotFather'),
        detail: t('Telegram → @BotFather → /newbot → hand the token over in a session. Message the new bot once so it can learn your chat.'),
        href: 'https://t.me/BotFather',
      },
      { kind: 'env', envVar: 'DEAL_ALERTS_BOT_TOKEN', label: t('Alerts bot token'), hint: t('from BotFather') },
      { kind: 'build', label: t('Alert daemon build'), detail: t('Deal-closed + action-needed detection rides the Deal Scanner build (autopilot spec §5-6).') },
    ],
  },
  {
    agentId: 'deal-scanner',
    blurb: t('Scheduled inbox scan: classify deal states, draft replies, close the follow-up gap.'),
    steps: [
      {
        kind: 'build',
        label: t('Scanner build'),
        detail: t('Scan inbound via the verified sender, classify per the deal-state model, draft per your brand-deals playbook skill.'),
      },
    ],
  },
  {
    agentId: 'team-briefing',
    blurb: t('Daily digest to your media or ops lead after the last send window.'),
    steps: [
      { kind: 'build', label: t('Briefing build'), detail: t('Generated from the same scan data as the Deal Scanner — it ships right after the scanner does.') },
    ],
  },
  {
    agentId: 'automation-jobs',
    blurb: t('The four inert launchd jobs scaffolded in brain/Automation.'),
    steps: [
      {
        kind: 'external',
        label: t('Load the launchd jobs on the mini'),
        detail: t('Plists are written and validated but not loaded. Enable order: daily-reconcile → heartbeat → newsletter → operator. Say "enable the automation jobs" in a session.'),
      },
    ],
  },
];

const BY_ID = new Map(AGENT_SETUPS.map((s) => [s.agentId, s]));

export function setupFor(agentId: string): AgentSetup | null {
  return BY_ID.get(agentId) ?? null;
}

/** Active agents are wired; everything else with a guide gets the SET UP box. */
export function needsSetup(agent: Pick<Agent, 'id' | 'status'>): boolean {
  return agent.status !== 'active' && BY_ID.has(agent.id);
}
