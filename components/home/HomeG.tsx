'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GBar,
  GBarChart,
  GButton,
  GCard,
  GDelta,
  GDisplay,
  GDotMatrix,
  GDotNumber,
  GEmpty,
  GHeroCard,
  GList,
  GPage,
  GRow,
  GSectionHeader,
  GShareBar,
  GSparkline,
  GStat,
  GTag,
  GTickStrip,
  type StageColumn,
} from '@/components/g';
import { Home6Chart, type Home6Series } from '@/components/Home6Chart';
import { formatCompact, formatFull, formatUsdCompact } from '@/lib/format-number';
import { setupHrefFor } from '@/lib/integrations-catalog';
import { channelColor } from '@/lib/series';
import type { Delta } from '@/lib/delta';
import type { InboundSummary, RevenueSummary } from '@/lib/home-summary';
import type { IncomeCategory } from '@/lib/finances';
import type { StatusPill, Tone } from '@/lib/pulse-history';
import { DONE_TODAY_EMPTY, NEEDS_YOU_EMPTY, type DoneToday, type NeedsYou } from '@/lib/home-today';
import { InterjectG } from './Interject';
import { locale, localeTag, t, tc } from '@/lib/i18n';

/**
 * Home under the GladOS style (glados-ui SPEC S01, X5). Home6Console gathers
 * the data once for both styles and hands this tree a plain object; the
 * Classic console is untouched.
 *
 * Layout is Home's own three columns (DOM order main, left, right; tiers on
 * the page width, rules in the "S01 home (G)" block of app/globals.css). Two
 * gradient heroes on the two numbers that drive a decision today (FR-1,
 * C22): money in and people waiting. Every other widget is a calm kit card.
 */

export type HomeGData = {
  greeting: string;
  status: {
    pill: StatusPill;
    segments: { text: string; href: string | null; tone: Tone }[];
    degraded: boolean;
  };
  revenue: RevenueSummary | null;
  financePeriod: 'MTD' | 'YTD';
  financeCategories: IncomeCategory[];
  inbound: InboundSummary;
  /** ISO start of each hourly bucket, oldest first. */
  hourStarts: string[];
  stats: {
    connected: number;
    connectors: number;
    activeAgents: number;
    agents: number;
    runs7: number;
    failed: number;
    brainPages: number;
  };
  chart: {
    usePosting: boolean;
    title: string;
    caption: string;
    href: string;
    hasChart: boolean;
    days: string[];
    series: { key: string; label: string; points: number[] }[];
  };
  runs: {
    perDay: number[];
    days: string[];
    lastRunText: string | null;
    lastRunTitle: string | null;
    recent: {
      id: string;
      agentId: string;
      ok: boolean;
      summary: string;
      age: string;
      at: string;
    }[];
  };
  freshness: { dated: number; fresh: number; aging: number; stale: number };
  audience: {
    key: string;
    label: string;
    last: number;
    spark: number[];
    delta: Delta | null;
    window: string;
    href: string;
  }[];
  /** F2: tasks blocked on the operator (top five) and what finished since local midnight. */
  needs: NeedsYou;
  done: DoneToday & { caption: string };
  live: {
    agents: { id: string; name: string }[];
    active: number;
    more: number;
  };
  now: { quarter: string; items: { id: string; title: string }[] } | null;
};

const usd = (n: number) => `$${formatFull(Math.round(n))}`;
const runsN = (n: number) => (n === 1 ? t('{n} run', { n }) : t('{n} runs', { n }));
const messagesN = (n: number) => (n === 1 ? t('{n} message', { n }) : t('{n} messages', { n }));

/** Comms sources on the inbound chart: email is the C19 email slot; the chat sources take categorical slots. */
const COMMS_COLOR: Record<string, string> = {
  email: 'var(--g-series-5)',
  whatsapp: 'var(--g-cat-8)',
  slack: 'var(--g-cat-7)',
};

const TAG_TONE: Record<Tone, 'ok' | 'warn' | 'err' | 'neutral' | 'accent'> = {
  ok: 'ok',
  warn: 'warn',
  err: 'err',
  accent: 'accent',
  dim: 'neutral',
};

export function HomeG({ data }: { data: HomeGData }) {
  return (
    <GPage className="hg">
      <header className="hg-head">
        <GDisplay>{data.greeting}</GDisplay>
        <StatusLine status={data.status} />
      </header>

      <div className="hg-grid h6-grid">
        <div className="hg-col h6-col h6-col-main">
          <div className="hg-heroes">
            <RevenueHero revenue={data.revenue} period={data.financePeriod} />
            <InboundHero inbound={data.inbound} starts={data.hourStarts} />
          </div>
          <Stats stats={data.stats} />
          <InterjectG />
          <div className="hg-today">
            <NeedsYouCard needs={data.needs} />
            <DoneTodayCard done={data.done} />
          </div>
          <ActivityCard chart={data.chart} />
          {data.financeCategories.length > 0 && <FinanceCard categories={data.financeCategories} period={data.financePeriod} />}
        </div>

        <div className="hg-col h6-col h6-col-left">
          <AgentsCard runs={data.runs} failed={data.stats.failed} runs7={data.stats.runs7} />
          <FreshnessCard f={data.freshness} />
          <AudienceCard rows={data.audience} />
        </div>

        <div className="hg-col h6-col h6-col-right">
          <LiveCard live={data.live} />
          {data.now && <NowCard now={data.now} />}
        </div>
      </div>
    </GPage>
  );
}

/* ── header: status from stateOfWorld (FR-5, H2) ─────────────────────── */

function StatusLine({ status }: { status: HomeGData['status'] }) {
  return (
    <div className="hg-status">
      <GTag tone={status.pill.tone} dot title={t('Overall status from failed runs and connectors')}>
        {status.pill.text}
      </GTag>
      {status.segments.map((s) =>
        s.href ? (
          <GButton key={s.text} variant="sm" href={s.href}>
            {s.text}
          </GButton>
        ) : (
          <GTag key={s.text} tone={TAG_TONE[s.tone]}>
            {s.text}
          </GTag>
        ),
      )}
      {status.degraded && (
        <GButton variant="sm" href="/setup" title={t('something needs wiring: open the guided setup')}>
          {t('Set up')}
        </GButton>
      )}
    </div>
  );
}

/* ── heroes (FR-1 to FR-4) ───────────────────────────────────────────── */

function RevenueHero({ revenue, period }: { revenue: RevenueSummary | null; period: 'MTD' | 'YTD' }) {
  const caption = t('Revenue · {period}', { period });
  if (!revenue) {
    return (
      <GHeroCard
        variant="a"
        caption={caption}
        status={t('No payment processor connected')}
        setupHref={setupHrefFor('stripe')}
        setupHint={t('connect a payment processor to see revenue')}
        title={t('Revenue: no payment processor connected')}
      />
    );
  }
  const { total, top, segments } = revenue;
  const ytd = period === 'YTD';
  const lead = segments.length === 1 ? `${top.label} · 100%` : t('{label} leads · {share}%', { label: top.label, share: top.share });
  return (
    <GHeroCard
      variant="a"
      href="/finances"
      caption={caption}
      value={formatUsdCompact(total)}
      label={
        segments.length === 1
          ? ytd
            ? t('Revenue year to date {amount}, {label} is all of it. Open Finances.', { amount: usd(total), label: top.label })
            : t('Revenue month to date {amount}, {label} is all of it. Open Finances.', { amount: usd(total), label: top.label })
          : ytd
            ? t('Revenue year to date {amount}, {label} leads at {share} percent. Open Finances.', { amount: usd(total), label: top.label, share: top.share })
            : t('Revenue month to date {amount}, {label} leads at {share} percent. Open Finances.', { amount: usd(total), label: top.label, share: top.share })
      }
      title={
        ytd
          ? t('{amount} income year to date, from the same processor books as Finances', { amount: usd(total) })
          : t('{amount} income month to date, from the same processor books as Finances', { amount: usd(total) })
      }
      status={lead}
      strip={
        <GShareBar
          onHero
          label={t('Revenue share by category, {period}', { period })}
          segments={segments.map((s) => ({
            id: s.key,
            label: s.label,
            value: s.usd,
            title: `${s.label} · ${usd(s.usd)} · ${s.share}%`,
          }))}
        />
      }
    />
  );
}

function hourLabel(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

function InboundHero({ inbound, starts }: { inbound: InboundSummary; starts: string[] }) {
  const caption = t('Inbound · 24h');
  if (!inbound.configured && inbound.count === 0) {
    return (
      <GHeroCard
        variant="b"
        caption={caption}
        status={t('Comms not connected')}
        setupHref={setupHrefFor('email')}
        setupHint={t('connect email, WhatsApp or Slack to count inbound messages')}
        title={t('Inbound: no comms channel connected')}
      />
    );
  }
  const shown = inbound.capped ? `${inbound.count}+` : inbound.count;
  const status =
    inbound.count === 0
      ? t('Quiet day · 0 in 24h')
      : inbound.priority > 0
        ? t('{n} priority', { n: inbound.priority })
        : inbound.channels === 1
          ? t('across {n} channel', { n: inbound.channels })
          : t('across {n} channels', { n: inbound.channels });
  const peak = inbound.hourly.reduce((best, v, i) => (v > inbound.hourly[best] ? i : best), 0);
  return (
    <GHeroCard
      variant="b"
      href="/inbox"
      caption={caption}
      value={shown}
      label={t('{n} inbound messages in the last 24 hours, {status}. Open the inbox.', { n: shown, status })}
      title={t('Messages that arrived in the last 24 hours across every connected channel') + (inbound.capped ? t(' (the feed is capped, so there may be more)') : '')}
      status={status}
      strip={
        <GTickStrip
          onHero
          values={inbound.hourly}
          marked={23}
          titles={inbound.hourly.map((n, i) => `${hourLabel(starts[i])} · ${messagesN(n)}`)}
          label={`${t('Inbound per hour, last 24 hours:')} ${messagesN(inbound.count)}${inbound.count > 0 ? t(', peak {n} at {hour}', { n: inbound.hourly[peak], hour: hourLabel(starts[peak]) }) : ''}`}
        />
      }
    />
  );
}

/* ── stats row (FR-7) ────────────────────────────────────────────────── */

function Stats({ stats }: { stats: HomeGData['stats'] }) {
  return (
    <div className="hg-stats">
      <GStat
        value={stats.connected}
        label={t('of {n} systems', { n: stats.connectors })}
        href="/integrations"
        source={t('{n} of {total} connectors connected', { n: stats.connected, total: stats.connectors })}
      />
      <GStat
        value={stats.activeAgents}
        label={t('of {n} agents live', { n: stats.agents })}
        href="/agents"
        source={t('{n} of {total} agents active', { n: stats.activeAgents, total: stats.agents })}
      />
      <GStat
        value={stats.runs7}
        label={t('runs · 7d')}
        href="/agents"
        source={t('Agent runs finished in the last 7 days') + (stats.failed > 0 ? t('; {n} of the last 40 failed', { n: stats.failed }) : '')}
        extra={
          stats.failed > 0 ? (
            <GTag tone="err" size="xs">
              {t('{n} failed', { n: stats.failed })}
            </GTag>
          ) : undefined
        }
      />
      <GStat value={stats.brainPages} label={t('brain pages')} href="/brain" source={t('{n} pages in the brain store', { n: formatFull(stats.brainPages) })} />
    </div>
  );
}

/* ── activity chart (FR-8) ───────────────────────────────────────────── */

function ActivityCard({ chart }: { chart: HomeGData['chart'] }) {
  const series: Home6Series[] = chart.series.map((s) => ({
    ...s,
    color: chart.usePosting ? channelColor(s.key) : (COMMS_COLOR[s.key] ?? 'var(--g-accent)'),
  }));
  return (
    <GCard className="hg-card hg-chart" aria-labelledby="hg-chart-title">
      <GSectionHeader
        id="hg-chart-title"
        size={22}
        title={chart.title}
        caption={chart.caption}
        action={
          <GButton variant="sm" href={chart.href}>
            {t('View all')}
          </GButton>
        }
      />
      {chart.hasChart ? (
        <>
          <ul className="hg-legend" aria-label={t('Legend')}>
            {series.map((s) => (
              <li key={s.key}>
                <i style={{ background: s.color }} />
                {s.label}
              </li>
            ))}
          </ul>
          <Home6Chart days={chart.days} series={series} title={`${chart.title} · ${chart.caption}`} skin="g" />
        </>
      ) : (
        <GEmpty
          kind="unconfigured"
          title={t('No posting or comms history yet')}
          body={t('Connect Zernio for posting history.')}
          setupHref={setupHrefFor('zernio')}
          setupHint={t('connect Zernio for posting history')}
        />
      )}
    </GCard>
  );
}

/* ── finances by category (FR-9, C13) ────────────────────────────────── */

function FinanceCard({ categories, period }: { categories: IncomeCategory[]; period: 'MTD' | 'YTD' }) {
  const router = useRouter();
  const total = categories.reduce((s, c) => s + c.usd, 0);
  const top = categories.reduce((best, c) => (c.usd > best.usd ? c : best), categories[0]);
  const [selected, setSelected] = useState<string | null>(top?.key ?? null);
  const columns: StageColumn[] = categories.map((c) => ({
    id: c.key,
    label: c.label,
    value: c.usd,
    tip: {
      title: c.label,
      lines: [usd(c.usd), t('{pct}% of {period} revenue', { pct: total > 0 ? Math.round((c.usd / total) * 100) : 0, period })],
      hint: t('Open in Finances'),
    },
  }));
  return (
    <GCard className="hg-card" aria-labelledby="hg-fin-title">
      <GSectionHeader
        id="hg-fin-title"
        size={22}
        title={t('By category')}
        caption={t('Income · {period}', { period })}
        action={
          <GButton variant="sm" href="/finances">
            {t('Open')}
          </GButton>
        }
      />
      <div className="hg-fin">
        <GBarChart
          variant="stages"
          measure="usd"
          flow={false}
          columns={columns}
          selected={selected}
          plotHeight={120}
          onSelect={(id) => {
            setSelected(id);
            router.push(`/finances?category=${encodeURIComponent(id)}`);
          }}
          tipHint={t('Open in Finances')}
          label={t('Income by category, {period}', { period })}
        />
      </div>
    </GCard>
  );
}

/* ── left column ─────────────────────────────────────────────────────── */

const DAY_FMT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
};

/** Agents: the run histogram and the recent runs in one card (FR-10, H4). */
function AgentsCard({ runs, failed, runs7 }: { runs: HomeGData['runs']; failed: number; runs7: number }) {
  return (
    <GCard className="hg-card" aria-labelledby="hg-agents-title">
      <GSectionHeader
        id="hg-agents-title"
        size={22}
        title={t('Agents')}
        caption={
          <span title={runs.lastRunTitle ?? t('Agent runs finished in the last 7 days')}>
            {runsN(runs7)} · {t('7d')}{runs.lastRunText ? ` · ${runs.lastRunText}` : ''}
          </span>
        }
        action={
          runs.recent.length > 0 && (
            <GTag tone={failed > 0 ? 'err' : 'ok'} dot title={failed > 0 ? t('{n} of the last 40 runs failed', { n: failed }) : t('No failures in the last 40 runs')}>
              {failed > 0 ? t('{n} failed', { n: failed }) : t('all ok')}
            </GTag>
          )
        }
      />
      {runs.recent.length === 0 && runs7 === 0 ? (
        <GEmpty
          kind="unconfigured"
          title={t('No agent runs recorded yet')}
          body={t('Runs appear here once an agent has a job.')}
          setupHref="/agents"
          setupHint={t('no agent has run yet; open Agents to set one up')}
        />
      ) : (
        <>
          {/* the per-day histogram only when the week has runs: seven empty columns say nothing the caption does not */}
          {runs7 > 0 && (
            <GDotMatrix
              compact
              rows={6}
              label={t('Runs per day, last 7 days')}
              columns={runs.perDay.map((v, i) => {
                const day = runs.days[i] ? new Date(`${runs.days[i]}T00:00:00Z`).toLocaleDateString(locale() === 'it' ? 'it-IT' : 'en-GB', DAY_FMT) : '';
                return {
                  id: runs.days[i] ?? String(i),
                  label: day.slice(0, 2),
                  value: v,
                  title: `${day} · ${runsN(v)}`,
                };
              })}
            />
          )}
          <GList label={t('Recent runs')} className="hg-list">
            {runs.recent.map((r) => (
              <GRow
                key={r.id}
                href={`/agents?agent=${encodeURIComponent(r.agentId)}`}
                leading={<span className="hg-dot" data-tone={r.ok ? 'ok' : 'err'} aria-label={r.ok ? t('succeeded') : t('failed')} role="img" />}
                title={r.agentId}
                meta={r.summary}
                trailing={
                  <span className="hg-age" title={new Date(r.at).toLocaleString(localeTag())}>
                    {r.age}
                  </span>
                }
                hint={r.summary}
              />
            ))}
          </GList>
        </>
      )}
    </GCard>
  );
}

/** Brain freshness (FR-11): one share number, one split bar, three rows. Page count lives in the stats row only. */
function FreshnessCard({ f }: { f: HomeGData['freshness'] }) {
  const pct = (n: number) => (f.dated > 0 ? Math.round((n / f.dated) * 100) : 0);
  return (
    <GCard className="hg-card" aria-labelledby="hg-fresh-title">
      <GSectionHeader id="hg-fresh-title" size={22} title={t('Brain freshness')} />
      {f.dated === 0 ? (
        <GEmpty
          kind="unconfigured"
          title={t('Brain store not mounted')}
          body={t('Expected at ~/knowledge/brain-store or GBRAIN_STORE.')}
          setupHref="/setup"
          setupHint={t('expected at ~/knowledge/brain-store (or GBRAIN_STORE)')}
        />
      ) : (
        <>
          <div className="hg-fresh-head" title={t('Share of dated pages changed in the last 30 days')}>
            <GDotNumber value={`${pct(f.fresh)}%`} size={4} label={t('{n} percent fresh', { n: pct(f.fresh) })} />
            <span className="hg-cap">{t('fresh')}</span>
          </div>
          <GBar
            label={t('Brain freshness: {fresh} fresh, {aging} aging, {stale} stale', { fresh: f.fresh, aging: f.aging, stale: f.stale })}
            segments={[
              { value: f.fresh, tone: 'accent', label: t('Fresh {n}', { n: f.fresh }) },
              { value: f.aging, tone: 'muted', label: t('Aging {n}', { n: f.aging }) },
              { value: f.stale, tone: 'warn', label: t('Stale {n}', { n: f.stale }) },
            ]}
          />
          <GList label={t('Freshness')} className="hg-list">
            <GRow
              href="/brain"
              title={t('Fresh')}
              meta={t('changed in the last 30 days')}
              trailing={formatFull(f.fresh)}
              hint={t('{n} pages changed in the last 30 days', { n: f.fresh })}
            />
            <GRow
              href="/brain"
              title={t('Aging')}
              meta={t('changed 31 to 89 days ago')}
              trailing={formatFull(f.aging)}
              hint={t('{n} pages changed 31 to 89 days ago', { n: f.aging })}
            />
            <GRow
              href="/drift"
              title={tc('pages', 'Stale')}
              meta={t('untouched for 90 days or more')}
              trailing={formatFull(f.stale)}
              hint={t('{n} pages untouched for 90 days or more; open Drift', { n: f.stale })}
            />
          </GList>
        </>
      )}
    </GCard>
  );
}

/** Audience (FR-12, C19): one row per channel, a 30 day line and the change over the same window. */
function AudienceCard({ rows }: { rows: HomeGData['audience'] }) {
  return (
    <GCard className="hg-card" aria-labelledby="hg-aud-title">
      <GSectionHeader id="hg-aud-title" size={22} title={t('Audience')} caption={rows.length > 0 ? t('Last 30 days') : undefined} />
      {rows.length === 0 ? (
        <GEmpty
          kind="unconfigured"
          title={t('No audience history yet')}
          body={t('Connect Zernio to track followers.')}
          setupHref={setupHrefFor('zernio')}
          setupHint={t('connect Zernio to track followers')}
        />
      ) : (
        <GList label={t('Audience by channel')} className="hg-list">
          {rows.map((r) => (
            <GRow
              key={r.key}
              href={r.href}
              title={r.label}
              meta={r.delta ? <GDelta delta={r.delta} window={r.window} /> : undefined}
              hint={`${r.label}: ${formatFull(r.last)}${r.delta ? t(', {delta} from {window}', { delta: r.delta.text, window: r.window }) : ''}`}
              trailing={
                <span className="hg-aud-trail">
                  {r.spark.length > 1 && <GSparkline values={r.spark} color={seriesSlot(r.key)} height={24} width={72} label={t('{label} · last 30 days', { label: r.label })} />}
                  <span className="hg-aud-val">{formatCompact(r.last)}</span>
                </span>
              }
            />
          ))}
        </GList>
      )}
    </GCard>
  );
}

/** The series slot for a channel (C19); untracked keys read muted. */
function seriesSlot(key: string): 'series-1' | 'series-2' | 'series-3' | 'series-4' | 'series-5' | 'series-6' | 'muted' {
  const m = channelColor(key).match(/--series-(\d)\)/);
  return m && m[1] !== '0' ? (`series-${m[1]}` as 'series-1') : 'muted';
}

/* ── right column ────────────────────────────────────────────────────── */

/** F2 Needs you: tasks blocked until the operator acts, top five, each opening on the board. */
function NeedsYouCard({ needs }: { needs: NeedsYou }) {
  return (
    <GCard className="hg-card" aria-labelledby="hg-needs-title" data-home-needs="">
      <GSectionHeader
        id="hg-needs-title"
        size={22}
        title={t('Needs you')}
        caption={needs.total > 0 ? t('Blocked until you act') : undefined}
        action={
          needs.total > needs.rows.length ? (
            <GButton variant="sm" href="/tasks" title={t('All {n} blocked tasks on the board', { n: needs.total })}>
              {tc('task', 'All {n}', { n: needs.total })}
            </GButton>
          ) : needs.total > 0 ? (
            <GTag tone="warn" dot title={needs.total === 1 ? t('{n} task blocked until you act', { n: needs.total }) : t('{n} tasks blocked until you act', { n: needs.total })}>
              {needs.total}
            </GTag>
          ) : undefined
        }
      />
      {needs.rows.length === 0 ? (
        <p className="hg-today-empty">{NEEDS_YOU_EMPTY}</p>
      ) : (
        <GList label={t('Tasks waiting on you')} className="hg-list">
          {needs.rows.map((task) => (
            <GRow
              key={task.id}
              href={task.href}
              leading={<span className="hg-dot" data-tone={task.priority === 'high' ? 'err' : 'warn'} role="img" aria-label={task.priority === 'high' ? t('high priority') : t('blocked')} />}
              title={task.title}
              meta={task.agentId ?? tc('task', 'Yours')}
              trailing={
                <span className="hg-age" title={t('Waiting since {when}', { when: new Date(task.at).toLocaleString(localeTag()) })}>
                  {task.age}
                </span>
              }
              hint={t('{title}: open on the board', { title: task.title })}
            />
          ))}
        </GList>
      )}
    </GCard>
  );
}

/** F2 Done today: runs and tasks finished since local midnight, the count and the newest three. */
function DoneTodayCard({ done }: { done: HomeGData['done'] }) {
  return (
    <GCard className="hg-card" aria-labelledby="hg-done-title" data-home-done="">
      <GSectionHeader
        id="hg-done-title"
        size={22}
        title={t('Done today')}
        action={
          done.failed > 0 ? (
            <GTag tone="err" dot title={done.failed === 1 ? t('{n} run failed today', { n: done.failed }) : t('{n} runs failed today', { n: done.failed })}>
              {t('{n} failed', { n: done.failed })}
            </GTag>
          ) : undefined
        }
      />
      {done.count === 0 ? (
        <p className="hg-today-empty">{DONE_TODAY_EMPTY}</p>
      ) : (
        <>
        <GStat value={done.count} label={done.caption} source={t('Agent runs and tasks finished since local midnight')} />
        <GList label={t('Finished today')} className="hg-list">
          {done.rows.map((r) => (
            <GRow
              key={`${r.kind}-${r.id}`}
              href={r.href}
              leading={<span className="hg-dot" data-tone={r.ok ? 'ok' : 'err'} role="img" aria-label={r.ok ? t('finished') : t('failed')} />}
              title={r.title}
              meta={r.kind === 'task' ? t('Task') : tc('noun', 'Run')}
              trailing={
                <span className="hg-age" title={new Date(r.at).toLocaleString(localeTag())}>
                  {r.age}
                </span>
              }
              hint={r.title}
            />
          ))}
        </GList>
        </>
      )}
    </GCard>
  );
}

/** Agents live (FR-14, H3): the count is every active agent; the list shows four and says how many more. */
function LiveCard({ live }: { live: HomeGData['live'] }) {
  return (
    <GCard className="hg-card" aria-labelledby="hg-live-title">
      <GSectionHeader
        id="hg-live-title"
        size={22}
        title={t('Agents live')}
        action={
          <GTag tone="accent" title={t('{n} agents active', { n: live.active })}>
            {live.active}
          </GTag>
        }
      />
      {live.agents.length === 0 ? (
        <GEmpty
          kind="unconfigured"
          title={t('No agents live')}
          body={t('No agent is active right now.')}
          setupHref="/agents"
          setupHint={t('no agent is active; open Agents to set one up')}
        />
      ) : (
        <GList label={t('Active agents')} className="hg-list">
          {live.agents.map((a) => (
            <GRow key={a.id} href={`/agents?agent=${encodeURIComponent(a.id)}`} title={a.name} hint={t('Open {name}', { name: a.name })} />
          ))}
          {live.more > 0 && <GRow href="/agents" title={t('+{n} more', { n: live.more })} hint={t('{n} more active agents', { n: live.more })} />}
        </GList>
      )}
    </GCard>
  );
}

/** Now (FR-15): the current quarter once, then the items. */
function NowCard({ now }: { now: NonNullable<HomeGData['now']> }) {
  return (
    <GCard className="hg-card" aria-labelledby="hg-now-title">
      <GSectionHeader id="hg-now-title" size={22} title={t('Now')} caption={now.quarter} />
      <GList label={t('Roadmap, {quarter}', { quarter: now.quarter })} className="hg-list hg-now">
        {now.items.map((it) => (
          <GRow key={it.id} href="/roadmap" title={it.title} hint={it.title} />
        ))}
      </GList>
    </GCard>
  );
}
