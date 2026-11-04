import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { dataPath } from '@/lib/paths';
import { dt } from './it';

/**
 * The demo Optimal Engine store: markdown pages written from the seeded demo
 * database (demo-data/glados.db), so every page, link and folder agrees with
 * the rest of the demo company. Also writes demo-data/bin/gbrain, the stub CLI
 * demo mode calls in place of the real engine (lib/stores.ts). Returns the
 * number of pages written.
 *
 * Page text goes through dt() (./it.ts), so the store speaks the demo's locale;
 * file names, slugs and [[links]] stay English in every locale.
 */
export function writeDemoBrain(): number {


  const db = new Database(dataPath('glados.db'), { readonly: true });
  const root = dataPath('brain');
  fs.rmSync(root, { recursive: true, force: true });

  type Row = Record<string, unknown>;
  const all = (sql: string): Row[] => db.prepare(sql).all() as Row[];
  const s = (v: unknown): string => (v == null ? '' : String(v));
  const slugify = (v: string): string =>
    v.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  let pages = 0;
  function page(folder: string, slug: string, title: string, tags: string[], body: string): void {
    const dir = path.join(root, folder);
    fs.mkdirSync(dir, { recursive: true });
    const fm = `---\ntitle: ${title}\ntype: ${folder}\ntags: [${tags.join(', ')}]\n---\n\n`;
    fs.writeFileSync(path.join(dir, `${slug}.md`), `${fm}# ${title}\n\n${body.trim()}\n`);
    pages += 1;
  }
  const link = (slug: string) => `[[${slug}]]`;

  const departments = all('SELECT * FROM departments ORDER BY "order"');
  const agents = all('SELECT * FROM agents');
  const people = all('SELECT * FROM people');
  const tools = all('SELECT * FROM tools');
  const sops = all('SELECT * FROM sop_tasks');
  const skills = all('SELECT * FROM skills ORDER BY ord');
  const workflows = all('SELECT * FROM workflows ORDER BY ord');
  const roadmap = all('SELECT * FROM roadmap_items');
  const magnets = all('SELECT * FROM lead_magnets');
  const contacts = all('SELECT * FROM funnel_contacts');

  const deptSlug = (id: unknown) => `dept-${s(departments.find((d) => d.id === id)?.slug ?? 'general')}`;
  const agentSlug = (id: unknown) => `agent-${s(id)}`;

  // ── Ventures ─────────────────────────────────────────────────────────────────
  const VENTURES: Record<string, { title: string; body: string }> = {
    vantage: {
      title: 'Vantage',
      body: dt('The done-for-you arm. Builds AI intake and operations systems for service businesses, sold as a fixed sprint or a monthly retainer. Delivery runs through the Clients pillar; pipeline through Sales.'),
    },
    'launchpad-cohort': {
      title: 'Launchpad Cohort',
      body: dt('The mentorship programme. Six weeks, live, a small group building their own operating system with guidance. Sold paid-in-full or on a three-payment plan; leads arrive from the webinar and Instagram DMs.'),
    },
  };
  for (const [id, v] of Object.entries(VENTURES)) {
    const members = contacts.filter((c) => c.venture === id);
    page(
      'companies',
      `venture-${id}`,
      v.title,
      ['venture'],
      `${v.body}\n\n${dt('## Pipeline')}\n\n${members.map((c) => `- ${link(`contact-${s(c.id).replace(/^fc-/, '')}`)}`).join('\n')}\n\n${dt('Owned by {a} and {b}.', { a: link(deptSlug('dept-sales')), b: link(deptSlug('dept-clients')) })}`,
    );
  }

  // ── Departments ──────────────────────────────────────────────────────────────
  for (const d of departments) {
    const own = agents.filter((a) => a.department_id === d.id);
    const humans = people.filter((p) => p.department_id === d.id);
    const work = sops.filter((t) => t.department_id === d.id);
    page(
      'org',
      deptSlug(d.id),
      s(d.name),
      ['department', s(d.slug)],
      `${s(d.tagline)}\n\n${dt('## Agents')}\n\n${own.map((a) => `- ${link(agentSlug(a.id))}: ${s(a.role)}`).join('\n') || dt('- none yet')}\n\n${dt('## People')}\n\n${humans.map((p) => `- ${link(`person-${s(p.id).replace(/^person-/, '')}`)}`).join('\n') || dt('- none yet')}\n\n${dt('## Standard work')}\n\n${work.map((t) => `- ${link(`sop-${s(t.id)}`)}`).join('\n') || dt('- none written down')}`,
    );
  }

  // ── Agents ───────────────────────────────────────────────────────────────────
  for (const a of agents) {
    const toolList = (JSON.parse(s(a.tools) || '[]') as string[]).map((t) => link(`tool-${t}`)).join(', ');
    const parent = a.parent_id ? dt('Reports to {parent}.', { parent: link(agentSlug(a.parent_id)) }) : dt('Leads its pillar.');
    page(
      'org',
      agentSlug(a.id),
      s(a.name),
      ['agent', s(a.tier)],
      `${dt('**{role}** in {dept}. {parent}', { role: s(a.role), dept: link(deptSlug(a.department_id)), parent })}\n\n${s(a.description)}\n\n${dt('Tools: {tools}.', { tools: toolList || dt('none') })}\n${dt('Model: {model}.', { model: s(a.model) })}`,
    );
  }

  // ── People ───────────────────────────────────────────────────────────────────
  for (const p of people) {
    page(
      'people',
      `person-${s(p.id).replace(/^person-/, '')}`,
      s(p.name),
      ['team'],
      `${s(p.role)}, ${link(deptSlug(p.department_id))}.\n\n${dt('Works in: {tools}.', { tools: (JSON.parse(s(p.tools) || '[]') as string[]).map((t) => link(`tool-${t}`)).join(', ') })}`,
    );
  }

  // ── Contacts and their companies ─────────────────────────────────────────────
  const companies = new Map<string, string[]>();
  for (const c of contacts) {
    const [person, companyFromName] = s(c.name).split(' — ');
    const company = s(c.company) || companyFromName || '';
    const slug = `contact-${s(c.id).replace(/^fc-/, '')}`;
    if (company) companies.set(company, [...(companies.get(company) ?? []), slug]);
    const deal = c.product ? `\n\n${dt('Deal: {product}, {amount}.', { product: s(c.product), amount: `$${Number(c.amount_usd ?? 0).toLocaleString('en-US')}` })}` : '';
    const companyLink = company ? link(`company-${slugify(company)}`) : '';
    page(
      'people',
      slug,
      person,
      ['contact', s(c.relationship)],
      `${s(c.role) ? (company ? dt('{role} at {company}. ', { role: s(c.role), company: companyLink }) : `${s(c.role)}. `) : company ? dt('At {company}. ', { company: companyLink }) : ''}${dt('In the {venture} pipeline, {relationship} with a {likelihood}% likelihood to buy.', { venture: link(`venture-${s(c.venture)}`), relationship: s(c.relationship), likelihood: s(c.likelihood) })}${deal}\n\n${dt('Owner: {owner}.', { owner: link(agentSlug('sales-agent')) })}`,
    );
  }
  for (const [company, members] of companies) {
    page(
      'companies',
      `company-${slugify(company)}`,
      company,
      ['client'],
      `${dt('Client account. People: {people}.', { people: members.map(link).join(', ') })}\n\n${dt('Delivery tracked by {dept}.', { dept: link(deptSlug('dept-clients')) })}`,
    );
  }

  // ── Tools ────────────────────────────────────────────────────────────────────
  for (const t of tools) {
    // Tool ids are already tool-<slug>, the form agents and people link to.
    page('hub', s(t.id).startsWith('tool-') ? s(t.id) : `tool-${s(t.id)}`, s(t.name), ['tool', slugify(s(t.category))], `${s(t.description)}\n\n${dt('Category: {category}. Status: {status}.', { category: s(t.category), status: s(t.status) })}`);
  }

  // ── Standard work, skills, workflows, roadmap, lead magnets ──────────────────
  for (const t of sops) {
    const steps = (JSON.parse(s(t.steps) || '[]') as string[]).map((x, i) => `${i + 1}. ${x}`).join('\n');
    const who = t.assignee_kind === 'agent' ? link(agentSlug(t.assignee_id)) : link(`person-${s(t.assignee_id).replace(/^person-/, '')}`);
    page('writing', `sop-${s(t.id)}`, s(t.title), ['sop'], `${s(t.summary)}\n\n${dt('Owner: {who}, {dept}.', { who, dept: link(deptSlug(t.department_id)) })}\n\n${steps}`);
  }
  for (const k of skills) {
    page('writing', `skill-${s(k.id)}`, s(k.name), ['skill', slugify(s(k.category))], `${s(k.description)}\n\n${dt('Run by {agent}.', { agent: link(agentSlug(k.owner_agent_id)) })}`);
  }
  for (const w of workflows) {
    const steps = JSON.parse(s(w.steps) || '[]') as { name?: string; title?: string; owner?: string }[];
    page(
      'projects',
      `workflow-${s(w.id)}`,
      s(w.name),
      ['workflow'],
      `${s(w.subtitle)}\n\n${steps.map((st, i) => `${i + 1}. ${st.name ?? st.title ?? dt('Step')}`).join('\n')}\n\n${dt('Revenue it carries: {amount}. See {a} and {b}.', { amount: `$${Number(w.revenue_usd ?? 0).toLocaleString('en-US')}`, a: link('venture-vantage'), b: link('venture-launchpad-cohort') })}`,
    );
  }
  for (const r of roadmap) {
    page('projects', `roadmap-${s(r.id)}`, s(r.title), ['roadmap', s(r.status)], `${s(r.description)}\n\n${s(r.quarter)}, ${s(r.status)}.${r.department_id ? dt(' Pillar: {dept}.', { dept: link(deptSlug(r.department_id)) }) : ''}`);
  }
  for (const m of magnets) {
    page('ideas', `magnet-${s(m.id)}`, s(m.name), ['lead-magnet', s(m.status)], `${s(m.offer)}\n\n${dt('Campaign: {campaign}.', { campaign: s(m.campaign) })}\n\n${s(m.notes)}\n\n${dt('Feeds {venture}.', { venture: link('venture-launchpad-cohort') })}`);
  }

  // ── Meetings: one call note per contact who reached a deal ───────────────────
  const now = Date.now();
  contacts
    .filter((c) => c.product)
    .forEach((c, i) => {
      const [person] = s(c.name).split(' — ');
      const date = new Date(now - (i * 3 + 1) * 86_400_000).toISOString().slice(0, 10);
      page(
        'meetings',
        `call-${date}-${s(c.id).replace(/^fc-/, '')}`,
        dt('Call with {person}', { person }),
        ['meeting', 'sales-call'],
        `${dt('{date}. {contact} on {product}.', { date, contact: link(`contact-${s(c.id).replace(/^fc-/, '')}`), product: s(c.product) })}\n\n${dt('- Walked through the current week and where the hours go')}\n${dt('- Agreed scope and start date; {agent} sends the proposal', { agent: link(agentSlug('sales-agent')) })}\n${dt('- Follow-up owned by {agent}', { agent: link(agentSlug('comms-agent')) })}`,
      );
    });

  // ── Inbox: the notes the comms crew keeps on what comes in ────────────────────
  const today = new Date(now).toISOString().slice(0, 10);
  page(
    'inbox',
    `daily-briefing-${today}`,
    dt('Daily briefing'),
    ['briefing', 'comms'],
    `${dt('{date}. Built at 7am by {agent} from every inbox, Slack and the calendar.', { date: today, agent: link(agentSlug('ag-vera')) })}\n\n${dt('- Two clients waiting on a reply: {clients}', { clients: [...companies.keys()].slice(0, 2).map((c) => link(`company-${slugify(c)}`)).join(', ') })}\n${dt('- Brand deal pipeline: four drafts need approval before noon')}\n${dt('- The pipeline moved: one deal to opted in, one stalled for a week')}\n${dt('- Kickoff today, prep pack from {agent}', { agent: link(agentSlug('ag-pike')) })}`,
  );
  page(
    'inbox',
    'sender-rules',
    dt('Sender rules'),
    ['comms', 'policy'],
    `${dt('Who gets an answer from an agent and who waits for a human.')}\n\n${dt('- A known client sender goes to {agent}, drafted, never sent without sign-off', { agent: link(agentSlug('ag-vera')) })}\n${dt('- A brand deal sender goes to the approval queue with the quote parsed')}\n${dt('- A new sender with a pricing question is scored by {agent} against the ICP first', { agent: link(agentSlug('ag-beacon')) })}\n${dt('- Anything about money owed goes to {agent}', { agent: link(agentSlug('ag-brisk')) })}`,
  );

  db.close();

  // ── The stub CLI ─────────────────────────────────────────────────────────────
  const bin = dataPath('bin', 'gbrain');
  fs.mkdirSync(path.dirname(bin), { recursive: true });
  fs.writeFileSync(
    bin,
    `#!/usr/bin/env node
  // Filming stub for the engine CLI: answers doctor, stats, query and capture from
  // the markdown store next to it (demo-data/brain). Written by scripts/demo-brain.ts.
  const fs = require('fs');
  const path = require('path');
  const store = path.join(__dirname, '..', 'brain');
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.md') ? [path.join(d, e.name)] : []);
  const files = fs.existsSync(store) ? walk(store) : [];
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'doctor') {
    process.stdout.write(JSON.stringify({ status: 'ok', health_score: 96, version: '0.14.2', checks: [
      { name: 'store', status: 'ok', message: files.length + ' pages on disk' },
      { name: 'embeddings', status: 'ok', message: 'all chunks embedded' },
      { name: 'links', status: 'ok', message: 'no dangling wikilinks' },
    ] }));
  } else if (cmd === 'stats') {
    const byType = {};
    for (const f of files) { const t = path.relative(store, f).split(path.sep)[0]; byType[t] = (byType[t] || 0) + 1; }
    const chunks = files.length * 3;
    process.stdout.write('Pages: ' + files.length + '\\nChunks: ' + chunks + '\\nEmbedded: ' + chunks + '\\nBy type:\\n' + Object.entries(byType).map(([t, n]) => '  ' + t + ': ' + n).join('\\n') + '\\n');
  } else if (cmd === 'query') {
    const q = (rest[0] || '').toLowerCase().split(/\\s+/).filter(Boolean);
    const hits = files.map((f) => {
      const text = fs.readFileSync(f, 'utf8');
      const low = text.toLowerCase();
      const score = q.reduce((n, w) => n + (low.split(w).length - 1), 0);
      const body = text.replace(/^---[\\s\\S]*?\\n---\\n/, '');
      const line = body.split('\\n').find((l) => l && !l.startsWith('#') && q.some((w) => l.toLowerCase().includes(w))) || '';
      return { slug: path.relative(store, f).replace(/\\.md$/, ''), score, line };
    }).filter((h) => h.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
    const top = hits[0] ? hits[0].score : 1;
    process.stdout.write(hits.map((h) => '[' + (0.5 + 0.45 * h.score / top).toFixed(2) + '] ' + h.slug + ' -- ' + h.line.trim().slice(0, 160)).join('\\n') + '\\n');
  } else if (cmd === 'capture') {
    process.stdout.write(JSON.stringify({ slug: 'inbox/capture-' + Date.now(), content_hash: 'demo' }));
  } else {
    process.stdout.write('gbrain 0.14.2 (filming stub)\\n');
  }
  `,
  );
  fs.chmodSync(bin, 0o755);
  return pages;
}
