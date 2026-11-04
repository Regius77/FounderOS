'use client';

/**
 * /analytics under the GladOS style (glados-ui SPEC S03 §4.4, §5.4; X5).
 * Same data as the Classic tree. Sparks only where real history exists
 * (F16), one audience definition with /social (F17, C19), the one-slice run
 * outcomes donut becomes a stat and a split meter (F18), an empty state that
 * says why the run chart is empty (F19), and platform cards without handles
 * or share bars (F21: the donut owns share).
 */

import { Instagram, Linkedin, Music2, Twitter, Youtube, type LucideIcon } from 'lucide-react';
import {
  GAreaChart, GBar, GButton, GCard, GDelta, GDonut, GList, GPage, GRow, GSectionHeader, GSparkline, GTag,
  type DonutSlice,
} from '@/components/g';
import { formatFull } from '@/lib/format-number';
import { fmtDay } from '@/lib/social-view';
import { channelVizColor } from '@/components/social/channel';
import { t } from '@/lib/i18n';

export type AnalyticsTileG = {
  id: string;
  label: string;
  value: string;
  unit: string;
  source: string;
  /** A change with its window, rendered by GDelta. */
  change?: { cur: number; prev: number; window: string } | null;
  /** A plain secondary line ("+12 runs · 7 days"). */
  note?: string | null;
  spark?: number[];
  href?: string;
};

export type AnalyticsGProps = {
  liveCount: number;
  pendingCount: number;
  tiles: AnalyticsTileG[];
  audience: { total: number; slices: DonutSlice[] };
  runs: {
    /** The run log window the distribution reads ("all time", or "latest 2,000" when capped). */
    scope: string;
    total: number;
    byAgent: DonutSlice[];
    ok: number;
    recentFailures: { id: string; agent: string; at: string }[];
    volume: { date: string; count: number }[];
    windowRuns: number;
    lastRunAt: string | null;
  };
  pending: { id: string; label: string; source: string; setupHref: string }[];
  platforms: { platform: string; label: string; href: string; followers: number | null; cur: number | null; prev: number | null; spark: number[] }[];
};

const ICONS: Record<string, LucideIcon> = { instagram: Instagram, tiktok: Music2, twitter: Twitter, youtube: Youtube, linkedin: Linkedin };

export function AnalyticsG(p: AnalyticsGProps) {
  const { tiles, audience, runs, pending, platforms } = p;
  const failed = runs.total - runs.ok;
  const okPct = runs.total > 0 ? Math.round((runs.ok / runs.total) * 100) : 0;
  return (
    <GPage className="an-g">
      <GSectionHeader
        size="page"
        title="Analytics"
        caption={t('Operating metrics')}
        action={<GTag tone="accent" title={t('Live connector reads and metrics still waiting on a key')}>{t('{live} live · {pending} pending', { live: p.liveCount, pending: p.pendingCount })}</GTag>}
      />

      {/* Live tiles (F16, F17) */}
      {tiles.length > 0 && (
        <div className="an-g-tiles">
          {tiles.map((tile) => (
            <GCard key={tile.id} p={20} href={tile.href} className="an-g-tile" title={`${tile.label}: ${tile.source}`}>
              <span className="an-g-tile-label">{tile.label}</span>
              <span className="an-g-tile-value">
                <span className="soc-g-num">{tile.value}</span>
                {tile.unit && <span className="soc-g-cap">{tile.unit}</span>}
              </span>
              <span className="an-g-tile-foot">
                {tile.change ? <GDelta cur={tile.change.cur} prev={tile.change.prev} window={tile.change.window} /> : <span className="soc-g-cap">{tile.note ?? tile.source}</span>}
                {tile.spark && tile.spark.length > 1 && <GSparkline values={tile.spark} label={t('{label}, last {n} points', { label: tile.label, n: tile.spark.length })} color="accent" width={96} height={26} />}
              </span>
            </GCard>
          ))}
        </div>
      )}

      {/* Distribution (F18) */}
      {(audience.total > 0 || runs.total > 0) && (
        <section className="soc-g-sec" aria-labelledby="an-g-dist">
          <GSectionHeader id="an-g-dist" size={22} title={t('Distribution')} caption={t('Share of each total')} />
          <div className="an-g-dist">
            {audience.total > 0 && (
              <GCard p={24} className="an-g-card">
                <GSectionHeader size={22} title={t('Audience share')} caption={t('{n} total audience', { n: formatFull(audience.total) })} />
                <GDonut slices={audience.slices} size={150} formatValue={formatFull} centreLabel={t('total audience')} label={t('Audience share by channel')} />
              </GCard>
            )}
            {runs.total > 0 && (
              <GCard p={24} className="an-g-card">
                <GSectionHeader size={22} title={t('Runs by agent')} caption={t('{n} runs, {scope}', { n: formatFull(runs.total), scope: runs.scope })} />
                <GDonut slices={runs.byAgent} size={150} formatValue={formatFull} centreLabel={t('runs')} label={t('Agent runs by agent, {scope}', { scope: runs.scope })} />
              </GCard>
            )}
            {runs.total > 0 && (
              <GCard p={24} className="an-g-card" aria-labelledby="an-g-outcomes">
                <GSectionHeader id="an-g-outcomes" size={22} title={t('Run outcomes')} caption={runs.scope.charAt(0).toUpperCase() + runs.scope.slice(1)} />
                <div className="an-g-outcome">
                  <span className="soc-g-num">{t('{pct}% succeeded', { pct: okPct })}</span>
                  <GBar
                    label={t('{ok} succeeded, {failed} failed', { ok: formatFull(runs.ok), failed: formatFull(failed) })}
                    segments={[
                      { value: runs.ok, tone: 'ok', label: t('{n} succeeded', { n: formatFull(runs.ok) }) },
                      ...(failed > 0 ? [{ value: failed, tone: 'err' as const, label: t('{n} failed', { n: formatFull(failed) }) }] : []),
                    ]}
                  />
                  <span className="soc-g-cap">{t('{failed} failed of {total}', { failed: formatFull(failed), total: formatFull(runs.total) })}</span>
                </div>
                {runs.recentFailures.length > 0 && (
                  <GList divided label={t('Most recent failures')}>
                    {runs.recentFailures.map((f) => <GRow key={f.id} title={f.agent} trailing={<span className="soc-g-cap">{fmtDay(f.at.slice(0, 10))}</span>} />)}
                  </GList>
                )}
              </GCard>
            )}
          </div>
        </section>
      )}

      {/* Run volume (F19) + awaiting credentials (F20). With no runs in the window the volume card
          shrinks to a one-line note and credentials takes the full row, so no empty chart well stands
          next to a tall list. */}
      <div className="an-g-pair" data-volume={runs.windowRuns === 0 ? 'empty' : undefined}>
        <GCard p={24} className="an-g-card" aria-labelledby="an-g-volume">
          <GSectionHeader id="an-g-volume" size={22} title={t('Agent run volume')} caption={t('{n} runs in the last 14 days', { n: formatFull(runs.windowRuns) })} />
          {runs.windowRuns === 0 ? (
            <p className="soc-g-cap an-g-volume-empty" data-run-volume-empty="">
              {runs.total === 0 ? t('No agent runs recorded yet.') : t('No runs in the last 14 days.')}
              {runs.lastRunAt ? ` ${t('Last run {date}.', { date: fmtDay(runs.lastRunAt.slice(0, 10)) })}` : ''}
            </p>
          ) : (
            <GAreaChart
              labels={runs.volume.map((d) => fmtDay(d.date))}
              series={[{ id: 'runs', label: t('Runs'), values: runs.volume.map((d) => d.count), color: 'accent' }]}
              height={170}
              formatValue={formatFull}
              label={t('Agent runs per day, last 14 days')}
            />
          )}
        </GCard>
        <GCard p={24} className="an-g-card" aria-labelledby="an-g-pending">
          <GSectionHeader id="an-g-pending" size={22} title={t('Awaiting credentials')} caption={pending.length === 0 ? t('Every connector is live') : t('{n} metrics need a key', { n: pending.length })} />
          {pending.length > 0 && (
            <GList divided label={t('Metrics awaiting credentials')}>
              {pending.map((m) => (
                <GRow key={m.id} title={m.label} meta={m.source} trailing={<GButton size="sm" href={m.setupHref} title={t('Connect {source}', { source: m.source })}>{t('Set up')}</GButton>} />
              ))}
            </GList>
          )}
          <GButton href="/integrations" className="an-g-open">{t('Open integrations')}</GButton>
        </GCard>
      </div>

      {/* Audience by platform (F21) */}
      {platforms.length > 0 && (
        <section className="soc-g-sec" aria-labelledby="an-g-platforms">
          <GSectionHeader id="an-g-platforms" size={22} title={t('Audience by platform')} action={<GButton size="sm" href="/social">{t('Open Social')}</GButton>} />
          <div className="an-g-platforms">
            {platforms.map((pl) => {
              const Icon = ICONS[pl.platform] ?? Instagram;
              return (
                <GCard key={pl.platform} p={20} href={pl.href} className="an-g-tile" title={t('{label}: open details', { label: pl.label })}>
                  <span className="soc-g-acct-head">
                    <span className="soc-g-icon"><Icon size={14} strokeWidth={1.75} aria-hidden /></span>
                    <span className="soc-g-acct-name">{pl.label}</span>
                  </span>
                  <span className="an-g-tile-value"><span className="soc-g-num">{pl.followers == null ? '—' : formatFull(pl.followers)}</span></span>
                  <span className="an-g-tile-foot">
                    {pl.cur != null && pl.prev != null ? <GDelta cur={pl.cur} prev={pl.prev} window={t('7 days')} /> : <span className="soc-g-cap">{t('no 7d history')}</span>}
                    {pl.spark.length > 1 && <GSparkline values={pl.spark} label={t('{label} followers, last {n} snapshots', { label: pl.label, n: pl.spark.length })} color={channelVizColor(pl.platform)} width={96} height={26} />}
                  </span>
                </GCard>
              );
            })}
          </div>
        </section>
      )}
    </GPage>
  );
}
