import type { Meter, Tone } from '@/founderos/components/slab';
import type { SeriesPoint } from '@/founderos/components/slab-charts';
import { newsletterSummary, type Newsletter } from '@/lib/newsletters';
import { t, localeTag } from '@/lib/i18n';

/**
 * /social/beehiiv in the Brand Deals look (Alex, 2026-09-24). One pure
 * pass over the page's own rows (the Beehiiv subscriber count and the past
 * issues) gives the Newsletter Volume card, the sends step line, the
 * open-rate dot matrix and the one "Best open" card. The funnel meters are
 * ratios of SUMMED send stats, so a big send weighs more than a small one;
 * averaging per-issue percentages would not be a fraction of a real whole.
 * Seeded issues (id `seed-*`) are labelled as a preview, never passed off.
 */
export type NewsletterVolume = {
  headline: number | null;
  chips: Array<{ tone?: Tone; text: string }>;
  caption: string;
  meters: Meter[];
  foot: string;
  sends: SeriesPoint[];
  openRates: SeriesPoint[];
  /** mean of per-issue open rates (Beehiiv's own figure), null before the first send */
  avgOpenRate: number | null;
  totalRecipients: number;
  totalClicks: number;
  unsubscribes: number;
  spamReports: number;
  insight: { display: string; headline: string; body: string; frac: number };
};

const MATRIX_COLS = 6;
const clamp = (f: number) => (Number.isFinite(f) ? Math.max(0, Math.min(1, f)) : 0);
const pct = (f: number, digits = 1) => `${(f * 100).toFixed(digits)}%`;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(localeTag(), { month: 'short', day: 'numeric', timeZone: 'UTC' });
const sum = (list: Newsletter[], k: keyof Pick<Newsletter, 'recipients' | 'delivered' | 'opens' | 'clicks' | 'unsubscribes' | 'spamReports'>) =>
  list.reduce((n, x) => n + x[k], 0);

export function newsletterVolume(x: { newsletters: Newsletter[]; subscribers: number | null }): NewsletterVolume {
  const list = x.newsletters;
  const count = list.length;
  const summary = newsletterSummary(list);
  const oldestFirst = [...list].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  const seeded = count > 0 && list.every((n) => n.id.startsWith('seed-'));

  const recipients = sum(list, 'recipients');
  const delivered = sum(list, 'delivered');
  const opens = sum(list, 'opens');
  const clicks = sum(list, 'clicks');
  const unsubscribes = sum(list, 'unsubscribes');
  const spamReports = sum(list, 'spamReports');

  const chips: NewsletterVolume['chips'] = [];
  if (count) {
    chips.push({ tone: 'accent', text: count === 1 ? t('{n} issue', { n: count }) : t('{n} issues', { n: count }) });
    chips.push({ tone: 'ok', text: t('{pct}% avg open', { pct: (summary.avgOpenRate ?? 0).toFixed(1) }) });
  }

  const meters: Meter[] = [];
  if (recipients > 0) meters.push({ label: t('Delivered'), frac: clamp(delivered / recipients), display: t('{pct} of sends', { pct: pct(delivered / recipients) }), hue: 'var(--ok)' });
  if (delivered > 0) meters.push({ label: t('Opened'), frac: clamp(opens / delivered), display: t('{pct} of delivered', { pct: pct(opens / delivered) }), hue: 'var(--ramp-1)' });
  if (opens > 0) meters.push({ label: t('Clicked'), frac: clamp(clicks / opens), display: t('{pct} of opens', { pct: pct(clicks / opens) }), hue: 'var(--ramp-3)' });
  if (delivered > 0) meters.push({ label: t('Unsubscribed'), frac: clamp(unsubscribes / delivered), display: t('{pct} of delivered', { pct: pct(unsubscribes / delivered, 2) }), hue: 'var(--warn)' });

  const foot = count
    ? `${count === 1 ? t('{n} issue', { n: count }) : t('{n} issues', { n: count })} · ${t('{n} sends', { n: recipients.toLocaleString(localeTag()) })}${seeded ? t(' · seeded preview') : ''}`
    : t('no issues yet');

  const best = list.reduce<Newsletter | null>((b, n) => (b && b.openRate >= n.openRate ? b : n), null);
  const insight: NewsletterVolume['insight'] = best
    ? {
        display: `${best.openRate.toFixed(1)}%`,
        headline: t('Best open rate: {title}.', { title: best.title }),
        body: `${count === 1 ? t('{pct}% average across {n} issue', { pct: (summary.avgOpenRate ?? 0).toFixed(1), n: count }) : t('{pct}% average across {n} issues', { pct: (summary.avgOpenRate ?? 0).toFixed(1), n: count })} · ${shortDate(best.publishedAt)}`,
        frac: clamp(best.openRate / 100),
      }
    : { display: t('none'), headline: t('No issues sent yet.'), body: t('Open rates show here after the first send.'), frac: 0 };

  return {
    headline: x.subscribers,
    chips,
    caption: x.subscribers != null ? t('subscribers, live via Beehiiv') : t('no live subscriber count · add BEEHIIV_API_KEY'),
    meters,
    foot,
    sends: oldestFirst.map((n) => ({ label: shortDate(n.publishedAt), count: n.recipients })),
    openRates: oldestFirst.slice(-MATRIX_COLS).map((n) => ({ label: shortDate(n.publishedAt), count: n.openRate })),
    avgOpenRate: count ? summary.avgOpenRate : null,
    totalRecipients: recipients,
    totalClicks: clicks,
    unsubscribes,
    spamReports,
    insight,
  };
}
