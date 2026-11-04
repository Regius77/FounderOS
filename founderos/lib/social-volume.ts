import type { Meter, Tone } from '@/founderos/components/slab';
import type { SeriesPoint } from '@/founderos/components/slab-charts';
import { t, localeTag } from '@/lib/i18n';

/**
 * /social in the Brand Deals look (Alex, 2026-09-24). One pure pass over
 * the page's own real rows (channel follower counts, audience growth, the
 * Instagram DM threads, the publish queue, Zernio's posting history) gives
 * the Audience Volume card, the posting step line, the platform mix and the
 * single "Needs reply" insight. Nothing here invents a number: a channel
 * with no reading is an empty meter labelled offline.
 */
export type SocialVolume = {
  headline: number;
  chips: Array<{ tone?: Tone; text: string }>;
  caption: string;
  meters: Meter[];
  foot: string;
  series: SeriesPoint[];
  postsInWindow: number;
  mix: SeriesPoint[];
  insight: { value: number; headline: string; body: string; frac: number };
};

const HUES = ['var(--ramp-1)', 'var(--ramp-2)', 'var(--ramp-3)', 'var(--ramp-4)'];
const MIX: Array<[string, string]> = [
  ['instagram', 'IG'],
  ['tiktok', 'TT'],
  ['twitter', 'X'],
  ['youtube', 'YT'],
  ['linkedin', 'LI'],
];
const METERS = 4;

const growthText = (n: number) => `${n >= 0 ? '+' : ''}${Math.abs(n) < 10 ? n.toFixed(2) : n.toFixed(1)}% ${t('7d')}`;
const utcLabel = (d: Date) => d.toLocaleDateString(localeTag(), { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function socialVolume(x: {
  channels: Array<{ key: string; label: string; value: number | null }>;
  total: number;
  growth7: number | null;
  leader: string | null;
  dmThreads: Array<{ name: string; unreplied: boolean }>;
  queued: number;
  postDays: Array<{ date: string; platforms: string[] }>;
  /** YYYY-MM-DD, computed by the page so the axis cannot drift */
  today: string;
  days?: number;
}): SocialVolume {
  const days = x.days ?? 30;
  const live = x.channels.filter((c) => c.value != null);
  const owed = x.dmThreads.filter((th) => th.unreplied);

  const chips: SocialVolume['chips'] = [];
  if (x.growth7 != null && Number.isFinite(x.growth7)) chips.push({ tone: x.growth7 >= 0 ? 'ok' : 'err', text: growthText(x.growth7) });
  if (owed.length) chips.push({ tone: 'warn', text: t('{n} need reply', { n: owed.length }) });
  if (x.queued) chips.push({ tone: 'accent', text: t('{n} queued', { n: x.queued }) });

  const caption = live.length
    ? `${live.length === 1 ? t('across {n} live channel', { n: live.length }) : t('across {n} live channels', { n: live.length })}${
        x.leader ? t(' · {name} leads 7-day growth', { name: x.leader }) : ''
      }`
    : t('no channels reporting yet');

  // Biggest channels first; the ones with no reading sink to the bottom.
  const ranked = [...x.channels].sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
  const shown = ranked.slice(0, METERS);
  const meters: Meter[] = shown.map((c, i) => {
    const f = c.value != null && x.total > 0 ? Math.max(0, Math.min(1, c.value / x.total)) : 0;
    return {
      label: c.label,
      frac: f,
      display: c.value == null ? t('offline') : `${c.value.toLocaleString(localeTag())} · ${Math.round(f * 100)}%`,
      hue: HUES[i],
    };
  });
  const rest = x.channels.length - shown.length;
  const foot = `${t('share of total reach')}${rest > 0 ? (rest === 1 ? t(' · {n} smaller channel', { n: rest }) : t(' · {n} smaller channels', { n: rest })) : ''}`;

  // Posts per UTC day (Zernio stamps are ISO dates), oldest first, ending today.
  const end = new Date(`${x.today}T00:00:00Z`);
  const keys: string[] = [];
  const series: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86_400_000);
    keys.push(d.toISOString().slice(0, 10));
    series.push({ label: utcLabel(d), count: 0 });
  }
  const index = new Map(keys.map((k, i) => [k, i]));
  const mixCounts = new Map<string, number>(MIX.map(([k]) => [k, 0]));
  let postsInWindow = 0;
  for (const p of x.postDays) {
    const i = index.get(p.date);
    if (i === undefined) continue;
    series[i].count += 1;
    postsInWindow += 1;
    for (const platform of new Set(p.platforms)) {
      if (mixCounts.has(platform)) mixCounts.set(platform, (mixCounts.get(platform) ?? 0) + 1);
    }
  }
  const mix = MIX.map(([k, label]) => ({ label, count: mixCounts.get(k) ?? 0 }));

  const threads = x.dmThreads.length;
  const insight = {
    value: owed.length,
    headline: owed.length ? t('{n} of {total} Instagram threads need a reply.', { n: owed.length, total: threads }) : t('Inbox clear.'),
    body: owed.length
      ? owed
          .slice(0, 3)
          .map((th) => th.name)
          .join(' · ')
      : threads
        ? t('{n} threads, every one answered.', { n: threads })
        : t('No Instagram threads yet.'),
    frac: threads ? owed.length / threads : 0,
  };

  return { headline: x.total, chips, caption, meters, foot, series, postsInWindow, mix, insight };
}

/**
 * /social/[platform] in the same look (2026-09-24): one platform's snapshots
 * and growth windows become the Follower Volume card, a followers-gained-per-
 * day step line and the "30-day change" card. A day's change is the delta
 * from the snapshot before it, so a gap in the history is booked on the day
 * the next reading lands. Dips sit at zero on the line (it counts gains) and
 * are named by the "Days dipped" meter and the net figure instead.
 */
export type PlatformVolume = {
  headline: number | null;
  chips: Array<{ tone?: Tone; text: string }>;
  caption: string;
  meters: Meter[];
  foot: string;
  series: SeriesPoint[];
  intervals: number;
  gainedDays: number;
  dippedDays: number;
  trackedDays: number;
  net: number | null;
  insight: { value: number; display: string; headline: string; body: string; frac: number };
};

const DAY_MS = 86_400_000;
const windowText = (n: number, w: string) => `${n >= 0 ? '+' : ''}${Math.abs(n) < 10 ? n.toFixed(2) : n.toFixed(1)}% ${w}`;
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${Math.abs(n).toLocaleString(localeTag())}`;
const isoLabel = (iso: string) => utcLabel(new Date(`${iso}T00:00:00Z`));

export function platformVolume(x: {
  label: string;
  followers: number | null;
  growth: { d7: number | null; d30: number | null; d60: number | null; allTime: number | null };
  snapshots: Array<{ capturedAt: string; followers: number; source: string }>;
  /** YYYY-MM-DD (UTC), computed by the page so the axis cannot drift */
  today: string;
  days?: number;
}): PlatformVolume {
  const days = x.days ?? 30;
  const snaps = [...x.snapshots].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  const end = new Date(`${x.today}T00:00:00Z`);
  const startKey = new Date(end.getTime() - (days - 1) * DAY_MS).toISOString().slice(0, 10);

  const keys: string[] = [];
  const series: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * DAY_MS);
    keys.push(d.toISOString().slice(0, 10));
    series.push({ label: utcLabel(d), count: 0 });
  }
  const index = new Map(keys.map((k, i) => [k, i]));

  let intervals = 0;
  let gainedDays = 0;
  let dippedDays = 0;
  let net = 0;
  let best: { label: string; gain: number } | null = null;
  snaps.forEach((s, i) => {
    if (i === 0) return;
    const at = index.get(s.capturedAt);
    if (at === undefined) return;
    const delta = s.followers - snaps[i - 1].followers;
    intervals += 1;
    net += delta;
    if (delta > 0) {
      gainedDays += 1;
      series[at].count += delta;
      if (!best || delta > best.gain) best = { label: series[at].label, gain: delta };
    } else if (delta < 0) dippedDays += 1;
  });
  const trackedDays = new Set(snaps.map((s) => s.capturedAt).filter((d) => d >= startKey && d <= x.today)).size;
  const peak = snaps.length ? Math.max(...snaps.map((s) => s.followers)) : null;

  const chips: PlatformVolume['chips'] = [];
  for (const [value, w] of [
    [x.growth.d7, t('7d')],
    [x.growth.d30, t('30d')],
  ] as const) {
    if (value != null && Number.isFinite(value)) chips.push({ tone: value >= 0 ? 'ok' : 'err', text: windowText(value, w) });
  }

  const n = snaps.length;
  const caption =
    x.followers == null
      ? t('no follower reading yet')
      : `${n === 1 ? t('{label} followers · {n} snapshot', { label: x.label, n }) : t('{label} followers · {n} snapshots', { label: x.label, n })}${n ? t(' since {date}', { date: isoLabel(snaps[0].capturedAt) }) : ''}`;

  const meters: Meter[] = [];
  if (intervals > 0) {
    meters.push({ label: t('Days gained ({a}/{b})', { a: gainedDays, b: intervals }), frac: gainedDays / intervals, display: t('{a} of {b}', { a: gainedDays, b: intervals }), hue: 'var(--ok)' });
    meters.push({ label: t('Days dipped ({a}/{b})', { a: dippedDays, b: intervals }), frac: dippedDays / intervals, display: t('{a} of {b}', { a: dippedDays, b: intervals }), hue: 'var(--err)' });
  }
  if (trackedDays > 0) {
    const f = Math.min(1, trackedDays / days);
    meters.push({ label: t('Tracked days ({a}/{b})', { a: trackedDays, b: days }), frac: f, display: `${Math.round(f * 100)}%`, hue: 'var(--ramp-1)' });
  }
  if (x.followers != null && peak != null && peak > 0) {
    meters.push({
      label: t('Of all-time peak'),
      frac: Math.max(0, Math.min(1, x.followers / peak)),
      display: t('{a} of {b}', { a: x.followers.toLocaleString(localeTag()), b: peak.toLocaleString(localeTag()) }),
      hue: 'var(--accent)',
    });
  }

  const latest = snaps.at(-1);
  const foot = latest
    ? `${n === 1 ? t('{n} snapshot', { n }) : t('{n} snapshots', { n })} · ${t('latest {date}', { date: isoLabel(latest.capturedAt) })} · ${latest.source}`
    : t('no snapshots yet');

  const bestDay = best as { label: string; gain: number } | null;
  const insight: PlatformVolume['insight'] =
    intervals === 0
      ? { value: 0, display: t('none'), headline: t('Not enough history for a trend yet.'), body: t('Two snapshots make a line; the next sync adds one.'), frac: 0 }
      : {
          value: net,
          display: signed(net),
          headline:
            net > 0
              ? t('Gained {n} followers in the last {days} days.', { n: net.toLocaleString(localeTag()), days })
              : net < 0
                ? t('Lost {n} followers in the last {days} days.', { n: Math.abs(net).toLocaleString(localeTag()), days })
                : t('Flat over the last {days} days.', { days }),
          body: `${t('up on {a} of {b} tracked days', { a: gainedDays, b: intervals })}${
            bestDay ? t(' · best day {day} (+{n})', { day: bestDay.label, n: bestDay.gain.toLocaleString(localeTag()) }) : ''
          }`,
          frac: gainedDays / intervals,
        };

  return {
    headline: x.followers,
    chips,
    caption,
    meters,
    foot,
    series,
    intervals,
    gainedDays,
    dippedDays,
    trackedDays,
    net: intervals > 0 ? net : null,
    insight,
  };
}
