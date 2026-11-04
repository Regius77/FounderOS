'use client';

/**
 * Combined audience + posting consistency on the kit (glados-ui SPEC S03 F4):
 * a GAreaChart and a GStackedBar on one axis with one shared cursor (syncId),
 * the carried tail dashed with a "last synced" note, a GLegend that hides a
 * platform's bars, and the same two charts full size in a GSheet. The range
 * comes from the page (F5): there is no range control here.
 */

import { useId, useMemo, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { GAreaChart, GButton, GCard, GLegend, GSectionHeader, GSheet, GStackedBar, type StackKey } from '@/components/g';
import type { PostDay } from '@/lib/posting-activity';
import type { RangePoint, SocialRange } from '@/lib/social-range';
import { audienceChartModel, fmtDay } from '@/lib/social-view';
import { formatFull } from '@/lib/format-number';
import { channelVizColor } from './channel';
import { t } from '@/lib/i18n';

/** "over 30 days" / "all time" (lib/social-view rangePhrase, translated). */
const rangePhrase = (r: SocialRange): string => (r === 'all' ? t('all time') : t('over {n} days', { n: r }));

const LABELS: Record<string, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', twitter: 'Twitter / X', youtube: 'YouTube', linkedin: 'LinkedIn', facebook: 'Facebook',
};
const labelFor = (p: string) => LABELS[p] ?? p.charAt(0).toUpperCase() + p.slice(1);

type Props = { audience: RangePoint[]; channels: RangePoint[][]; postDays: PostDay[]; range: SocialRange; today: string };

export function SocialChartsG({ audience, channels, postDays, range, today }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const m = useMemo(() => audienceChartModel({ audience, channels, postDays, range, today }), [audience, channels, postDays, range, today]);
  const net = m.net;
  const netText = net == null ? null : t('{sign}{n} net', { sign: net.net >= 0 ? '+' : '−', n: formatFull(Math.abs(net.net)) });
  const toggle = (id: string) => setHidden((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));

  const body = (big: boolean) => <Pair m={m} hidden={hidden} toggle={toggle} big={big} range={range} />;

  return (
    <GCard p={24} className="soc-g-chart">
      <GSectionHeader
        size={22}
        title={t('Combined audience')}
        caption={netText ? <span data-tone={net!.net >= 0 ? 'ok' : 'err'} className="soc-g-net" title={t('Change {range}, the same figure as the hero', { range: rangePhrase(range) })}>{netText} {rangePhrase(range)}</span> : t('No history {range}', { range: rangePhrase(range) })}
        action={<GButton variant="icon" aria-label={t('Open full size')} title={t('Full size')} onClick={() => setExpanded(true)}><Maximize2 size={14} strokeWidth={1.75} aria-hidden /></GButton>}
      />
      {body(false)}
      <GSheet open={expanded} onClose={() => setExpanded(false)} title={t('Combined audience and posting')} caption={netText ? `${netText} ${rangePhrase(range)}` : undefined}>
        {body(true)}
      </GSheet>
    </GCard>
  );
}

function Pair({ m, hidden, toggle, big, range }: { m: ReturnType<typeof audienceChartModel>; hidden: string[]; toggle: (id: string) => void; big: boolean; range: SocialRange }) {
  const syncId = `soc-aud-${useId()}`;
  const keys: StackKey[] = m.platforms.map((p) => ({ id: p, label: labelFor(p), color: channelVizColor(p) }));
  const cols = m.labels.map((l, i) => ({ id: String(i), label: l, parts: m.platforms.map((p) => m.posts[i]?.[p] ?? 0) }));
  const postsInWindow = m.platforms.reduce((s, p) => s + (m.postTotals[p] ?? 0), 0);
  return (
    <div className="soc-g-pair">
      <GAreaChart
        labels={m.labels}
        axisLabels={m.axisLabels}
        series={[{ id: 'audience', label: t('Total audience'), values: m.values, carried: m.carried, color: 'accent' }]}
        height={big ? 300 : 168}
        zeroBase={false}
        syncId={syncId}
        formatValue={formatFull}
        tip={(i) => ({
          title: m.labels[i],
          lines: [
            m.values[i] == null ? t('no data') : t('{n} audience', { n: formatFull(m.values[i]!) }),
            ...(m.carried[i] && m.from[i] ? [t('carried from {date}', { date: fmtDay(m.from[i]!) })] : []),
          ],
        })}
        label={m.weekly ? t('Total audience {range}, by week', { range: rangePhrase(range) }) : t('Total audience {range}', { range: rangePhrase(range) })}
        state={m.values.every((v) => v == null) ? 'empty' : undefined}
        emptyText={t('No audience history yet.')}
      />
      {m.stale && m.lastSynced && (
        <p className="soc-g-cap" data-stale-note="">{t('Last synced {date}. The dashed line carries that value forward.', { date: fmtDay(m.lastSynced) })}</p>
      )}
      <div className="soc-g-posting-head">
        <span className="soc-g-sub">{t('Posting consistency')}</span>
        <span className="soc-g-cap">{t('{posts} posts · {platforms} platforms', { posts: postsInWindow, platforms: m.platforms.length })}</span>
      </div>
      <GStackedBar
        columns={cols}
        keys={keys}
        hiddenKeys={hidden}
        height={big ? 200 : 96}
        syncId={syncId}
        label={m.weekly ? t('Posts per week by platform, {range}', { range: rangePhrase(range) }) : t('Posts per day by platform, {range}', { range: rangePhrase(range) })}
        className="soc-g-stack"
        emptyText={t('No posts in this range.')}
      />
      {keys.length > 0 && (
        <GLegend
          label={t("Show or hide a platform's posts")}
          items={keys.map((k) => ({ id: k.id, label: k.label, count: m.postTotals[k.id] ?? 0, color: k.color ?? 'muted', on: !hidden.includes(k.id) }))}
          onToggle={toggle}
        />
      )}
    </div>
  );
}
