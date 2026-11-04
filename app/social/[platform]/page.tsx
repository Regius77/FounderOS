import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { getDb } from '@/lib/data';
import { PLATFORM_LABELS, platformDetail, syncFromZernioConfig } from '@/lib/social';
import { platformVolume } from '@/founderos/lib/social-volume';
import { SocialPlatformSchema, type SocialPlatform } from '@/founderos/lib/schemas';
import { SetupLink } from '@/components/SetupLink';
import { setupHrefFor } from '@/lib/integrations-catalog';
import { formatFollowers, formatPct, GrowthBadge } from '@/founderos/components/SocialStats';
import { FollowerBarChart } from '@/founderos/components/FollowerBarChart';
import { Slab, SlabTitle, SlabCard, BigStat, MeterStack, InsightCard, PILL, PILL_ACCENT } from '@/founderos/components/slab';
import { StepLine } from '@/founderos/components/slab-charts';
import { t, tc } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 30;

/**
 * One platform, in the Brand Deals slab (2026-09-24): what you land on from
 * a /social account tile. Every number in the hero and the second row comes
 * from lib/social-volume's platformVolume, fed with this platform's own
 * snapshots and growth windows.
 */
export default function SocialPlatformPage({ params }: { params: { platform: string } }) {
  const db = getDb();
  syncFromZernioConfig(db);
  if (!SocialPlatformSchema.safeParse(params.platform).success) notFound();
  const detail = platformDetail(db, params.platform as SocialPlatform);
  // Not connected yet: say so, and point at Setup (GladOS's honest-or-absent rule).
  if (!detail) {
    return (
      <Slab>
        <SlabTitle eyebrow={t('audience')} title={PLATFORM_LABELS[params.platform as SocialPlatform]} />
        <SlabCard i={1} className="p-6">
          <div className="flex flex-wrap items-center gap-3 text-[13px] text-os-muted">
            <span className="rounded-full border border-[var(--hairline)] px-2.5 py-[3px] text-[11.5px]">{t('Not configured')}</span>
            {t('{platform} is not connected yet.', { platform: PLATFORM_LABELS[params.platform as SocialPlatform] })}
            <SetupLink href={setupHrefFor('zernio')} />
          </div>
        </SlabCard>
      </Slab>
    );
  }

  const { account, followers, growth, snapshots } = detail;
  const label = PLATFORM_LABELS[account.platform];
  const v = platformVolume({ label, followers, growth, snapshots, today: new Date().toISOString().slice(0, 10), days: WINDOW_DAYS });
  const newestFirst = [...snapshots].reverse();

  return (
    <Slab>
      <SlabTitle
        eyebrow={t('audience · {handle}', { handle: account.handle })}
        title={label}
        meta={t('{followers} followers · {pct} 7d · {n} snapshots', { followers: formatFollowers(followers), pct: formatPct(growth.d7), n: snapshots.length })}
        right={
          <>
            <Link href="/social" className={PILL}>
              <ArrowLeft className="h-3.5 w-3.5" /> {t('All platforms')}
            </Link>
            {account.url && (
              <a href={account.url} target="_blank" rel="noreferrer" data-lens="c" className={PILL_ACCENT}>
                {t('Open profile')} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </>
        }
      />

      {/* Hero row, Brand Deals' shape: the follower history + the volume card */}
      <div className="grid grid-cols-[2fr_1fr] gap-6 max-[1200px]:grid-cols-1">
        <SlabCard
          i={1}
          title={t('Follower History')}
          sub={t('{n} snapshots', { n: snapshots.length })}
          action={
            <>
              <GrowthBadge label="7d" value={growth.d7} />
              <GrowthBadge label="30d" value={growth.d30} />
              <GrowthBadge label="60d" value={growth.d60} />
              <GrowthBadge label={tc('range', 'all')} value={growth.allTime} />
            </>
          }
        >
          <div className="px-6 pb-5 pt-2">
            {/* the diagram: one bar per snapshot  -  hover for exact count + change */}
            <FollowerBarChart series={snapshots.map((s) => ({ date: s.capturedAt, followers: s.followers }))} />
            {newestFirst.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10.5px] text-os-dim">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-[3px] w-3 rounded-full bg-os-ok" /> {t('gained vs prev')}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-[3px] w-3 rounded-full bg-os-err" /> {t('dipped')}
                </span>
                <span className="ml-auto">
                  {t('latest {date}', { date: newestFirst[0].capturedAt })} · {newestFirst[0].source}
                </span>
              </div>
            )}
          </div>
        </SlabCard>

        <SlabCard i={2} title={t('Follower Volume')} className="flex flex-col">
          <div className="flex flex-1 flex-col px-6 pb-6 pt-3">
            <BigStat
              value={v.headline ?? undefined}
              display={v.headline == null ? formatFollowers(null) : undefined}
              kind="followers"
              chips={v.chips}
              caption={v.caption}
            />
            <MeterStack meters={v.meters} foot={v.foot} empty={t('no snapshots recorded for this platform yet')} />
          </div>
        </SlabCard>
      </div>

      {/* Second row: the growth windows, daily gains, THE gradient card */}
      <div className="mt-6 grid grid-cols-3 gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={3} title={t('Growth Windows')} sub={t('vs the snapshot that far back')}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 px-6 pb-6 pt-4">
            {(
              [
                [t('7 days'), growth.d7],
                [t('30 days'), growth.d30],
                [t('60 days'), growth.d60],
                [t('all time'), growth.allTime],
              ] as const
            ).map(([windowLabel, value]) => (
              <BigStat
                key={windowLabel}
                size={30}
                display={formatPct(value)}
                chips={value == null ? [] : value === 0 ? [{ text: t('flat') }] : [{ tone: value > 0 ? 'ok' : 'err', text: value > 0 ? t('up') : t('down') }]}
                caption={value == null ? t('{window} · not enough history', { window: windowLabel }) : windowLabel}
              />
            ))}
          </div>
        </SlabCard>

        <SlabCard i={4} title={t('Daily Gains')} sub={t('last {n} days', { n: WINDOW_DAYS })}>
          <div className="px-6 pt-3">
            <BigStat
              size={30}
              value={v.gainedDays}
              caption={v.intervals > 0 ? t('days with a gain, of {n} tracked', { n: v.intervals }) : t('no day-over-day history yet')}
            />
          </div>
          <StepLine series={v.series} hue="var(--ok)" unit={t(' gained')} empty={t('No follower gains in the last {n} days.', { n: WINDOW_DAYS })} />
        </SlabCard>

        <InsightCard
          i={5}
          badge={t('{n}-day change', { n: WINDOW_DAYS })}
          value={v.insight.value}
          display={v.insight.display}
          headline={v.insight.headline}
          body={v.insight.body}
          frac={v.insight.frac}
        />
      </div>
    </Slab>
  );
}
