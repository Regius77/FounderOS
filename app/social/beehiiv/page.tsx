import Link from 'next/link';
import { ArrowLeft, ExternalLink, Mail } from 'lucide-react';
import { getNewsletters } from '@/lib/newsletters';
import { newsletterVolume } from '@/founderos/lib/newsletter-volume';
import { beehiivSubscribers } from '@/lib/connectors/beehiiv';
import { SetupLink } from '@/components/SetupLink';
import { setupHrefFor } from '@/lib/integrations-catalog';
import { NewsletterList } from '@/founderos/components/NewsletterList';
import { Slab, SlabTitle, SlabCard, BigStat, Chip, MeterStack, InsightCard, PILL, PILL_ACCENT } from '@/founderos/components/slab';
import { StepLine, DotMatrix } from '@/founderos/components/slab-charts';
import { localeTag, t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * The Beehiiv newsletter, in the Brand Deals slab (2026-09-24): what you land
 * on from the /social email tile. Every number in the hero and the second
 * row comes from lib/newsletter-volume, fed with the page's own rows (the
 * live subscriber count and the past issues, seeded until a key resolves).
 */
export default async function BeehiivDashboardPage() {
  const [newsletters, subscribers] = await Promise.all([getNewsletters(), beehiivSubscribers()]);
  const live = subscribers != null; // a real key resolved a subscriber count
  const v = newsletterVolume({ newsletters, subscribers });
  const issues = newsletters.length;

  return (
    <Slab>
      <SlabTitle
        eyebrow={t('beehiiv · email list')}
        title="Newsletter"
        meta={live ? t('live via Beehiiv API') : t('seeded preview · not connected to Beehiiv')}
        right={
          <>
            <Chip tone={live ? 'ok' : 'warn'}>{live ? t('beehiiv live') : t('Not configured')}</Chip>
            {!live && <SetupLink href={setupHrefFor('beehiiv')} />}
            <Link href="/social" className={PILL}>
              <ArrowLeft className="h-3.5 w-3.5" /> {t('All platforms')}
            </Link>
            <a href="https://app.beehiiv.com" target="_blank" rel="noreferrer" data-lens="c" className={PILL_ACCENT}>
              {t('Open Beehiiv')} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </>
        }
      />

      {/* Hero row, Brand Deals' shape: the sends line + the volume card */}
      <div className="grid grid-cols-[2fr_1fr] gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={1} title={t('Sends')} sub={issues === 1 ? t('{n} issue', { n: issues }) : t('{n} issues', { n: issues })} className="pb-2">
          <div className="px-6 pb-2 pt-3">
            <BigStat size={30} value={v.totalRecipients} kind="followers" caption={t('recipients across every issue, oldest to newest')} />
          </div>
          <StepLine series={v.sends} hue="var(--send-activity)" unit={t(' sent')} empty={t('No issues sent yet.')} />
        </SlabCard>

        <SlabCard i={2} title={t('Newsletter Volume')} className="flex flex-col">
          <div className="flex flex-1 flex-col px-6 pb-6 pt-3">
            <BigStat
              value={v.headline ?? undefined}
              display={v.headline == null ? ' - ' : undefined}
              kind="followers"
              chips={v.chips}
              caption={v.caption}
            />
            <MeterStack meters={v.meters} foot={v.foot} empty={t('no sends to measure yet')} />
          </div>
        </SlabCard>
      </div>

      {/* Second row: open rate per issue, engagement, THE gradient card */}
      <div className="mt-6 grid grid-cols-3 gap-6 max-[1200px]:grid-cols-1">
        <SlabCard i={3} title={t('Open Rate')} sub={t('last 6 issues')}>
          {/* stacked: dated columns are too wide to share a row with the caption */}
          <div className="flex flex-col gap-5 px-6 pb-6 pt-3">
            <BigStat
              size={30}
              display={v.avgOpenRate == null ? ' - ' : `${v.avgOpenRate.toFixed(1)}%`}
              caption={issues > 0 ? (issues === 1 ? t('average open rate across {n} issue', { n: issues }) : t('average open rate across {n} issues', { n: issues })) : t('no issues sent yet')}
            />
            {v.openRates.length > 0 && <DotMatrix cols={v.openRates} hue="var(--ramp-1)" />}
          </div>
        </SlabCard>

        <SlabCard i={4} title="Engagement" sub={t('summed across issues')}>
          <div className="px-6 pb-6 pt-3">
            <BigStat size={30} value={v.totalClicks} unit={t('clicks')} caption={issues > 0 ? t('link clicks across every issue') : t('no clicks recorded yet')} />
            <div className="mt-4 flex flex-wrap gap-2">
              <Chip tone={v.unsubscribes > 0 ? 'warn' : 'ok'}>{t('{n} unsubscribed', { n: v.unsubscribes.toLocaleString(localeTag()) })}</Chip>
              <Chip tone={v.spamReports > 0 ? 'err' : 'ok'}>{t('{n} spam reports', { n: v.spamReports.toLocaleString(localeTag()) })}</Chip>
            </div>
          </div>
        </SlabCard>

        <InsightCard
          i={5}
          badge={t('Best open')}
          icon={<Mail size={13} strokeWidth={1.7} />}
          display={v.insight.display}
          headline={v.insight.headline}
          body={v.insight.body}
          frac={v.insight.frac}
        />
      </div>

      <SlabCard i={6} title={t('Past newsletters')} sub={t('click any issue to expand its analytics')} className="mt-6">
        <div className="px-6 pb-6 pt-4">
          <NewsletterList newsletters={newsletters} />
        </div>
      </SlabCard>
    </Slab>
  );
}
