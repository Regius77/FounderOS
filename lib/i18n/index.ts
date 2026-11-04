import it from './it';

/**
 * UI language. The English text written in the components is the key: `t()`
 * returns the Italian entry from ./it when GLADOS_LOCALE=it, and the English
 * string unchanged otherwise or when no entry exists. next.config.mjs inlines
 * GLADOS_LOCALE at build (default `it`), so server and browser agree. Vitest
 * does not load next.config, so tests render English unless they set it.
 *
 * Placeholders: `t('{n} runs failed', { n: 3 })`. Wrap only text a person
 * reads, never ids, enum values, keys or strings compared in code.
 */
export type Locale = 'en' | 'it';

const DICTIONARIES: Record<Locale, Record<string, string>> = { en: {}, it };

export function localeFor(raw: string | undefined): Locale {
  return raw?.trim().toLowerCase() === 'it' ? 'it' : 'en';
}

export function locale(): Locale {
  return localeFor(process.env.GLADOS_LOCALE);
}

/** BCP 47 tag for Intl / toLocale*String: the same calendar and number style the UI speaks. */
export function localeTag(): string {
  return locale() === 'it' ? 'it-IT' : 'en-US';
}

function fill(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function translate(loc: Locale, text: string, vars?: Record<string, string | number>): string {
  return fill(DICTIONARIES[loc][text] ?? text, vars);
}

export function t(text: string, vars?: Record<string, string | number>): string {
  return translate(locale(), text, vars);
}
