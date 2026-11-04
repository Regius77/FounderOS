import path from 'node:path';
import fs from 'node:fs';
import { openDb, type GladosDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';
import { dataPath } from '@/lib/paths';
import { ensureDemoStore } from '@/lib/demo/store';

/**
 * App-level singleton. Larp-first, real-ready: every page and API route reads
 * through this seeded SQLite database, so swapping in live sources later is a
 * repo-level change, not a UI rewrite.
 */
let instance: GladosDb | null = null;
/** The path `instance` was opened on. Settings → Filming mode switches the
 *  data directory at runtime, so getDb() reopens when the path changes rather
 *  than writing real work into the demo database (or demo rows into data/). */
let instancePath: string | null = null;

/**
 * Where the database lives. GLADOS_DB wins; otherwise `glados.db` in the data
 * directory. Installs from before the rename keep their data in
 * `founder-os.db` (and may still set FOUNDER_OS_DB): when no `glados.db`
 * exists yet, that file is opened in place, so an upgrade never boots onto an
 * empty database. Nothing is renamed or moved.
 */
export function resolveDbPath(env: Record<string, string | undefined> = process.env): string {
  const explicit = env.GLADOS_DB ?? env.FOUNDER_OS_DB;
  if (explicit) return explicit;
  const current = dataPath('glados.db');
  const legacy = dataPath('founder-os.db');
  if (!fs.existsSync(current) && fs.existsSync(legacy)) return legacy;
  return current;
}

export function getDb(): GladosDb {
  const pinned = Boolean(process.env.GLADOS_DB || process.env.FOUNDER_OS_DB);
  if (instance && (pinned || resolveDbPath() === instancePath)) return instance;
  if (instance) {
    // Mode switched. A request still mid-await may hold the old handle, so it
    // closes a little later instead of under that request's feet.
    const old = instance;
    setTimeout(() => old.close(), 30_000).unref?.();
    instance = null;
  }
  // Demo mode opens on the demo company: built on first use, rebuilt weekly.
  if (!pinned) ensureDemoStore();
  const dbPath = resolveDbPath();
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  instance = openDb(dbPath);
  instancePath = dbPath;
  // Seed the structural rows (departments) on first touch. Everything else
  // starts empty: a fresh install is a blank OS the operator fills in.
  if (instance.departments.all().length === 0) {
    seedDatabase(instance);
  }
  return instance;
}
