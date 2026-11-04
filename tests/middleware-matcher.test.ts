import { describe, expect, it } from 'vitest';
import { getMiddlewareMatchers } from 'next/dist/build/analysis/get-page-static-info.js';
import { config } from '../middleware';

const gated = (p: string) => getMiddlewareMatchers(config.matcher, { i18n: undefined }).some((m: { regexp: string }) => new RegExp(m.regexp).test(p));

describe('middleware matcher', () => {
  it('gates pages, API routes and operator media whatever their extension', () => {
    for (const p of ['/', '/login', '/agents', '/agents/', '/agents/setup/sales-agent', '/api/keys', '/api/workflows/abc.png', '/api/skills/x.svg', '/content-media/upload/a.png', '/_next/image']) {
      expect(gated(p), p).toBe(true);
    }
  });

  it('lets Next chunks and public brand assets through', () => {
    for (const p of ['/_next/static/chunks/app.js', '/favicon.ico', '/brand/founderos-mark.png', '/vantage-emblem.png', '/adpilot/globe.svg']) {
      expect(gated(p), p).toBe(false);
    }
  });
});
