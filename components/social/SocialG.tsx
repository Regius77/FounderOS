'use client';

/**
 * /social under the GladOS style (glados-ui SPEC S03 §4.1, §5.2; X5). Same
 * data as the Classic tree (the server page fetches once), every widget a G
 * kit part. Brody's complaint, fixed here: no glows (kit cards are borderless
 * with one soft shadow), one font (Geist, no mono), one spacing scale (kit
 * tokens), and less clutter: the total audience shows once, one range
 * control drives every figure, no handles or share bars on the account cards,
 * no recency dots, one list for recent posts.
 */

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Instagram, Linkedin, Mail, Music2, Twitter, Youtube, type LucideIcon } from 'lucide-react';
import {
  GButton, GCard, GDelta, GDonut, GEmpty, GHeroCard, GList, GPage, GRow, GSampleBadge, GSectionHeader, GSegmented, GShareBar, GStat, GTag, GTickStrip,
  type DonutSlice,
} from '@/components/g';
import type { SocialStatusPill } from '@/lib/social-status';
import type { DmThread } from '@/lib/social';
import type { PostDay } from '@/lib/posting-activity';
import type { SocialPost } from '@/lib/schemas';
import { channelsNetChange, netChange, seriesWindow, type RangePoint, type SocialRange } from '@/lib/social-range';
import { formatFull } from '@/lib/format-number';
import { fmtPct, parseRange, RANGE_OPTIONS, rangeParam, stripValues } from '@/lib/social-view';
import { channelVizColor } from './channel';
import { SocialChartsG } from './SocialChartsG';
import { SeriesSheetG } from './SeriesSheetG';
import { DmInboxSheetG } from './DmInboxG';
import { PostComposerG } from './PostComposerG';
import { ContentCrewG } from './ContentCrew';
import type { ContentCrew } from '@/lib/social-crew';
import { t } from '@/lib/i18n';

/** "over 30 days" / "all time" (lib/social-view rangePhrase, translated). */
const rangePhrase = (r: SocialRange): string => (r === 'all' ? t('all time') : t('over {n} days', { n: r }));

export type SocialAccountG = {
  platform: string;
  label: string;
  href: string;
  followers: number | null;
  /** 7-day change from lib/social-range (null without history). */
  cur: number | null;
  prev: number | null;
};

export type SocialRecentG =
  | { kind: 'live'; posts: { key: string; platform: string; ago: string; caption: string; status: string; url: string | null }[] }
  | { kind: 'sample'; posts: { tag: string; ago: string; caption: string; kind: string; views: number; likes: number; ratio: string }[]; avg: string }
  | { kind: 'empty'; setupHref: string | null; hint: string };

export type SocialGProps = {
  pill: SocialStatusPill;
  accounts: SocialAccountG[];
  /** Platforms the composer offers that have no connected account. */
  unconnected: { platform: string; label: string }[];
  zernioSetupHref: string;
  total: number;
  /** Each audience channel's history (platforms + email). */
  channels: { key: string; label: string; points: RangePoint[] }[];
  /** The summed audience line. */
  audience: RangePoint[];
  dmPoints: RangePoint[];
  totalDms: number;
  dmThreads: DmThread[];
  nowMs: number;
  postDays: PostDay[];
  today: string;
  recent: SocialRecentG;
  posts: SocialPost[];
  queuedCount: number;
  /** F12: the Growth agents card in the right column beside Recent posts */
  crew: ContentCrew;
};

const ICONS: Record<string, LucideIcon> = { instagram: Instagram, tiktok: Music2, twitter: Twitter, youtube: Youtube, linkedin: Linkedin, email: Mail };


const toneOf = (tone: SocialStatusPill['tone']) => (tone === 'off' ? 'neutral' : tone);

export function SocialG(props: SocialGProps) {
  const { pill, accounts, unconnected, zernioSetupHref, total, channels, audience, dmPoints, totalDms, dmThreads, nowMs, postDays, today, recent, posts, queuedCount, crew } = props;
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [range, setRangeState] = useState<SocialRange>(() => parseRange(search?.get('range')));
  const [sheet, setSheet] = useState<'audience' | 'dms' | 'inbox' | null>(null);

  // One range for the page (F5): the hero sub-line and strip, the DM delta and both charts.
  const setRange = useCallback(
    (v: string) => {
      const r = parseRange(v);
      setRangeState(r);
      const q = new URLSearchParams(search?.toString() ?? '');
      q.set('range', rangeParam(r));
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [pathname, router, search],
  );

  const channelPoints = useMemo(() => channels.map((c) => c.points), [channels]);
  const growth = useMemo(() => channelsNetChange(channelPoints, range, today), [channelPoints, range, today]);
  const strip = useMemo(() => stripValues(audience, range, today), [audience, range, today]);
  const dm = useMemo(() => (dmPoints.length ? netChange(dmPoints, seriesWindow(range, dmPoints, today)) : null), [dmPoints, range, today]);
  const unreplied = dmThreads.filter((th) => th.unreplied).length;
  const hasEmail = channels.some((c) => c.key === 'email');

  const slices: DonutSlice[] = [
    ...accounts.map((a) => ({ id: a.platform, label: a.label, value: a.followers ?? 0, color: channelVizColor(a.platform) })),
  ];
  const largest = slices.reduce<DonutSlice | null>((m, s) => (!m || s.value > m.value ? s : m), null);
  const share = (v: number) => (total > 0 ? `${((v / total) * 100).toFixed(1)}%` : '—');

  return (
    <GPage className="soc-g">
      <GSectionHeader
        size="page"
        title="Social"
        caption={t('Audience, growth and publishing')}
        action={
          <span className="soc-g-status" title={pill.title} data-social-status="">
            <GTag tone={toneOf(pill.tone)} dot>{pill.text}</GTag>
            {pill.setupHref && <GButton size="sm" href={pill.setupHref} title={pill.title}>{t('Set up')}</GButton>}
          </span>
        }
      />

      {/* Accounts (F2): one card per channel; the total lives in the hero only. */}
      <section className="soc-g-sec" aria-labelledby="soc-g-accounts">
        <GSectionHeader id="soc-g-accounts" size={22} title={t('Accounts')} />
        <div className="soc-g-accounts">
          {accounts.map((a) => {
            const Icon = ICONS[a.platform] ?? Mail;
            return (
              <GCard key={a.platform} href={a.href} p={20} className="soc-g-acct" title={`${a.label}: ${a.followers == null ? t('no count yet') : a.platform === 'email' ? t('{n} subscribers', { n: formatFull(a.followers) }) : t('{n} followers', { n: formatFull(a.followers) })} · ${t('open details')}`}>
                <span className="soc-g-acct-head">
                  <span className="soc-g-icon"><Icon size={14} strokeWidth={1.75} aria-hidden /></span>
                  <span className="soc-g-acct-name">{a.label}</span>
                </span>
                <span className="soc-g-num">{a.followers == null ? '—' : formatFull(a.followers)}</span>
                <span className="soc-g-acct-delta">
                  {a.cur != null && a.prev != null ? <GDelta cur={a.cur} prev={a.prev} window={t('7 days')} /> : <span className="soc-g-cap">{t('no 7d history')}</span>}
                </span>
              </GCard>
            );
          })}
          {unconnected.map((u) => {
            const Icon = ICONS[u.platform] ?? Mail;
            return (
              <GCard key={u.platform} p={20} className="soc-g-acct soc-g-acct-off">
                <span className="soc-g-acct-head">
                  <span className="soc-g-icon"><Icon size={14} strokeWidth={1.75} aria-hidden /></span>
                  <span className="soc-g-acct-name">{u.label}</span>
                </span>
                <span className="soc-g-num soc-g-num-dim">—</span>
                <span className="soc-g-acct-delta">
                  <span className="soc-g-cap">{t('Not connected')}</span>
                  <GButton size="sm" href={zernioSetupHref} title={t('Connect {label} through Zernio', { label: u.label })}>{t('Set up')}</GButton>
                </span>
              </GCard>
            );
          })}
        </div>
      </section>

      {/* Audience (F3 to F7): one range drives every figure in this section. */}
      <section className="soc-g-sec" aria-labelledby="soc-g-audience">
        <GSectionHeader
          id="soc-g-audience"
          size={22}
          title="Audience"
          action={<GSegmented label={t('Range')} options={RANGE_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))} value={rangeParam(range)} onChange={setRange} />}
        />
        <div className="soc-g-heroes">
          <GHeroCard
            variant="a"
            caption={t('Total audience')}
            value={formatFull(total)}
            label={t('Total audience {n}', { n: formatFull(total) })}
            title={hasEmail ? t("Every platform's latest follower count plus the email list. Open the history by channel.") : t("Every platform's latest follower count. Open the history by channel.")}
            status={growth?.pct != null ? `${fmtPct(growth.pct)} ${rangePhrase(range)}` : t('No history {range}', { range: rangePhrase(range) })}
            strip={strip.values.length > 1 ? <GTickStrip onHero values={strip.values} titles={strip.titles} label={t('Total audience by day, {range}', { range: rangePhrase(range) })} /> : undefined}
            onClick={() => setSheet('audience')}
            className="soc-g-hero-a"
          />
          <GHeroCard
            variant="b"
            caption={t('Instagram DMs')}
            value={unreplied}
            label={t('{n} Instagram conversations need a reply', { n: unreplied })}
            title={t('Conversations whose last message is inbound. Open the inbox to reply.')}
            status={dmThreads.length === 0 ? t('No conversations yet') : unreplied === 0 ? t('Inbox clear') : t('to reply · {n} conversations', { n: dmThreads.length })}
            strip={dmThreads.length > 0 ? (
              <GShareBar
                onHero
                label={t('Conversations by reply state')}
                segments={[
                  { id: 'reply', label: t('To reply'), value: unreplied, title: t('{n} to reply', { n: unreplied }) },
                  { id: 'done', label: t('Replied'), value: dmThreads.length - unreplied, title: t('{n} replied', { n: dmThreads.length - unreplied }) },
                ]}
              />
            ) : undefined}
            onClick={() => setSheet('inbox')}
          />
          <GCard p={24} className="soc-g-dms" onClick={() => setSheet('dms')} title={t('DMs across every platform (seeded until a DM source is wired). Open the history.')} aria-label={t('Total DMs {n}. Open the history.', { n: formatFull(totalDms) })}>
            <GStat
              value={formatFull(totalDms)}
              label={t('Total DMs')}
              source={t('DMs across every platform (seeded until a DM source is wired)')}
              extra={dm ? <GDelta cur={dm.current} prev={dm.baseline} window={rangePhrase(range)} /> : <span className="soc-g-cap">{t('no history {range}', { range: rangePhrase(range) })}</span>}
            />
          </GCard>
        </div>

        <div className="soc-g-charts">
          <SocialChartsG audience={audience} channels={channelPoints} postDays={postDays} range={range} today={today} />
          <GCard p={24} className="soc-g-share" aria-labelledby="soc-g-share">
            <GSectionHeader id="soc-g-share" size={22} title={t('Share')} caption={t('Of the total audience')} />
            <GDonut
              slices={slices}
              size={168}
              formatValue={formatFull}
              centre={largest && total > 0 ? (
                <>
                  <span className="g-donut-big">{share(largest.value)}</span>
                  <span className="g-donut-cap">{largest.label}</span>
                </>
              ) : undefined}
              label={t('Share of the total audience by channel')}
            />
          </GCard>
        </div>
      </section>

      {/* Recent posts (F8): one list, sample rows only in Filming with a Sample badge; the content crew (F12) rides the right column. */}
      <div className="soc-g-split">
      <section className="soc-g-sec" aria-labelledby="soc-g-recent">
        <GSectionHeader
          id="soc-g-recent"
          size={22}
          title={t('Recent posts')}
          caption={recent.kind === 'live' ? t('{n} from Zernio', { n: recent.posts.length }) : recent.kind === 'sample' ? t('{avg} average likes per view', { avg: recent.avg }) : undefined}
          action={recent.kind === 'sample' ? <GSampleBadge fixture={t('Filming mode sample posts, not Zernio history')} /> : undefined}
        />
        <GCard p={16} className="soc-g-recent">
          {recent.kind === 'empty' ? (
            recent.setupHref ? (
              <GEmpty kind="unconfigured" title={t('No published posts from Zernio yet')} body={t('Connect Zernio to list what went out.')} setupHref={recent.setupHref} setupHint={recent.hint} />
            ) : (
              <GEmpty title={t('No published posts from Zernio yet')} body={t('Posts the Social agent publishes show here.')} />
            )
          ) : (
            <GList divided label={t('Recent posts')}>
              {recent.kind === 'live'
                ? recent.posts.map((p) => (
                    <GRow
                      key={p.key}
                      title={<span className="soc-g-caption">{p.caption}</span>}
                      meta={`${p.platform}${p.ago ? ` · ${t('{ago} ago', { ago: p.ago })}` : ''}`}
                      trailing={
                        <span className="soc-g-row-trail">
                          <GTag tone={p.status === 'success' ? 'ok' : 'warn'} dot>{p.status === 'success' ? t('success') : p.status}</GTag>
                          {p.url && <GButton size="sm" href={p.url} external title={t('Open the post')}>{t('Open')}</GButton>}
                        </span>
                      }
                    />
                  ))
                : recent.posts.map((p) => (
                    <GRow
                      key={p.caption}
                      title={<span className="soc-g-caption">{p.caption}</span>}
                      meta={`${p.tag} · ${t('{ago} ago', { ago: p.ago })}`}
                      hint={t('{views} {kind} · {likes} likes · like-to-view {ratio}', { views: formatFull(p.views), kind: t(p.kind), likes: formatFull(p.likes), ratio: p.ratio })}
                      trailing={
                        <span className="soc-g-row-trail soc-g-cap" title={t('{views} {kind} · {likes} likes · like-to-view {ratio}', { views: formatFull(p.views), kind: t(p.kind), likes: formatFull(p.likes), ratio: p.ratio })}>
                          {formatFull(p.views)} {t(p.kind)} · {p.ratio}
                        </span>
                      }
                    />
                  ))}
            </GList>
          )}
        </GCard>
      </section>
      <ContentCrewG crew={crew} />
      </div>

      {/* Publish (F9) */}
      <section className="soc-g-sec" aria-labelledby="soc-g-publish">
        <GSectionHeader
          id="soc-g-publish"
          size={22}
          title={t('Publish')}
          caption={t('{n} queued', { n: queuedCount })}
          action={<GButton size="sm" href="/agents" title={t('The Social agent publishes the queue on its next run')}>{t('Social agent')}</GButton>}
        />
        <PostComposerG initialPosts={posts} unconnected={unconnected.map((u) => u.platform)} />
      </section>

      <SeriesSheetG open={sheet === 'audience' || sheet === 'dms'} metric={sheet === 'dms' ? 'dms' : 'audience'} range={range} today={today} onClose={() => setSheet(null)} />
      <DmInboxSheetG open={sheet === 'inbox'} threads={dmThreads} nowMs={nowMs} onClose={() => setSheet(null)} />
    </GPage>
  );
}
