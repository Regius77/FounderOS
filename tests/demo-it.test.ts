import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import fs, { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import IT, { dt, localizeCompany } from '@/lib/demo/it';

/**
 * The demo company in Italian (lib/demo/it.ts). The English source stays the
 * key; GLADOS_LOCALE=it writes the demo store's readable text in Italian and
 * leaves every name, id and path alone. The store is built into a temp project
 * root here, never the repo's.
 */

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
const numbers = (s: string) => (s.match(/\d+/g) ?? []).sort();
const urls = (s: string) => (s.match(/https?:\/\/\S+/g) ?? []).sort();

describe('the demo dictionary', () => {
  test('every entry is non-empty and keeps its placeholders, numbers and URLs', () => {
    const entries = Object.entries(IT);
    expect(entries.length).toBeGreaterThan(300);
    for (const [en, it] of entries) {
      expect(typeof it, en).toBe('string');
      expect(it.trim().length, en).toBeGreaterThan(0);
      expect(placeholders(it), en).toEqual(placeholders(en));
      expect(numbers(it), en).toEqual(numbers(en));
      expect(urls(it), en).toEqual(urls(en));
    }
  });

  test('markdown structure survives: headings stay headings', () => {
    for (const [en, it] of Object.entries(IT)) {
      expect(it.startsWith('#'), en).toBe(en.startsWith('#'));
      expect(it.split('\n').length, en).toBe(en.split('\n').length);
    }
  });

  test('English is the identity', () => {
    vi.stubEnv('GLADOS_LOCALE', '');
    const company = { title: 'Board pack', id: 'Board pack' };
    expect(localizeCompany(company)).toBe(company);
    expect(dt('Call with {person}', { person: 'Dana' })).toBe('Call with Dana');
    vi.unstubAllEnvs();
  });

  test('only readable fields change, never ids, names or status values', () => {
    vi.stubEnv('GLADOS_LOCALE', 'it');
    const out = localizeCompany({ a: [{ id: 'Board pack', status: 'completed', title: 'Board pack', summary: 'completed', name: 'Atlas' }], Growth: 'x' });
    expect(out).toEqual({ a: [{ id: 'Board pack', status: 'completed', title: 'Board pack', summary: 'completato', name: 'Atlas' }], Growth: 'x' });
    expect(dt('Call with {person}', { person: 'Dana' })).toBe('Call con Dana');
    vi.unstubAllEnvs();
  });
});

describe('Filming stand-ins in Italian (lib/demo-mode.ts)', () => {
  test('tasks, inbox and connectors speak Italian; names stay as they are', async () => {
    vi.stubEnv('GLADOS_LOCALE', 'it');
    const { demoTasks, demoComms, demoConnector, demoThreadBodies } = await import('@/lib/demo-mode');
    const task = demoTasks().find((x) => x.id === 'd-t2');
    expect(task?.title).toBe('Northwind Logistics: inviare l’order form e fissare il kickoff');
    expect(task?.agentId).toBe('drake');
    const dara = demoComms().find((c) => c.sender === 'Dara Whitfield');
    expect(dara?.title).toBe('Dara Whitfield — Northwind Logistics');
    expect(dara?.preview).toMatch(/^L’order form è firmato/);
    // the thread's last message is the inbox preview, word for word
    expect(demoThreadBodies()['Dara Whitfield'].at(-1)?.text).toBe(dara?.preview);
    expect(demoConnector('email')).toMatchObject({ name: 'Email Inboxes', detail: '4 caselle collegate · 37 non letti in tutto' });
    vi.stubEnv('GLADOS_LOCALE', '');
    expect(demoConnector('email')?.detail).toBe('4 inboxes connected · 37 unread across all');
    vi.unstubAllEnvs();
  });
});

describe('the demo store in Italian', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'founderos-demo-it-'));
  const dir = path.join(root, 'demo-data');
  let cwd: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    cwd = vi.spyOn(process, 'cwd').mockReturnValue(root);
    vi.stubEnv('GLADOS_MODE_FILE', path.join(root, '.glados-mode'));
    vi.stubEnv('GLADOS_DEFAULT_MODE', 'demo');
    vi.stubEnv('GLADOS_LOCALE', 'it');
  });
  afterAll(() => {
    cwd.mockRestore();
    vi.unstubAllEnvs();
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('builds with Italian text and English names', async () => {
    const { invalidateModeCache } = await import('@/lib/paths');
    invalidateModeCache();
    const { ensureDemoStore, demoStoreStale } = await import('@/lib/demo/store');
    expect(demoStoreStale()).toBe(true);
    ensureDemoStore();
    expect(demoStoreStale()).toBe(false);
    expect(fs.readFileSync(path.join(dir, '.demo-locale'), 'utf8').trim()).toBe('it');

    const db = new Database(path.join(dir, 'glados.db'), { readonly: true });
    const one = <T>(sql: string, ...args: unknown[]) => db.prepare(sql).get(...args) as T;
    try {
      // a roadmap item, a task, an agent role, a DM, a tool and a phase
      expect(one<{ title: string; description: string }>('SELECT title, description FROM roadmap_items WHERE id = ?', 'rm-v1')).toEqual({
        title: 'Base di FOUNDER OS v1',
        description: 'Sei viste, repo SQLite, 32 test.',
      });
      expect(one<{ title: string }>('SELECT title FROM agent_tasks WHERE id = ?', 'task-001').title).toBe(
        'Riscrivere l’email di onboarding perché non nasconda più il link al calendario',
      );
      const atlas = one<{ name: string; role: string }>('SELECT name, role FROM agents WHERE id = ?', 'ag-atlas');
      expect(atlas).toEqual({ name: 'Atlas', role: 'Gestisce il piano settimanale e insegue ciò che è slittato' });
      expect(one<{ name: string }>('SELECT name FROM agents WHERE id = ?', 'conductor').name).toBe('Conductor');
      const dm = one<{ name: string; text: string }>("SELECT name, text FROM social_dm_messages WHERE text LIKE 'Ciao, ho visto%'");
      expect(dm.name).toBe('Kestrel Health');
      expect(one<{ title: string }>('SELECT title FROM phases WHERE id = ?', 'phase-2').title).toBe('Agenti reali');
      expect(one<{ status: string }>('SELECT status FROM roadmap_items WHERE id = ?', 'rm-v1').status).toBe('done');
      const contact = one<{ name: string; company: string; product: string }>('SELECT name, company, product FROM funnel_contacts WHERE id = ?', 'contact-0');
      expect(contact).toEqual({ name: 'Halden & Roe', company: 'Halden & Roe', product: 'Deployment + 90 giorni' });
    } finally {
      db.close();
    }

    // files: the Wizard, drift and the brand-deal summaries
    const projects = JSON.parse(fs.readFileSync(path.join(dir, 'wizard', 'projects.json'), 'utf8')) as { id: string; name: string }[];
    expect(projects.find((p) => p.id === 'wp-september')?.name).toBe('Chiudere settembre');
    const drift = JSON.parse(fs.readFileSync(path.join(dir, 'drift.json'), 'utf8')) as { claim: string; canon: { file: string } }[];
    expect(drift[0]).toMatchObject({ claim: 'L’onboarding richiede tre settimane', canon: { file: 'writing/sop-sop-10.md' } });
    const state = JSON.parse(fs.readFileSync(path.join(dir, 'bdpilot', 'state.json'), 'utf8')) as { summaries: Record<string, string>; chains: Record<string, string[]> };
    expect(state.summaries['r-1040']).toMatch(/^Meridian Tools vuole /);
    expect(state.chains['r-1040'][0]).toMatch(/^Full chain, 2 messages\n/);

    // skill folders and brain files keep their English paths; page text is Italian
    expect(fs.existsSync(path.join(dir, 'skills', 'answer-a-pricing-question-without-discounting', 'SKILL.md'))).toBe(true);
    const rules = fs.readFileSync(path.join(dir, 'brain', 'inbox', 'sender-rules.md'), 'utf8');
    expect(rules).toContain('# Regole sui mittenti');
    expect(rules).toContain('[[agent-ag-vera]]');
    const sop = fs.readFileSync(path.join(dir, 'brain', 'writing', 'sop-sop-10.md'), 'utf8');
    expect(sop).toContain('# Preparare un pacchetto di onboarding');
  }, 60_000);

  test('a store built in another locale is stale, and rebuilding fixes it', async () => {
    const { demoStoreStale, ensureDemoStore } = await import('@/lib/demo/store');
    expect(demoStoreStale()).toBe(false);
    vi.stubEnv('GLADOS_LOCALE', 'en');
    expect(demoStoreStale()).toBe(true);
    ensureDemoStore();
    expect(demoStoreStale()).toBe(false);
    expect(fs.readFileSync(path.join(dir, '.demo-locale'), 'utf8').trim()).toBe('en');
    const db = new Database(path.join(dir, 'glados.db'), { readonly: true });
    try {
      expect((db.prepare('SELECT title FROM roadmap_items WHERE id = ?').get('rm-v1') as { title: string }).title).toBe('FOUNDER OS v1 baseline');
    } finally {
      db.close();
    }
    vi.stubEnv('GLADOS_LOCALE', 'it');
    expect(demoStoreStale()).toBe(true);
    // a store from before the locale marker was built in English
    fs.rmSync(path.join(dir, '.demo-locale'));
    expect(demoStoreStale()).toBe(true);
    vi.stubEnv('GLADOS_LOCALE', '');
    expect(demoStoreStale()).toBe(false);
  }, 60_000);
});
