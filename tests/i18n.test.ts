import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it as test } from 'vitest';
import it from '@/lib/i18n/it';
import { localeFor, tc, translate } from '@/lib/i18n';

const ROOTS = ['app', 'components', 'founderos', 'lib'];

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sources(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

/** Every literal passed to t() in a file that imports it from lib/i18n. */
function calls(): { file: string; key: string; literal: boolean }[] {
  const out: { file: string; key: string; literal: boolean }[] = [];
  for (const file of ROOTS.flatMap((r) => sources(path.join(process.cwd(), r)))) {
    const src = fs.readFileSync(file, 'utf8');
    if (!/from ['"]@\/lib\/i18n['"]/.test(src)) continue;
    const re = /(?<![\w.$])t\(\s*(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|`((?:\\.|[^`\\])*)`)/g;
    for (const m of src.matchAll(re)) {
      const raw = m[1] ?? m[2] ?? m[3] ?? '';
      const key = raw.replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, '\n');
      out.push({ file: path.relative(process.cwd(), file), key, literal: m[3] === undefined || !raw.includes('${') });
    }
    // tc('context', 'Text'): needs the `context|Text` entry.
    for (const m of src.matchAll(/(?<![\w.$])tc\(\s*'([^'\\]+)'\s*,\s*'((?:\\.|[^'\\])*)'/g)) {
      out.push({ file: path.relative(process.cwd(), file), key: `${m[1]}|${m[2].replace(/\\(['"`\\])/g, '$1')}`, literal: true });
    }
  }
  return out;
}

const placeholders = (s: string) => [...s.replace(/^[\w-]+\|/, '').matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('i18n', () => {
  test('falls back to the English text and fills placeholders', () => {
    expect(translate('it', 'zz-no-such-key {n}', { n: 2 })).toBe('zz-no-such-key 2');
    expect(translate('en', '{a} of {b}', { a: 1, b: 3 })).toBe('1 of 3');
    expect(localeFor('IT')).toBe('it');
    expect(localeFor(undefined)).toBe('en');
    expect(tc('status', 'zz-open')).toBe('zz-open');
  });

  test('t() keys are plain literals, not template strings with ${}', () => {
    const bad = calls().filter((c) => !c.literal).map((c) => `${c.file}: ${c.key}`);
    expect(bad).toEqual([]);
  });

  test('every t() key has an Italian entry', () => {
    const missing = [...new Set(calls().filter((c) => !(c.key in it)).map((c) => `${c.file}: ${c.key}`))];
    expect(missing).toEqual([]);
  });

  test('Italian entries keep the same placeholders as the English key', () => {
    const wrong = Object.entries(it).filter(([en, itText]) => placeholders(en).join() !== placeholders(itText).join()).map(([en]) => en);
    expect(wrong).toEqual([]);
  });
});
