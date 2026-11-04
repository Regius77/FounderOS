'use client';

/**
 * /social/[platform] and /social/beehiiv under the GladOS style (glados-ui
 * SPEC S03 §4.2, §4.3, §5.3; X5). Same data as Classic. One hero, the growth
 * stats once (the duplicate badges in the chart header are cut, F10), the
 * history as an area chart with its own window, and the not-connected state
 * as a GEmpty with a Set up link (F12).
 */

import { useMemo, useState } from 'react';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import { GAreaChart, GButton, GCard, GEmpty, GHeroCard, GList, GPage, GRow, GSectionHeader, GSegmented, GTag, GTickStrip } from '@/components/g';
import type { Newsletter } from '@/lib/newsletters';
import { formatFull } from '@/lib/format-number';
import { fmtDay, fmtPct, MAX_MARKS } from '@/lib/social-view';
import { localeTag, t, tc } from '@/lib/i18n';

function Back() {
  return (
    <div className="soc-g-back">
      <GButton size="sm" href="/social"><ChevronLeft size={14} strokeWidth={1.75} aria-hidden /> {t('All platforms')}</GButton>
    </div>
  );
}

export function PlatformNotConnectedG({ label, setupHref }: { label: string; setupHref: string }) {
  return (
    <GPage className="soc-g soc-g-detail">
      <Back />
      <GSectionHeader size="page" title={label} />
      <GCard p={24}>
        <GEmpty kind="unconfigured" title={t('{label} is not connected', { label })} body={t('Follower history appears here once Zernio tracks this account.')} setupHref={setupHref} setupHint={t('Connect {label} through Zernio', { label })} />
      </GCard>
    </GPage>
  );
}

type Growth = { d7: number | null; d30: number | null; d60: number | null; allTime: number | null };

const WINDOWS = [
  { value: '30', label: t('30d'), days: 30 },
  { value: '90', label: t('90d'), days: 90 },
  { value: 'all', label: tc('range', 'All'), days: Infinity },
];

export function PlatformG(props: {
  label: string;
  handle: string;
  url: string | null;
  followers: number | null;
  growth: Growth;
  snapshots: { date: string; followers: number }[];
  source: string | null;
}) {
  const { label, handle, url, followers, growth, snapshots, source } = props;
  const [win, setWin] = useState('30');
  const days = WINDOWS.find((w) => w.value === win)?.days ?? 30;
  const chart = useMemo(() => {
    const last = snapshots.at(-1)?.date;
    const cutoff = last && Number.isFinite(days) ? new Date(Date.parse(`${last}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10) : '';
    const inWin = snapshots.filter((s) => s.date >= cutoff);
    const step = Math.max(1, Math.ceil(inWin.length / MAX_MARKS));
    const idx = inWin.map((_, i) => i).filter((i) => (inWin.length - 1 - i) % step === 0);
    return idx.map((i) => ({ ...inWin[i], prev: i > 0 ? inWin[i - step]?.followers ?? inWin[0].followers : null }));
  }, [snapshots, days]);
  const latest = snapshots.at(-1);

  return (
    <GPage className="soc-g soc-g-detail">
      <Back />
      <GSectionHeader
        size="page"
        title={label}
        caption={handle}
        action={url ? <GButton href={url} external>{t('Open profile')} <ExternalLink size={13} strokeWidth={1.75} aria-hidden /></GButton> : undefined}
      />
      <div className="soc-g-detail-top">
        <GHeroCard
          variant="a"
          caption={t('Followers')}
          value={followers == null ? null : formatFull(followers)}
          label={t('{label} followers {n}', { label, n: followers == null ? t('unknown') : formatFull(followers) })}
          title={t('The newest follower snapshot')}
          status={growth.d30 == null ? t('No 30-day history yet') : t('{pct} over 30 days', { pct: fmtPct(growth.d30) })}
          strip={<Strip points={snapshots.slice(-30)} what={t('followers')} />}
        />
        <GrowthStats growth={growth} />
      </div>
      <section className="soc-g-sec" aria-labelledby="soc-g-history">
        <GSectionHeader
          id="soc-g-history"
          size={22}
          title={t('Follower history')}
          action={<GSegmented label={t('History window')} options={WINDOWS.map((w) => ({ value: w.value, label: w.label }))} value={win} onChange={setWin} />}
        />
        <GCard p={24} className="soc-g-chart">
          <GAreaChart
            labels={chart.map((c) => fmtDay(c.date))}
            series={[{ id: 'followers', label: t('Followers'), values: chart.map((c) => c.followers), color: 'accent' }]}
            height={240}
            zeroBase={false}
            formatValue={formatFull}
            tip={(i) => {
              const c = chart[i];
              const d = c.prev == null ? null : c.followers - c.prev;
              return { title: fmtDay(c.date), lines: [formatFull(c.followers), d == null ? t('first snapshot') : t('{sign}{n} vs previous', { sign: d >= 0 ? '+' : '−', n: formatFull(Math.abs(d)) })] };
            }}
            label={t('{label} followers, {window}', { label, window: win === 'all' ? t('all time') : t('last {n} days of snapshots', { n: win }) })}
            emptyText={t('No snapshots yet.')}
          />
          {latest && <p className="soc-g-cap">{t('{n} snapshots · latest {date}', { n: snapshots.length, date: fmtDay(latest.date) })}{source ? ` · ${source}` : ''}</p>}
        </GCard>
      </section>
    </GPage>
  );
}

/** The hero strip: one tick per recent snapshot (absent below two). */
function Strip({ points, what }: { points: { date: string; followers: number }[]; what: string }) {
  if (points.length < 2) return null;
  return (
    <GTickStrip
      onHero
      values={points.map((p) => p.followers)}
      titles={points.map((p) => `${fmtDay(p.date)} · ${formatFull(p.followers)}`)}
      label={t('{what}, last {n} snapshots', { what, n: points.length })}
    />
  );
}

/** A plain number + caption: dot numerals are for heroes, a row of them reads as noise. */
function Readout({ value, label, title, tone }: { value: string; label: string; title: string; tone?: 'ok' | 'err' }) {
  return (
    <div className="soc-g-readout" title={title}>
      <span className="soc-g-num" data-tone={tone}>{value}</span>
      <span className="soc-g-cap">{label}</span>
    </div>
  );
}

function GrowthStats({ growth }: { growth: Growth }) {
  const items: [string, number | null][] = [[t('7 days'), growth.d7], [t('30 days'), growth.d30], [t('60 days'), growth.d60], [t('All time'), growth.allTime]];
  return (
    <GCard p={24} className="soc-g-statcard" aria-labelledby="soc-g-growth">
      <GSectionHeader id="soc-g-growth" size={22} title={t('Growth')} caption={t('From follower snapshots')} />
      <div className="soc-g-stats">
      {items.map(([label, v]) => (
        <Readout key={label} value={v == null ? '—' : fmtPct(v)} label={label} title={t('Follower growth over {window}, from snapshot history', { window: label.toLowerCase() })} tone={v != null && v < 0 ? 'err' : undefined} />
      ))}
      </div>
    </GCard>
  );
}

export function BeehiivG(props: {
  subscribers: number | null;
  status: { text: string; tone: 'ok' | 'err' | 'neutral'; setupHref: string | null };
  count: number;
  avgOpenRate: number | null;
  bestOpenRate: number | null;
  newsletters: Newsletter[];
  /** Subscriber snapshots, oldest first (the hero strip). */
  history: { date: string; followers: number }[];
}) {
  const { subscribers, status, count, avgOpenRate, bestOpenRate, newsletters, history } = props;
  const pct = (n: number | null) => (n == null ? null : `${n.toFixed(1)}%`);
  return (
    <GPage className="soc-g soc-g-detail">
      <Back />
      <GSectionHeader
        size="page"
        title="Newsletter"
        caption={
          <span className="soc-g-status">
            <GTag tone={status.tone} dot>{status.text}</GTag>
            {status.setupHref && <GButton size="sm" href={status.setupHref} title={t('Connect Beehiiv for live subscribers and issues')}>{t('Set up')}</GButton>}
          </span>
        }
        action={<GButton href="https://app.beehiiv.com" external>{t('Open Beehiiv')} <ExternalLink size={13} strokeWidth={1.75} aria-hidden /></GButton>}
      />
      <div className="soc-g-detail-top">
        <GHeroCard
          variant="a"
          caption={t('Subscribers')}
          value={subscribers == null ? null : formatFull(subscribers)}
          label={t('Subscribers {n}', { n: subscribers == null ? t('unknown') : formatFull(subscribers) })}
          title={t('The email list count, the same figure as the Social page')}
          status={subscribers == null ? t('No count yet') : t('Email list')}
          strip={<Strip points={history.slice(-30)} what={t('subscribers')} />}
        />
        <GCard p={24} className="soc-g-statcard" aria-labelledby="soc-g-sends">
          <GSectionHeader id="soc-g-sends" size={22} title={t('Sends')} caption={t('From Beehiiv issues')} />
          <div className="soc-g-stats soc-g-stats-3">
          <Readout value={formatFull(count)} label={t('Newsletters sent')} title={t('Issues sent')} />
          <Readout value={pct(avgOpenRate) ?? '—'} label={t('Average open rate')} title={t('Average open rate across sent issues; — when nothing was sent')} />
          <Readout value={pct(bestOpenRate) ?? '—'} label={t('Best open rate')} title={t('Best open rate of any sent issue; — when nothing was sent')} />
          </div>
        </GCard>
      </div>
      <section className="soc-g-sec" aria-labelledby="soc-g-issues">
        <GSectionHeader id="soc-g-issues" size={22} title={t('Past newsletters')} caption={t('Open an issue to see its analytics')} />
        <IssuesG newsletters={newsletters} />
      </section>
    </GPage>
  );
}

const nfmt = (n: number) => n.toLocaleString(localeTag());
const npct = (n: number) => `${n.toFixed(n < 10 ? 2 : 1)}%`;
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString(localeTag(), { month: 'short', day: 'numeric', year: 'numeric' });

function IssuesG({ newsletters }: { newsletters: Newsletter[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (newsletters.length === 0) return <GCard p={24}><GEmpty title={t('No newsletters yet')} body={t('Sent issues and their open rates show here.')} /></GCard>;
  return (
    <GCard p={16}>
      <GList divided label={t('Past newsletters')}>
        {newsletters.map((n) => {
          const open = openId === n.id;
          return (
            <li key={n.id} className="soc-g-issue">
              <GList>
                <GRow
                  onClick={() => setOpenId(open ? null : n.id)}
                  selected={open}
                  title={n.title}
                  meta={`${dateLabel(n.publishedAt)} · ${t('{n} sent', { n: nfmt(n.recipients) })}`}
                  trailing={<span className="soc-g-val" title={t('Open rate')}>{t('{pct} open', { pct: npct(n.openRate) })}</span>}
                />
              </GList>
              {open && (
                <div className="soc-g-issue-body">
                  {[
                    [t('Recipients'), nfmt(n.recipients)],
                    [t('Delivered'), `${nfmt(n.delivered)} · ${npct(n.deliveryRate)}`],
                    [t('Opens'), `${nfmt(n.opens)} · ${npct(n.openRate)}`],
                    [t('Clicks'), `${nfmt(n.clicks)} · ${npct(n.clickRate)}`],
                    [t('Unsubscribes'), `${nfmt(n.unsubscribes)} · ${npct(n.unsubscribeRate)}`],
                    [t('Spam reports'), nfmt(n.spamReports)],
                    [t('Web views'), nfmt(n.webViews)],
                  ].map(([k, v]) => (
                    <div key={k} className="soc-g-kv"><span className="soc-g-cap">{k}</span><span className="soc-g-val">{v}</span></div>
                  ))}
                  {n.webUrl && <GButton size="sm" href={n.webUrl} external>{t('Read the issue')}</GButton>}
                </div>
              )}
            </li>
          );
        })}
      </GList>
    </GCard>
  );
}
