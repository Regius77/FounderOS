import { expect, test, vi } from 'vitest';
import fs, { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('english build matches the existing demo-data', async () => {
  const repo = process.cwd();
  const ref = path.join(repo, 'demo-data');
  const at = Number(fs.readFileSync(path.join(ref, '.demo-seeded-at'), 'utf8'));
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(at);
  const root = mkdtempSync(path.join(tmpdir(), 'fos-en-'));
  fs.symlinkSync(path.join(repo, 'node_modules'), path.join(root, 'node_modules'));
  vi.spyOn(process, 'cwd').mockReturnValue(root);
  vi.stubEnv('GLADOS_MODE_FILE', path.join(root, '.glados-mode'));
  vi.stubEnv('GLADOS_DEFAULT_MODE', 'demo');
  vi.stubEnv('GLADOS_LOCALE', '');
  const { buildDemoStore } = await import('@/lib/demo/store');
  buildDemoStore(at);
  const out = path.join(root, 'demo-data');
  const files = (fs.readdirSync(ref, { recursive: true }) as string[]).filter((f) => /\.(md|json|tsv|log)$/.test(f));
  const diffs: string[] = [];
  for (const f of files) {
    const a = fs.readFileSync(path.join(ref, f), 'utf8').replace(/\d{4}-\d\d-\d\dT[\d:.]+Z/g, 'T');
    const p = path.join(out, f);
    if (!fs.existsSync(p)) { diffs.push(`missing ${f}`); continue; }
    const b = fs.readFileSync(p, 'utf8').replace(/\d{4}-\d\d-\d\dT[\d:.]+Z/g, 'T');
    if (a !== b) diffs.push(f);
  }
  fs.writeFileSync('/tmp/claude-0/-home-user-FounderOS/882149ee-a822-519e-9eee-4f5255681ae0/scratchpad/en-root.txt', root);
  console.log('files', files.length, 'diffs', diffs);
  expect(diffs).toEqual([]);
}, 120_000);
