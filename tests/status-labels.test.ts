import { afterEach, describe, expect, it as test } from 'vitest';
import it from '@/lib/i18n/it';
import { statusLabel, type StatusContext } from '@/lib/i18n/status';
import { boardStatusLabel } from '@/founderos/lib/labels';
import {
  AgentStatusSchema,
  AgentTaskStatusSchema,
  AgentTierSchema,
  BrandDealOutcomeSchema,
  ClientWorkStatusSchema,
  FunnelStageSchema,
  LAB_RUN_KINDS,
  LabRunStatusSchema,
  LabSourceStatusSchema,
  LabTimingSchema,
  LabTranscriptStatusSchema,
  SkillStatusSchema,
  SocialPostStatusSchema,
  ToolStatusSchema,
  TradeStatusSchema,
} from '@/lib/schemas';
import { RUN_STATUSES } from '@/lib/creative-engine/schemas';

/** Every value a display site can hand statusLabel(), by the context it passes. */
const KNOWN: [StatusContext, readonly string[]][] = [
  ['agent', AgentStatusSchema.options],
  ['agent', ['running', 'idle', 'paused', 'error']], // Paperclip seats
  ['tier', AgentTierSchema.options],
  ['task', AgentTaskStatusSchema.options],
  ['run', LabRunStatusSchema.options],
  ['run', ['completed', 'done', 'cancelled', 'pending', 'error']],
  ['runstatus', RUN_STATUSES],
  ['board', ['in_progress', 'in_review', 'review', 'blocked', 'todo', 'backlog', 'done', 'cancelled', 'running', 'failed', 'error', 'timed_out', 'unknown']],
  ['trigger', ['heartbeat', 'manual', 'cron', 'schedule']],
  ['labrun', LAB_RUN_KINDS],
  ['labsource', LabSourceStatusSchema.options],
  ['labcost', ['provider', 'published_price', 'dry']],
  ['transcript', LabTranscriptStatusSchema.options],
  ['health', ['ok', 'warn', 'fail', 'not_configured', 'off', 'dry']],
  ['timing', LabTimingSchema.options],
  ['post', [...SocialPostStatusSchema.options, 'success', 'partial', 'pending', 'scheduled']],
  ['order', ['queued', 'confirmed', 'unconfirmed', 'partially_filled', 'filled', 'cancelled', 'rejected', 'pending', 'failed']],
  ['ordertype', ['market', 'limit', 'stop_loss', 'stop_limit']],
  ['verdict', ['buy', 'sell', 'watch', 'skip', 'hold']],
  ['kind', ['task', 'run', 'MCP server', 'integration']],
  ['transfer', ['incoming_payment_waiting', 'processing', 'funds_converted', 'outgoing_payment_sent', 'completed', 'cancelled', 'funds_refunded', 'bounced_back']],
  ['computer', ['running', 'active', 'starting', 'stopped', 'stopping', 'provisioning', 'creating', 'paused', 'error', 'unknown']],
  ['client', FunnelStageSchema.options],
  ['media', ['image', 'video', 'audio', 'text']],
  ['source', ['trakyo', 'meta-ads', 'attio', 'ghl', 'manual']],
  ['status', [...ToolStatusSchema.options, ...SkillStatusSchema.options, ...TradeStatusSchema.options, ...BrandDealOutcomeSchema.options, ...ClientWorkStatusSchema.options, 'connected', 'not_configured', 'error']],
];

const saved = process.env.GLADOS_LOCALE;
afterEach(() => {
  if (saved === undefined) delete process.env.GLADOS_LOCALE;
  else process.env.GLADOS_LOCALE = saved;
});

describe('status labels', () => {
  test('every known enum value has an Italian entry for its context', () => {
    const missing = KNOWN.flatMap(([ctx, values]) => values.filter((v) => !(`${ctx}|${v}` in it) && !(`status|${v}` in it)).map((v) => `${ctx}|${v}`));
    expect(missing).toEqual([]);
  });

  test('English output is the raw value, or the label the site passed', () => {
    delete process.env.GLADOS_LOCALE;
    for (const [ctx, values] of KNOWN) for (const v of values) expect(statusLabel(v, ctx)).toBe(v);
    expect(statusLabel('partially_filled', 'order', 'Partially_filled')).toBe('Partially_filled');
    expect(statusLabel(null, 'run')).toBe('');
    expect(boardStatusLabel('in_progress')).toBe('in progress');
    expect(boardStatusLabel('timed_out')).toBe('timed out');
    expect(boardStatusLabel('some_new_state')).toBe('some new state');
  });

  test('Italian follows the gender of the noun and falls back to English', () => {
    process.env.GLADOS_LOCALE = 'it';
    expect(statusLabel('failed', 'run')).toBe('fallita');
    expect(statusLabel('completed', 'run')).toBe('completata');
    expect(statusLabel('idle', 'agent')).toBe('inattivo');
    expect(statusLabel('completed', 'transfer')).toBe('completato');
    expect(statusLabel('Buy', 'verdict', 'Buy')).toBe('compra');
    expect(statusLabel('connected')).toBe('connesso');
    expect(statusLabel('zz_unknown', 'run', 'Zz_unknown')).toBe('Zz_unknown');
    expect(boardStatusLabel('cancelled')).toBe('annullata');
  });
});
