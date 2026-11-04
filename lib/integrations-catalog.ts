import type { ConnectorCapability, ConnectorStatus } from '@/lib/connectors/types';
import {
  INTEGRATION_CATEGORIES,
  type Integration,
  type IntegrationCategory,
} from '@/lib/schemas';
import { t } from '@/lib/i18n';

/**
 * The connections marketplace catalog. Larp-first: a rich, honest catalog of
 * popular tools. `connectorId` ties an entry to a real connector so its live
 * "connected" state is never faked; everything else reads as "not connected"
 * with a Connect affordance. Logos resolve from `slug` via lib/brand-logos
 * (simple-icons + a few hand-authored marks + intentional lettermarks).
 */
export const INTEGRATIONS: Integration[] = [
  // Communication
  { slug: 'slack', name: 'Slack', tagline: t('Channels & DMs'), category: 'Communication', connectorId: 'slack', popular: true, envKeys: ['SLACK_BOT_TOKEN'] },
  { slug: 'gmail', name: 'Gmail', tagline: t('Send & read email'), category: 'Communication', connectorId: 'email', popular: true, envKeys: [] },
  { slug: 'whatsapp', name: 'WhatsApp', tagline: t('Messages & broadcasts'), category: 'Communication', connectorId: 'whatsapp', envKeys: ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN'] },
  { slug: 'discord', name: 'Discord', tagline: t('Servers & channels'), category: 'Communication' },
  { slug: 'telegram', name: 'Telegram', tagline: t('Chats & bots'), category: 'Communication' },
  { slug: 'zoom', name: 'Zoom', tagline: t('Meetings & recordings'), category: 'Communication', popular: true },
  { slug: 'manychat', name: 'ManyChat', tagline: t('IG DM automation'), category: 'Communication', connectorId: 'manychat', envKeys: ['MANYCHAT_API_KEY'] },
  // FounderOS merge (F4): recordings land in Comms. Plaud pushes to /api/plaud/ingest with this token.
  { slug: 'plaud', name: 'Plaud', tagline: t('In-room recordings'), category: 'Communication', connectorId: 'plaud', envKeys: ['PLAUD_INGEST_TOKEN'] },
  { slug: 'fathom', name: 'Fathom', tagline: t('Call recordings & summaries'), category: 'Communication', connectorId: 'fathom', envKeys: ['FATHOM_API_KEY'] },

  // Productivity
  { slug: 'notion', name: 'Notion', tagline: t('Docs & databases'), category: 'Productivity', connectorId: 'notion', popular: true, envKeys: ['NOTION_API_KEY'] },
  { slug: 'airtable', name: 'Airtable', tagline: t('Bases & records'), category: 'Productivity', popular: true },
  { slug: 'googlesheets', name: 'Google Sheets', tagline: t('Read & write spreadsheets'), category: 'Productivity' },
  { slug: 'googledocs', name: 'Google Docs', tagline: t('Create & edit documents'), category: 'Productivity' },
  { slug: 'clickup', name: 'ClickUp', tagline: t('Docs, tasks & goals'), category: 'Productivity' },
  { slug: 'trello', name: 'Trello', tagline: t('Boards & cards'), category: 'Productivity' },
  { slug: 'coda', name: 'Coda', tagline: t('Docs that act like apps'), category: 'Productivity' },

  // CRM & Sales
  { slug: 'hubspot', name: 'HubSpot', tagline: t('Contacts & deals'), category: 'CRM & Sales', popular: true },
  { slug: 'salesforce', name: 'Salesforce', tagline: t('Accounts & pipeline'), category: 'CRM & Sales' },
  { slug: 'attio', name: 'Attio', tagline: t('CRM built on data'), category: 'CRM & Sales', connectorId: 'attio', envKeys: ['ATTIO_API_KEY'] },
  { slug: 'zendesk', name: 'Zendesk', tagline: t('Tickets & support'), category: 'CRM & Sales' },
  { slug: 'intercom', name: 'Intercom', tagline: t('Chat & lifecycle'), category: 'CRM & Sales' },
  { slug: 'gohighlevel', name: 'GoHighLevel', tagline: t('LC pipeline & contacts'), category: 'CRM & Sales', connectorId: 'ghl', envKeys: ['GHL_API_KEY', 'GHL_LOCATION_ID'] },

  // Developer
  { slug: 'github', name: 'GitHub', tagline: t('Repos, issues & PRs'), category: 'Developer', popular: true },
  { slug: 'linear', name: 'Linear', tagline: t('Issues & projects'), category: 'Developer' },
  { slug: 'jira', name: 'Jira', tagline: t('Boards & tickets'), category: 'Developer' },
  { slug: 'vercel', name: 'Vercel', tagline: t('Deploys & logs'), category: 'Developer' },
  { slug: 'sentry', name: 'Sentry', tagline: t('Errors & traces'), category: 'Developer' },
  { slug: 'gitlab', name: 'GitLab', tagline: t('Repos & pipelines'), category: 'Developer' },
  // FounderOS merge (/clients): client drafts start in a Superset workspace (GLADOS_WRITES=1 + confirm).
  { slug: 'superset', name: 'Superset', tagline: t('Agent workspaces for client drafts'), category: 'Developer', connectorId: 'superset', envKeys: ['SUPERSET_API_KEY'] },

  // Scheduling
  { slug: 'googlecalendar', name: 'Google Calendar', tagline: t('Events & availability'), category: 'Scheduling', connectorId: 'calendar', popular: true, envKeys: [] },
  { slug: 'calendly', name: 'Calendly', tagline: t('Booking links'), category: 'Scheduling' },
  { slug: 'caldotcom', name: 'Cal.com', tagline: t('Open scheduling'), category: 'Scheduling' },
  { slug: 'googlemeet', name: 'Google Meet', tagline: t('Video calls'), category: 'Scheduling' },

  // Finance
  { slug: 'stripe', name: 'Stripe', tagline: t('Payments & invoices'), category: 'Finance', connectorId: 'payments', popular: true, envKeys: ['STRIPE_SECRET_KEY'] },
  { slug: 'quickbooks', name: 'QuickBooks', tagline: t('Bookkeeping & P&L'), category: 'Finance' },
  { slug: 'xero', name: 'Xero', tagline: t('Accounting & bills'), category: 'Finance' },
  { slug: 'paypal', name: 'PayPal', tagline: t('Payments & payouts'), category: 'Finance', envKeys: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'] },
  { slug: 'wise', name: 'Wise', tagline: t('Multi-currency balances'), category: 'Finance' },
  { slug: 'plaid', name: 'Plaid', tagline: t('Bank connections'), category: 'Finance' },
  // FounderOS merge (/trading). Robinhood has no key: the Markets agent pushes snapshots
  // with TRADING_PUSH_TOKEN. Phantom holds a PUBLIC address, never a key.
  { slug: 'robinhood', name: 'Robinhood', tagline: t('Agent-fed brokerage accounts'), category: 'Finance', connectorId: 'robinhood', envKeys: ['TRADING_PUSH_TOKEN'] },
  { slug: 'phantom', name: 'Phantom', tagline: t('Solana wallet balance (public address)'), category: 'Finance', connectorId: 'phantom', envKeys: ['PHANTOM_WALLET_ADDRESS'] },

  // Marketing
  { slug: 'mailchimp', name: 'Mailchimp', tagline: t('Email campaigns'), category: 'Marketing' },
  { slug: 'googleanalytics', name: 'Google Analytics', tagline: t('Traffic & conversions'), category: 'Marketing' },
  { slug: 'meta', name: 'Meta Ads', tagline: t('Campaigns & audiences'), category: 'Marketing', connectorId: 'meta-ads', envKeys: ['META_ADS_ACCESS_TOKEN'] },
  { slug: 'beehiiv', name: 'beehiiv', tagline: t('Newsletter & subscribers'), category: 'Marketing', connectorId: 'beehiiv', envKeys: ['BEEHIIV_API_KEY'] },
  { slug: 'buffer', name: 'Buffer', tagline: t('Schedule social posts'), category: 'Marketing' },
  { slug: 'hootsuite', name: 'Hootsuite', tagline: t('Social management'), category: 'Marketing' },
  { slug: 'zernio', name: 'Zernio', tagline: t('Cross-platform posting'), category: 'Marketing', connectorId: 'zernio', envKeys: ['ZERNIO_API_KEY'] },
  { slug: 'webinarjam', name: 'WebinarJam', tagline: t('Webinar registrants'), category: 'Marketing', connectorId: 'webinarjam', envKeys: ['WEBINARJAM_API_KEY'] },
  // FounderOS merge (F11): VSL video analytics. Catalogue entry only (T10): no page reads it yet,
  // so the tile can hold a key but never claims connected.
  { slug: 'vidalytics', name: 'Vidalytics', tagline: t('VSL video analytics'), category: 'Marketing', envKeys: ['VIDALYTICS_API_KEY'] },
  { slug: 'trakyo', name: 'Trakyo', tagline: t('Content → clicks → bookings → revenue'), category: 'Marketing', connectorId: 'trakyo', envKeys: ['TRAKYO_API_KEY'] },

  // Storage
  { slug: 'googledrive', name: 'Google Drive', tagline: t('Files & folders'), category: 'Storage' },
  { slug: 'dropbox', name: 'Dropbox', tagline: t('Sync & share'), category: 'Storage' },
  { slug: 'box', name: 'Box', tagline: t('Content cloud'), category: 'Storage' },
  { slug: 'onedrive', name: 'OneDrive', tagline: t('Microsoft files'), category: 'Storage' },
  { slug: 'obsidian', name: 'Notes', tagline: t('Markdown vault'), category: 'Storage', connectorId: 'obsidian', envKeys: [] },

  // AI & Automation
  { slug: 'openai', name: 'OpenAI', tagline: t('GPT models & embeddings'), category: 'AI & Automation' },
  { slug: 'anthropic', name: 'Anthropic', tagline: t('Claude models'), category: 'AI & Automation', popular: true },
  { slug: 'zapier', name: 'Zapier', tagline: t('Automate anything'), category: 'AI & Automation' },
  { slug: 'make', name: 'Make', tagline: t('Visual workflows'), category: 'AI & Automation' },
  { slug: 'n8n', name: 'n8n', tagline: t('Self-hosted automation'), category: 'AI & Automation' },

  // Creative
  { slug: 'figma', name: 'Figma', tagline: t('Design & prototypes'), category: 'Creative', popular: true },
  { slug: 'canva', name: 'Canva', tagline: t('Templates & graphics'), category: 'Creative' },
  { slug: 'miro', name: 'Miro', tagline: t('Whiteboards & maps'), category: 'Creative', connectorId: 'miro', envKeys: ['MIRO_ACCESS_TOKEN'] },
  { slug: 'loom', name: 'Loom', tagline: t('Screen recordings'), category: 'Creative' },
  { slug: 'typeform', name: 'Typeform', tagline: t('Forms & surveys'), category: 'Creative' },
  { slug: 'arcads', name: 'Arcads', tagline: t('AI video ads'), category: 'Creative', connectorId: 'arcads', envKeys: ['ARCADS_BASIC_AUTH'] },
  { slug: 'foreplay', name: 'Foreplay', tagline: t('Ad library & proof'), category: 'Marketing', connectorId: 'foreplay', envKeys: ['FOREPLAY_API_KEY'] },
  { slug: 'apify', name: 'Apify', tagline: t('Scrape posts & creators'), category: 'Marketing', connectorId: 'apify', envKeys: ['APIFY_API_TOKEN'] },
];

export type CatalogEntry = Integration & {
  connected: boolean;
  keySaved: boolean;
  /** A deeper settings page, when the connector has real choices to make. */
  configHref?: string;
  /** Per-capability states, when one green dot would overstate what works. */
  capabilities?: ConnectorCapability[];
};

/** The env var names the connect flow may write for an entry. Explicit
 *  envKeys win; no envKeys = a generic <SLUG>_API_KEY; [] = guidance only
 *  (the tool connects through something other than a pasted key). */
export function connectKeysFor(entry: Integration): string[] {
  if (entry.envKeys) return entry.envKeys;
  return [`${entry.slug.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_API_KEY`];
}

/** Merge live connector state onto the catalog. `connected` is true only when a
 *  linked connector actually reports 'connected' — never faked. `keySaved`
 *  means every connect-flow key for the entry sits in .env.local (pass a fresh
 *  readEnvLocal()); a saved key on a connector-less tile shows as stored, not
 *  connected. */
export function connectionCatalog(
  statuses: ConnectorStatus[],
  savedEnv: Record<string, string> = {},
): CatalogEntry[] {
  const byId = new Map(statuses.map((s) => [s.id, s]));
  return INTEGRATIONS.map((i) => {
    const keys = connectKeysFor(i);
    return {
      ...i,
      connected: i.connectorId ? byId.get(i.connectorId)?.state === 'connected' : false,
      keySaved: keys.length > 0 && keys.every((k) => Boolean(savedEnv[k])),
      configHref: i.connectorId ? byId.get(i.connectorId)?.configHref : undefined,
      capabilities: i.connectorId ? byId.get(i.connectorId)?.capabilities : undefined,
    };
  });
}

/** Catalog grouped by category, in the canonical category order, skipping any
 *  category with no tools. */
export function integrationsByCategory(
  entries: Integration[] = INTEGRATIONS,
): Map<IntegrationCategory, Integration[]> {
  const out = new Map<IntegrationCategory, Integration[]>();
  for (const cat of INTEGRATION_CATEGORIES) {
    const tools = entries.filter((i) => i.category === cat);
    if (tools.length) out.set(cat, tools);
  }
  return out;
}

/**
 * "Popular" on the GladOS Connections board (glados-ui SPEC S05 F05.71): the
 * popular tools that are not connected yet, so a connected tool never shows
 * twice. Empty means the section hides.
 */
export function popularNotConnected<T extends { popular?: boolean; connected: boolean }>(catalog: readonly T[]): T[] {
  return catalog.filter((c) => c.popular && !c.connected);
}

/**
 * Deep-link for "Set up" buttons across the OS: the integrations board tile
 * for this connector (cards carry id={slug} anchors), else the tile whose
 * slug matches, or the board itself when nothing in the catalogue matches.
 */
export function setupHrefFor(connectorId: string): string {
  // a catalogue-only tool (no connector yet, e.g. vidalytics) deep-links by its slug
  const entry = INTEGRATIONS.find((e) => e.connectorId === connectorId) ?? INTEGRATIONS.find((e) => e.slug === connectorId);
  return entry ? `/integrations#${entry.slug}` : '/integrations';
}
