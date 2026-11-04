/**
 * FILMING MODE shim.
 *
 * Surfaces that read live systems (connector health, the unified inbox) have
 * nothing real behind them while filming, so they would render empty. This
 * module supplies scripted stand-ins so the OS films fully populated.
 *
 * Filming mode is chosen by lib/paths.ts — the Settings toggle, DEMO_MODE=1, or
 * neither — and the same switch points every store at demo-data/ instead of
 * data/. Nothing here writes to the real stores. isFilming() is read per call,
 * not latched at import, so the toggle takes effect without a restart on the
 * always-on host.
 */
import type { CommsItem } from '@/lib/comms';
import type { ConnectorStatus } from '@/lib/connectors/types';
import type { CalEvent } from '@/lib/connectors/gcal';
import type { ThreadMessage } from '@/lib/inbox';
import { filmingMode } from '@/lib/paths';
import { dt } from '@/lib/demo/it';

export function isFilming(): boolean {
  return filmingMode();
}

const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();
/** Older filler threads so the 30-day activity chart has a real shape.
    Translated where used (dt), so the locale is read per call, not at import. */
const FILLER = [
  'Following up on the scope we discussed', 'Invoice attached for last month',
  'Can we move the Thursday call?', 'Notes from the review are in the doc',
  'Quick question about the rollout order', 'Sending the signed copy over',
  'Team is aligned, ready to proceed', 'Sharing this with our ops lead',
] as const;
const NAMES = ['Dara Whitfield','Priya Raman','Marcus Alder','Grant Mercer','Elena Sokolov',
  'Theo Bassett','Nina Petrov','Hana Kim','Elias Juniper','Cody Lang','Rowan Hale','Ruben Diaz'] as const;
const SRC = ['email', 'whatsapp', 'slack'] as const;

/**
 * Context health for the Optimal Engine radial, 71-100. The demo brain-store is
 * synthetic and uniformly old, so the real freshness/link score would read
 * near-dead across the board; this deterministic stand-in keeps the ring
 * filming as a healthy brain. Same page always gets the same number.
 */
export function demoContextHealth(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 71 + (Math.abs(h) % 30);
}

/**
 * The tasks board for filming (docs/TASKS-REDESIGN.md). Every panel on
 * /tasks needs a different shape of data to have anything to draw, and the
 * demo host has no real work on it, so this generates all of it relative to
 * TODAY: the board stays populated whenever the clone is reseeded rather than
 * ageing out of the 30-day window.
 *
 * Confined to this clone, like every other generator in this file.
 */
type DemoTask = {
  id: string;
  agentId: string | null;
  title: string;
  status: 'open' | 'doing' | 'blocked' | 'done';
  createdAt: string;
  updatedAt: string;
  detail: string;
  dueAt: string | null;
  priority: 'low' | 'normal' | 'high';
  ownerKind: 'agent' | 'me';
  horizon: 'week' | 'month' | 'quarter' | 'someday' | null;
  runId: string | null;
};

export function demoTasks(): DemoTask[] {
  const now = new Date();
  const DAY = 86_400_000;
  const iso = (d: Date) => d.toISOString();
  const daysAgo = (n: number) => iso(new Date(now.getTime() - n * DAY));
  /** a slot in the current working week, for the calendar grid */
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const slot = (dayIndex: number, hour: number) =>
    iso(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + dayIndex, hour));

  const out: DemoTask[] = [];
  const add = (
    id: string,
    agentId: string | null,
    title: string,
    status: DemoTask['status'],
    opts: Partial<Omit<DemoTask, 'id' | 'agentId' | 'title' | 'status'>> = {},
  ) => {
    const created = opts.createdAt ?? daysAgo(3);
    out.push({
      id, agentId, title, status,
      createdAt: created,
      updatedAt: opts.updatedAt ?? created,
      detail: opts.detail ?? '',
      dueAt: opts.dueAt ?? null,
      priority: opts.priority ?? 'normal',
      ownerKind: opts.ownerKind ?? (agentId ? 'agent' : 'me'),
      horizon: opts.horizon ?? null,
      runId: null,
    });
  };

  // ── fleet work landing across this week, so the grid has cards ──────────
  add('d-t1', 'kanye', dt('Lock the September content angle: the agent-hierarchy series'), 'doing',
    { dueAt: slot(1, 10), priority: 'high', detail: dt('Three-part series. Angle is the org chart dissolving, not the tooling.') });
  add('d-t2', 'drake', dt('Northwind Logistics: send the order form and book the kickoff'), 'doing',
    { dueAt: slot(0, 9), priority: 'high', detail: dt('Order form is signed. Kickoff week needs to clear delivery capacity first.') });
  add('d-t3', 'carti', dt('Cut the 14 minute walkthrough into six verticals'), 'doing',
    { dueAt: slot(2, 13), detail: dt('Hooks at 0:00, 2:40, 6:15, 8:50, 11:05, 12:40.') });
  add('d-t4', 'future', dt('Second-touch schedule for the August cohort'), 'open',
    { dueAt: slot(3, 11), createdAt: daysAgo(6) });
  add('d-t5', 'kendrick', dt('Review the multi-tenant data model'), 'open',
    { dueAt: slot(4, 15), createdAt: daysAgo(8), priority: 'high' });
  add('d-t6', 'don-toliver', dt('Tune the tone gate, two false positives this week'), 'open',
    { dueAt: slot(1, 16), createdAt: daysAgo(4) });
  add('d-t7', 'crm-pulse', dt('Re-score the pipeline after the Ironwood close'), 'doing',
    { dueAt: slot(2, 9), createdAt: daysAgo(2) });
  add('d-t8', 'cudi', dt('Draft the Halcyon rollout one-pager'), 'open',
    { dueAt: slot(3, 14), createdAt: daysAgo(5) });

  // ── blocked: the "Needs you" tile, each saying what it waits on ─────────
  add('d-b1', 'gsend-sender', dt('Send the 45 queued negotiation replies'), 'blocked',
    { createdAt: daysAgo(2), priority: 'high', detail: dt('Waiting on you to approve the send batch. Nothing leaves until you do.') });
  add('d-b2', 'data-agent', dt('Re-index the brain-store after the September import'), 'blocked',
    { createdAt: daysAgo(5), detail: dt('Waiting on a ZeroEntropy key with write scope.') });
  add('d-b3', 'drake', dt('Vertex Freight security questionnaire'), 'blocked',
    { createdAt: daysAgo(1), dueAt: slot(4, 10), priority: 'high', detail: dt('Waiting on your sign-off for the data-retention answer.') });

  // ── your own lane, grouped for the To-Do rail ───────────────────────────
  const mine: [string, string, 'week' | 'month' | 'quarter' | 'someday'][] = [
    [dt('Approve the September send batch'), 'd-m1', 'week'],
    [dt('Call the designer about the demo host'), 'd-m2', 'week'],
    [dt('Record the walkthrough voiceover'), 'd-m3', 'week'],
    [dt('Decide the Q4 pricing tiers'), 'd-m4', 'month'],
    [dt('Hire a second editor'), 'd-m5', 'month'],
    [dt('Move the fleet onto the mini'), 'd-m6', 'quarter'],
    [dt('Write the operator handbook'), 'd-m7', 'quarter'],
    [dt('Open-source the workflow engine'), 'd-m8', 'someday'],
  ];
  mine.forEach(([title, id, horizon], i) => {
    add(id, null, title, 'open', { horizon, createdAt: daysAgo(i + 1), ownerKind: 'me' });
  });

  // ── completed work across the year, so the overview chart has shape ─────
  const finished = [
    dt('Ship the funnel dashboard'), dt('Migrate the brand-deal pipeline'), dt('Rebuild the wizard'),
    dt('Import the Claude archive'), dt('Wire the Attio connector'), dt('Cut the Q2 sizzle reel'),
    dt('Close the Ironwood contract'), dt('Rewrite the onboarding SOP'), dt('Audit the vector index'),
    dt('Ship the blueprint view'), dt('Retire the org chart'), dt('Tune the inbound watcher'),
    dt('Publish module three'), dt('Reconcile the August close'), dt('Fix the tone gate regressions'),
    dt('Onboard Cascade Health'), dt('Batch the September verticals'), dt('Refresh the skills library'),
  ];
  const owners = ['kanye', 'drake', 'carti', 'future', 'kendrick', 'yeat', 'markdown-auditor', 'cudi', 'crm-pulse'];
  finished.forEach((title, i) => {
    // spread back over ten months, heavier in recent ones
    const age = Math.round(4 + i * 16 + (i % 3) * 9);
    add(`d-done-${i}`, owners[i % owners.length], title, 'done', {
      createdAt: daysAgo(age + 6),
      updatedAt: daysAgo(age),
    });
  });

  return out;
}

/** Connector board: mostly wired, a couple honestly still pending. */
export function demoConnectors(): ConnectorStatus[] {
  const c = (id: string, name: string, kind: ConnectorStatus['kind'], detail: string,
             meta?: Record<string, string | number>): ConnectorStatus =>
    ({ id, name, kind, state: 'connected', detail, meta });
  return [
    c('gbrain', 'Optimal Engine', 'knowledge', dt('optimal · 412 pages indexed · hybrid search verified'), { pages: 412 }),
    c('email', 'Email Inboxes', 'email', dt('4 inboxes connected · 37 unread across all'), { inboxes: 4, unread: 37 }),
    c('slack', 'Slack', 'slack', dt('6 channels watched · 14 messages today'), { channels: 6 }),
    c('whatsapp', 'WhatsApp', 'email', dt('318 chats · 22 unread · read-only bridge'), { chats: 318 }),
    c('telegram', 'Telegram', 'email', dt('Approval bot online · 9 drafts announced today')),
    c('gsend', 'gsend', 'email', dt('Verified sender · 6 sends today, all receipted')),
    c('calendar', 'Calendar', 'calendar', dt('3 calendars · 11 events this week'), { events: 11 }),
    c('attio', 'Attio', 'crm', dt('68 open deals · pipeline synced 4m ago'), { deals: 68 }),
    c('zernio', 'Zernio', 'social', dt('4 platforms · 24 posts queued'), { platforms: 4 }),
    c('payments', 'Stripe', 'payments', dt('Live · $84,500 recurring, $12,240 available'), { available: 12240 }),
    c('notion', 'Notion', 'notion', dt('61 pages synced · 3 databases')),
    c('manychat', 'ManyChat', 'social', dt('IG DM automation live · 1,284 conversations'), { conversations: 1284 }),
    c('beehiiv', 'beehiiv', 'ads', dt('18,400 subscribers · 42% open rate'), { subscribers: 18400 }),
    c('wispr', 'Wispr Flow', 'local', dt('2,140 dictations captured'), { dictations: 2140 }),
    c('ghl', 'GoHighLevel', 'crm', dt('Location synced · 41 contacts in pipeline'), { contacts: 41 }),
    c('meta-ads', 'Meta Ads', 'ads', dt('Ad account linked · 3 campaigns active'), { campaigns: 3 }),
    c('apify', 'Apify', 'social', dt('Filming · fixtures, no charges · 3 accounts, 27 creators tracked'), { owned: 3, tracked: 27 }),
  ];
}

/** One connector's scripted status, by id — for pages that probe a single one. */
export function demoConnector(id: string): ConnectorStatus | null {
  return demoConnectors().find((c) => c.id === id) ?? null;
}

type Thread = [CommsItem['source'], string, string, number, number?, string?];

/** The unified inbox: a believable morning across four channels. */
export function demoComms(): CommsItem[] {
  const threads: Thread[] = [
    ['email', 'Dara Whitfield — Northwind Logistics', dt('Order form is signed and back with you. When can the team start onboarding?'), 14, 2, 'whitfield@northwind.example'],
    ['whatsapp', 'Sol Vantage (brand)', dt('Sending the campaign brief over this afternoon — can you review before Friday?'), 26, 1],
    ['email', 'Priya Raman — Halcyon Dental', dt('Partners reviewed the proposal. Two questions on the rollout order.'), 48, 1, 'raman@halcyon.example'],
    ['slack', '#delivery — Juno Bellamy', dt('Ironwood environment is provisioned. Security review is the last gate.'), 63, 1],
    ['email', 'Grant Mercer — Ironwood Legal', dt('Our GC cleared the contract. Sending the countersigned copy today.'), 92, 1, 'mercer@ironwood.example'],
    ['whatsapp', 'Mars Delacroix', dt('Shot the walkthrough this morning — footage is in the drive.'), 110, 1],
    ['email', 'Elena Sokolov — Vertex Freight', dt('Security questionnaire attached. Procurement needs it back by the 29th.'), 145, 1, 'sokolov@vertex.example'],
    ['slack', '#pipeline — Sable Whitmore', dt('Kestrel moved to a Q4 timeline. Parking it in nurture.'), 168, undefined],
    ['email', 'Marcus Alder — Brightpath Realty', dt('Partner meeting is set for Tuesday. Can you join for 15 minutes?'), 190, 1, 'alder@brightpath.example'],
    ['whatsapp', 'Theo Bassett — Lumen Studios', dt('The editing pipeline scope looks right. What is the lead time?'), 220, 1],
    ['email', 'Cassian & Vale', dt('August close is done. Nine lines still need a category before we file.'), 265, 1, 'team@cassianvale.example'],
    ['slack', '#alerts — Yeat', dt('Delivery host disk crossed 70%. Cleared 12GB of build cache.'), 300, undefined],
    ['email', 'Ruben Diaz — Atlas Media', dt('Finished module 3. The agent-routing section finally made it click.'), 340, undefined, 'diaz@atlasmedia.example'],
    ['whatsapp', 'Koda Reyes', dt('Two inbound partnership asks from the conference. Forwarding now.'), 380, 2],
    ['email', 'Nina Petrov — Solace Interiors', dt('Circling back on the automation quote from last month.'), 430, 1, 'petrov@solace.example'],
    ['slack', '#content — Remy Alvarez', dt('The vertical cut is outperforming the long form 3:1 on saves.'), 470, undefined],
    ['email', 'Hana Kim — Orbit Labs', dt('Payment plan works for us. Where do I sign?'), 520, 1, 'kim@orbitlabs.example'],
    ['whatsapp', 'Elias Juniper', dt('Technical walkthrough Thursday still good on your end?'), 560, 1],
    ['email', 'Dr. Amara Osei — Cascade Health', dt('Sharing the one-pager with our ops committee this week.'), 610, undefined, 'osei@cascade.example'],
    ['slack', '#delivery — Vince Staples', dt('Brightpath usage down 30% week over week. Opening a check-in.'), 660, 1],
    ['email', 'Sasha Bright — Quill Agency', dt('Enrolled and started module 1. This is exactly what I needed.'), 720, undefined, 'bright@quill.example'],
    ['whatsapp', 'Atlas Nguyen', dt('Multi-tenant model review notes are in the doc.'), 790, undefined],
  ];
  // deterministic older traffic spread across the full trailing month, with a
  // weekday-ish rhythm so the activity chart has shape instead of a flat wall
  let n = 0;
  for (let day = 1; day < 30; day++) {
    const weekday = (day * 3 + 2) % 7;
    const perDay = weekday === 0 || weekday === 6 ? 1 + (day % 2) : 3 + ((day * 5) % 4);
    for (let k = 0; k < perDay; k++) {
      const mins = day * 1440 + 540 + k * 137 + ((day * 31 + k * 17) % 220);
      threads.push([
        SRC[(day + k) % SRC.length],
        NAMES[(day * 2 + k) % NAMES.length],
        dt(FILLER[(day + k * 3) % FILLER.length]),
        mins,
        undefined,
        undefined,
      ]);
      n++;
    }
  }
  return threads.map(([source, title, preview, mins, unread, replyTo]) => ({
    source,
    title,
    preview,
    ts: ago(mins),
    ...(unread ? { unread } : {}),
    sender: title.split(' — ')[0].replace(/^#\S+\s—\s/, ''),
    ...(replyTo ? { replyTo, account: 'inbox-1' } : {}),
    ...(mins < 200 ? { priority: (mins < 60 ? 1 : 2) as 1 | 2 } : {}),
  }));
}

/** Posting history for the consistency chart — a believable publish cadence. */
export function demoPostDays(): { date: string; platforms: string[] }[] {
  const out: { date: string; platforms: string[] }[] = [];
  const COMBOS = [
    ['instagram', 'tiktok'], ['instagram'], ['youtube'], ['instagram', 'tiktok', 'linkedin'],
    ['linkedin'], ['instagram', 'youtube'], ['tiktok'],
  ];
  for (let d = 0; d < 90; d++) {
    const day = new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
    const weekday = new Date(day).getUTCDay();
    // 5-6 posting days a week, 1-2 posts on each
    if (weekday === 0 || (weekday === 6 && d % 3 === 0)) continue;
    const n = d % 4 === 0 ? 2 : 1;
    for (let k = 0; k < n; k++) out.push({ date: day, platforms: COMBOS[(d + k) % COMBOS.length] });
  }
  return out;
}


/** The week's meetings for /inbox — three calendars, a believable operator week. */
export function demoEvents(): CalEvent[] {
  const now = new Date();
  const day = (offset: number, h: number, m = 0) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, h, m);
    return d.toISOString();
  };
  const ev = (
    id: string, account: string, color: string, title: string, offset: number, h: number, m: number, mins: number,
    extra: Partial<Pick<CalEvent, 'location' | 'joinUrl' | 'allDay'>> = {},
  ): CalEvent => ({
    id, account, color, title, start: day(offset, h, m), end: day(offset, h, m + mins), allDay: false,
    location: null, joinUrl: null, ...extra,
  });
  return [
    ev('e1', 'Work', '#5ec9f8', dt('Northwind onboarding kickoff'), 0, 14, 0, 45, { joinUrl: 'https://meet.example/northwind' }),
    ev('e2', 'Work', '#5ec9f8', dt('Ironwood security review'), 0, 16, 30, 30, { joinUrl: 'https://meet.example/ironwood' }),
    ev('e3', 'Personal', '#3df08c', dt('Gym'), 0, 18, 30, 60, { location: 'Equinox' }),
    ev('e4', 'Work', '#5ec9f8', dt('Brightpath partner meeting'), 1, 10, 0, 30, { joinUrl: 'https://meet.example/brightpath' }),
    ev('e5', 'Content', '#e1306c', dt('Walkthrough edit review with Mars'), 1, 13, 0, 45),
    ev('e6', 'Work', '#5ec9f8', dt('Lumen Studios scope call'), 2, 11, 0, 30, { joinUrl: 'https://meet.example/lumen' }),
    ev('e7', 'Work', '#5ec9f8', dt('Halcyon rollout Q&A'), 2, 15, 0, 30, { joinUrl: 'https://meet.example/halcyon' }),
    ev('e8', 'Content', '#e1306c', dt('Film day'), 3, 9, 0, 240, { location: 'Studio B' }),
    ev('e9', 'Work', '#5ec9f8', dt('Vertex procurement follow-up'), 4, 10, 30, 30, { joinUrl: 'https://meet.example/vertex' }),
    ev('e10', 'Personal', '#3df08c', dt('Dinner with Koda'), 4, 19, 0, 120, { location: 'Miku' }),
    ev('e11', 'Work', '#5ec9f8', dt('Weekly pipeline review'), -1, 9, 30, 30),
    ev('e12', 'Work', '#5ec9f8', dt('Orbit Labs payment plan'), -1, 14, 0, 30),
  ];
}

/** Scripted histories for the named /inbox threads, keyed by sender. Each is
    the exchange that led to the latest line in `demoComms`. */
export function demoThreadBodies(): Record<string, ThreadMessage[]> {
  const t = (mins: number) => ago(mins);
  const x = (sender: string, ...turns: [ThreadMessage['from'], string, number][]): [string, ThreadMessage[]] => [
    sender,
    turns.map(([from, text, mins]) => ({ from, text, ts: t(mins) })),
  ];
  return Object.fromEntries([
    x('Dara Whitfield',
      ['me', dt('Order form is attached. Once it is signed we can lock the onboarding week.'), 2 * 1440 + 30],
      ['them', dt('Legal had one wording change on the data clause, sending back shortly.'), 1440 + 200],
      ['me', dt('Change accepted. Countersigned copy is on its way back to you now.'), 1440 + 90],
      ['them', dt('Order form is signed and back with you. When can the team start onboarding?'), 14],
    ),
    x('Sol Vantage',
      ['them', dt('We want to run the Q4 launch through your team again. Same format as last time?'), 3 * 1440],
      ['me', dt('Same format works. Send the brief when it is ready and I will scope the deliverables.'), 3 * 1440 - 40],
      ['them', dt('Sending the campaign brief over this afternoon — can you review before Friday?'), 26],
    ),
    x('Priya Raman',
      ['me', dt('Proposal attached. The rollout order is front desk first, then the two clinics.'), 4 * 1440],
      ['them', dt('Partners reviewed the proposal. Two questions on the rollout order.'), 48],
    ),
    x('Juno Bellamy',
      ['them', dt('Provisioning Ironwood today. Security review is scheduled for 4:30.'), 300],
      ['them', dt('Ironwood environment is provisioned. Security review is the last gate.'), 63],
    ),
    x('Grant Mercer',
      ['me', dt('Contract is with your GC. Let me know if the indemnity language needs another pass.'), 5 * 1440],
      ['them', dt('Our GC cleared the contract. Sending the countersigned copy today.'), 92],
    ),
    x('Mars Delacroix',
      ['me', dt('Walkthrough shoot is tomorrow morning. Drop the footage in the shared drive when done.'), 1440 + 60],
      ['them', dt('Shot the walkthrough this morning — footage is in the drive.'), 110],
    ),
    x('Elena Sokolov',
      ['them', dt('Procurement wants a security questionnaire before they issue the PO.'), 2 * 1440],
      ['me', dt('Send it over and I will turn it around this week.'), 2 * 1440 - 30],
      ['them', dt('Security questionnaire attached. Procurement needs it back by the 29th.'), 145],
    ),
    x('Marcus Alder',
      ['them', dt('Partner meeting is set for Tuesday. Can you join for 15 minutes?'), 190],
    ),
    x('Theo Bassett',
      ['me', dt('Scope for the editing pipeline is in the doc: intake, rough cut, review, delivery.'), 1440 + 30],
      ['them', dt('The editing pipeline scope looks right. What is the lead time?'), 220],
    ),
    x('Hana Kim',
      ['me', dt('Two options: pay in full, or three monthly payments starting on signature.'), 2 * 1440],
      ['them', dt('Payment plan works for us. Where do I sign?'), 520],
    ),
    x('Elias Juniper',
      ['me', dt('Thursday 11am for the technical walkthrough. I will send the invite.'), 3 * 1440],
      ['them', dt('Technical walkthrough Thursday still good on your end?'), 560],
    ),
    x('Nina Petrov',
      ['them', dt('Circling back on the automation quote from last month.'), 430],
    ),
  ]);
}
