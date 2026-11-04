/**
 * The system bring-up model behind /setup. Design rule:
 * derive every step from live sources and auto-verify wherever code can
 * check; manual check-offs exist ONLY for steps nothing can verify. This
 * page projects existing truth — it is never a second source of it.
 */

import { existsSync } from 'node:fs';
import { BRAND } from '@/lib/brand';
import os from 'node:os';
import path from 'node:path';
import type { GladosDb } from '@/lib/db';
import { allConnectorStatuses } from '@/lib/connectors';
import { listKeyStatuses } from '@/lib/keys';
import { agentAvatars } from '@/lib/agent-avatars';
import { bdpilotStatePath, brainStoreDir, gbrainBin as gbrainBinPath, gbrainConfigured } from '@/lib/stores';
import { filmingMode } from '@/lib/paths';
import { isConfigured as passwordConfigured } from '@/lib/auth';
import { t } from '@/lib/i18n';

export type SystemStep = {
  id: string;
  title: string;
  detail: string;
  status: 'verified' | 'marked' | 'open';
  /** true = code verified it live; false = only a human can confirm it. */
  auto: boolean;
  href?: string;
  /** When set and the step is open, the page offers inline key entry. */
  envVar?: string;
};

export type SystemPhase = { n: number; title: string; blurb: string; steps: SystemStep[] };

export type SystemSetup = {
  phases: SystemPhase[];
  totals: { verified: number; marked: number; open: number; total: number };
};

/** The only ids a manual check-off may write. */
export const MANUAL_STEP_IDS = [
  'whatsapp-fda',
  'whatsapp-decision',
  'trakyo-application',
  'fork-github',
  'union-brain-store',
] as const;

function probe(p: string): boolean {
  try {
    return existsSync(p);
  } catch {
    return false;
  }
}

export async function buildSystemSetup(db: GladosDb): Promise<SystemSetup> {
  const home = os.homedir();
  const marked = new Set(db.setupChecks.all().map((c) => c.id));
  const keys = new Map(listKeyStatuses().map((k) => [k.envVar, k.present]));
  const connectors = new Map((await allConnectorStatuses()).map((c) => [c.id, c.state]));
  const agents = new Map(db.agents.all().map((a) => [a.id, a]));
  const photoCount = agentAvatars().size;

  const manual = (id: (typeof MANUAL_STEP_IDS)[number], title: string, detail: string, href?: string): SystemStep => ({
    id,
    title,
    detail,
    href,
    auto: false,
    status: marked.has(id) ? 'marked' : 'open',
  });

  const connector = (id: string, title: string, detail: string, envVar?: string): SystemStep => ({
    id: `conn-${id}`,
    title,
    detail,
    envVar,
    href: '/integrations',
    auto: true,
    status: connectors.get(id) === 'connected' ? 'verified' : 'open',
  });

  const agentBuild = (id: string, title: string, detail: string): SystemStep => ({
    id: `build-${id}`,
    title,
    detail,
    href: `/agents/setup/${id}`,
    auto: true,
    status: agents.get(id)?.status === 'active' ? 'verified' : 'open',
  });

  const gsendBin = process.env.GSEND_BIN ?? path.join(home, 'bin', 'gsend');
  const brainStore = filmingMode() ? brainStoreDir() : process.env.GBRAIN_STORE ?? path.join(home, 'Sync', 'brain');
  const bdpilotState = bdpilotStatePath();
  const gbrainBin = gbrainConfigured() ? gbrainBinPath() : '';

  const phases: SystemPhase[] = [
    {
      n: 1,
      title: t('Foundation'),
      blurb: t('The rails everything else rides on. Every check here is a live probe on this host.'),
      steps: [
        {
          id: 'host-live',
          title: t('{brand} host serving', { brand: BRAND.name }),
          detail: t('This page rendered from the {brand} process, so the host is up by definition.', { brand: BRAND.name }),
          auto: true,
          status: 'verified',
        },
        {
          id: 'operator-password',
          title: t('Operator password'),
          detail: t('Sign-in for every page and API route. Until one is set, {brand} answers only on this machine.', { brand: BRAND.name }),
          href: '/setup#security',
          auto: true,
          status: passwordConfigured() ? 'verified' : 'open',
        },
        {
          id: 'brain-store',
          title: t('Brain store mounted'),
          detail: t('Markdown brain at {path} — the knowledge layer /brain reads.', { path: brainStore }),
          href: '/brain',
          auto: true,
          status: probe(brainStore) ? 'verified' : 'open',
        },
        {
          id: 'gsend-bin',
          title: t('Verified send path (gsend)'),
          detail: t('The only thing allowed to send as the verified sender. Token identity, retry pacing, draft ops.'),
          auto: true,
          status: probe(gsendBin) ? 'verified' : 'open',
        },
        {
          id: 'travis-live',
          title: t('{name} on duty', { name: agents.get('draft-approval-bot')?.name ?? t('Approval bot') }),
          detail: t('bdpilot daemon state present — Telegram approvals, triage tags, inbound watch.'),
          href: '/brand-deals',
          auto: true,
          status: probe(bdpilotState) ? 'verified' : 'open',
        },
      ],
    },
    {
      n: 2,
      title: t('Keys & connectors'),
      blurb: t('Ordered by impact. A step closes itself when the connector actually reports connected — no box-ticking.'),
      steps: [
        connector('email', t('Primary inbox (IMAP)'), t('The single highest-impact key: lights up Comms, Gmail Worker, and Calendar together. Needs the Gmail app password.'), 'INBOX_1_PASS'),
        connector('attio', t('Attio (CRM)'), t('Read-scoped key by standing rule — flips the Funnel from KB snapshot to live pipeline.'), 'ATTIO_API_KEY'),
        connector('llm', t('AI Gateway (runtime models)'), t('Cheap models run the system; Claude builds it. Unblocks agent runtime LLM calls.'), 'AI_GATEWAY_API_KEY'),
        connector('beehiiv', t('Beehiiv (email list)'), t('Real subscriber counts and newsletter issues on /social.'), 'BEEHIIV_API_KEY'),
        connector('ghl', 'GoHighLevel', t('Second live source for funnel journeys.'), 'GHL_API_KEY'),
        connector('payments', t('Payments (Stripe first)'), t('Honest income numbers on /finances.'), 'STRIPE_SECRET_KEY'),
        connector('slack', 'Slack', t('Slack Worker reads joined channels.'), 'SLACK_BOT_TOKEN'),
        connector('notion', 'Notion', t('Notion Sync mirrors shared pages.'), 'NOTION_API_KEY'),
        connector('manychat', t('ManyChat (IG DMs)'), t('DM threads and replies on /social.'), 'MANYCHAT_API_KEY'),
      ],
    },
    {
      n: 3,
      title: t('Hands-on steps'),
      blurb: t('Only you can do these. The first two auto-verify when their artifact shows up; the rest are honest check-offs.'),
      steps: [
        {
          id: 'gbrain-cli',
          title: t('Install the engine CLI'),
          detail: t('Hybrid retrieval replaces the grep fallback the moment the binary lands on PATH (or GBRAIN_BIN points at it).'),
          href: '/agents/setup/data-agent',
          auto: true,
          status: (gbrainBin && probe(gbrainBin)) || probe('/opt/homebrew/bin/gbrain') || probe(path.join(home, '.local/bin/gbrain')) || probe('/usr/local/bin/gbrain') ? 'verified' : 'open',
        },
        {
          id: 'alerts-bot-token',
          title: t('Deal Alerts bot in BotFather'),
          detail: t('Create the loud bot, message it once, paste the token on its setup page. Verifies when the token key is present.'),
          href: '/agents/setup/deal-alerts',
          auto: true,
          status: keys.get('DEAL_ALERTS_BOT_TOKEN') ? 'verified' : 'open',
        },
        manual('whatsapp-fda', t('Full Disk Access for WhatsApp reads'), t('System Settings on the mini → Privacy & Security → Full Disk Access → allow the {brand} node process.', { brand: BRAND.name })),
        manual('whatsapp-decision', t('Decide WhatsApp ingestion'), t('Bridge vs Cloud API — the open decision blocking WhatsApp automation.')),
        manual('trakyo-application', t('Trakyo application'), t('Apply via their Calendly (calendly.com/yousef-trakyo) or hello@trakyo.io; key slot exists when approved.')),
      ],
    },
    {
      n: 4,
      title: t('Builds owed'),
      blurb: t('Code still to be written. A step closes when its agent actually flips active, never before.'),
      steps: [
        agentBuild('deal-scanner', t('Deal Scanner'), t('Scheduled inbound scan, deal-state classification, auto-drafting through Travis. Say "build the deal scanner" in a session.')),
        agentBuild('deal-alerts', t('Deal Alerts daemon'), t('Deal-closed and action-needed pushes; rides the scanner build plus the BotFather token above.')),
        agentBuild('team-briefing', t('Team daily briefing'), t('Digest to your media or ops lead after the last send window; ships right after the scanner.')),
        agentBuild('automation-jobs', t('Enable the automation jobs'), t('Register your scheduled jobs with the host scheduler (launchd, cron or systemd): reconcile → heartbeat → newsletter → operator.')),
      ],
    },
    {
      n: 5,
      title: t('Make it yours'),
      blurb: t('Ownership and polish.'),
      steps: [
        manual('fork-github', t('Fork the repo to your GitHub'), t('Fork {brand} under your own account so the history and deploys are yours.', { brand: BRAND.name })),
        manual('union-brain-store', t('Union brain store'), t('Fold each brand knowledge base into the brain store so /brain sees the whole operation.')),
        {
          id: 'agent-photos',
          title: t('Agent profile photos'),
          detail: t('{n} of {total} agents have a photo (drop files in public/agents/). Counts as done at five.', { n: photoCount, total: agents.size }),
          href: '/agents',
          auto: true,
          status: photoCount >= 5 ? 'verified' : 'open',
        },
      ],
    },
  ];

  const all = phases.flatMap((p) => p.steps);
  const totals = {
    verified: all.filter((s) => s.status === 'verified').length,
    marked: all.filter((s) => s.status === 'marked').length,
    open: all.filter((s) => s.status === 'open').length,
    total: all.length,
  };
  return { phases, totals };
}
