import fs from 'node:fs';
import path from 'node:path';
import { openDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';
import { assertSeedTarget, dataDir, dataPath, filmingMode } from '@/lib/paths';
import { seedDemoDatabase } from './seed-v1';
import { clearSiteTables, seedFromSite, writeSiteFiles } from './company';
import { writeDemoBrain } from './brain';
import { localizeCompany } from './it';
import { locale } from '@/lib/i18n';
import company from './company.json';

/**
 * The demo company FounderOS opens on.
 *
 * A fresh clone runs in demo mode (lib/paths.ts) until Settings switches it to
 * real data, and demo mode reads demo-data/, never data/. The first time the
 * demo store is needed it is built here, in one pass:
 *
 *   1. the structural rows (lib/seed.ts),
 *   2. the FounderOS v1 demo seed (./seed-v1.ts): tools, people, phases, the
 *      email list and the rest of what v1 shipped with,
 *   3. the demo company (./company.json, the same company founderos.sh shows)
 *      over everything it models: agents, tasks, runs, crons, skills,
 *      workflows, funnel, social, DMs, trading, brand deals, AdPilot, Drift
 *      and the Wizard's projects,
 *   4. the Optimal Engine markdown store and its stub CLI (./brain.ts).
 *
 * Every date is moved to "now" as it is written, and the store is rebuilt when
 * it is a week old, so the charts never age out of their 30-day windows.
 * Nothing here ever touches data/.
 *
 * With GLADOS_LOCALE=it the company's readable text is written in Italian
 * (./it.ts); the English source is untouched. The locale a store was built in
 * sits next to the age marker, and a store built in another locale is stale.
 */

const MARKER = '.demo-seeded-at';
const LOCALE_MARKER = '.demo-locale';
const MAX_AGE_MS = 7 * 86_400_000;

type Company = { exportedAt: string } & Record<string, unknown>;

/** Move every ISO date in the exported company forward by whole days, so the
 *  company reads as of now rather than as of the day it was exported. */
export function shiftCompanyDates<T>(value: T, days: number): T {
  if (days === 0) return value;
  const by = days * 86_400_000;
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(v)) return new Date(Date.parse(v) + by).toISOString();
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(Date.parse(`${v}T12:00:00Z`) + by).toISOString().slice(0, 10);
      return v;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(value) as T;
}

function seededAt(): number | null {
  try {
    return Number(fs.readFileSync(dataPath(MARKER), 'utf8').trim()) || null;
  } catch {
    return null;
  }
}

/** The locale the store was built in. A store from before the marker existed
 *  was built in English. */
function seededLocale(): string {
  try {
    return fs.readFileSync(dataPath(LOCALE_MARKER), 'utf8').trim() || 'en';
  } catch {
    return 'en';
  }
}

/** True when demo mode is on and its store is missing, a week old, or was
 *  built in a different locale than the one the app now speaks. */
export function demoStoreStale(now = Date.now()): boolean {
  if (!filmingMode()) return false;
  const at = seededAt();
  return at == null || !fs.existsSync(dataPath('glados.db')) || now - at > MAX_AGE_MS || seededLocale() !== locale();
}

const demoDir = () => path.join(process.cwd(), 'demo-data');

/** Build the demo store from scratch. Refuses to run outside demo mode. */
export function buildDemoStore(now = Date.now()): { pages: number } {
  if (!filmingMode()) throw new Error('The demo store is built in demo mode only (demo-data/).');
  // Every writer below resolves dataDir() again. Pin demo mode for the whole
  // build so a Settings toggle mid-build cannot point them (or the rmSync)
  // at data/.
  const prior = process.env.DEMO_MODE;
  process.env.DEMO_MODE = '1';
  try {
    if (path.resolve(dataDir()) !== demoDir()) throw new Error(`Refusing to build the demo store outside demo-data/ (${dataDir()}).`);
    return buildDemoStoreIn(now);
  } finally {
    if (prior === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = prior;
  }
}

function buildDemoStoreIn(now: number): { pages: number } {
  assertSeedTarget();
  const raw = company as unknown as Company;
  const english = shiftCompanyDates(raw, Math.round((now - Date.parse(raw.exportedAt)) / 86_400_000));
  const site = localizeCompany(english);

  fs.rmSync(dataDir(), { recursive: true, force: true });
  fs.mkdirSync(dataDir(), { recursive: true });
  const dbPath = dataPath('glados.db');
  let db = openDb(dbPath);
  seedDatabase(db);
  seedDemoDatabase(db);
  db.close();
  clearSiteTables(dbPath);
  db = openDb(dbPath);
  seedFromSite(db, site);
  // Paid deals are won and the declined one is lost: the outcome overlay Brand Deals reads.
  (site.business as { BRAND_DEALS: { status: string; amountAgreedUsd: number | null; dealValueUsd: number | null }[] }).BRAND_DEALS.forEach((d, i) => {
    const updatedAt = new Date(now).toISOString();
    if (d.status === 'Paid') db.brandDeals.upsert({ dealId: `r-${1040 + i}`, outcome: 'won', amountUsd: d.amountAgreedUsd ?? d.dealValueUsd, updatedAt });
    if (d.status === 'Declined') db.brandDeals.upsert({ dealId: `r-${1040 + i}`, outcome: 'lost', amountUsd: d.dealValueUsd, updatedAt });
  });
  db.close();
  writeSiteFiles(site, english);
  const pages = writeDemoBrain();
  fs.writeFileSync(dataPath(LOCALE_MARKER), `${locale()}\n`);
  fs.writeFileSync(dataPath(MARKER), `${now}\n`);
  return { pages };
}

const LOCK_STALE_MS = 5 * 60_000;
const LOCK_WAIT_MS = 3 * 60_000;

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** A sibling of demo-data/ (the build wipes the directory itself), so two
 *  processes never build at once: `next build` prerenders in parallel workers,
 *  and each one would otherwise rm the directory another is writing. */
function lockPath(): string {
  return `${demoDir()}.lock`;
}

function acquireLock(): number | null {
  const file = lockPath();
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try {
      const fd = fs.openSync(file, 'wx');
      fs.writeSync(fd, `${process.pid}\n`);
      return fd;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    }
    try {
      if (Date.now() - fs.statSync(file).mtimeMs > LOCK_STALE_MS) {
        fs.rmSync(file, { force: true });
        continue;
      }
    } catch {
      continue; // released between open and stat
    }
    if (Date.now() > deadline) return null;
    sleepSync(100);
  }
}

/** Build the demo store if demo mode needs one. Cheap when it is fresh. */
export function ensureDemoStore(): void {
  if (!demoStoreStale()) return;
  const fd = acquireLock();
  if (fd == null) throw new Error(`Timed out waiting for another process to build the demo store (${lockPath()}).`);
  try {
    // Another process may have finished the build while this one waited.
    if (demoStoreStale()) buildDemoStore();
  } finally {
    fs.closeSync(fd);
    fs.rmSync(lockPath(), { force: true });
  }
}
