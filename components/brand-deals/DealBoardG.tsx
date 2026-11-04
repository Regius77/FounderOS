'use client';

/**
 * Brand Deals under the GladOS style (glados-ui SPEC S02 §4.3, §5.3, §5.6;
 * X5 two-tree pattern). Same data, poll, filters and drawer actions as the
 * Classic DealBoard; every widget is a G kit part. Layout kept: Pipeline +
 * Deal volume, then Send activity · Chains · Unique, then the deal list.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ExternalLink, MessagesSquare, RefreshCw, Send, X } from 'lucide-react';
import {
  GAsk, GBarChart, GButton, GCard, GDotCloud, GDotMatrix, GDotNumber, GDrawer, GDriverBars, GEmpty, GErrorLine, GHeroCard, GInput, GPage,
  GList, GRow, GSectionHeader, GSegmented, GTag, GTextarea, GTimelineStrip, GWell, type GTagTone, type StageColumn, type TimelineEvent,
} from '@/components/g';
import { formatUsdCompact } from '@/lib/format-number';
import { CHAIN_DEPTH_BUCKETS, chainDepthBucket, sendRangeFor, sendSpanMs, SEND_RANGES, stageBars, type ChainDepthBucket, type DealFilter, type SendRange } from '@/lib/brand-deals-view';
import type { BrandDealsSnapshot, Deal, DealOutcome } from '@/lib/brand-deals';
import { parseDealQuery, useDealBoard } from './use-deal-board';
import { localeTag, t } from '@/lib/i18n';

const usd = (n: number) => `$${Math.round(n).toLocaleString(localeTag())}`;
const frac = (a: number, b: number) => (b > 0 ? Math.max(0, Math.min(1, a / b)) : 0);
const dealsN = (n: number) => (n === 1 ? t('{n} deal', { n }) : t('{n} deals', { n }));
const msgsN = (n: number) => (n === 1 ? t('{n} msg', { n }) : t('{n} msgs', { n }));
const messagesN = (n: number) => (n === 1 ? t('{n} message', { n }) : t('{n} messages', { n }));

function age(iso: string | null, now: number): string {
  if (!iso || !now) return '';
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return '';
  const mins = Math.max(0, Math.round((now - ts) / 60_000));
  if (mins < 60) return t('{n} min', { n: mins });
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return t('{n} h', { n: hrs });
  return t('{n} d', { n: Math.round(hrs / 24) });
}

/** The chart column a stage filter lights (S02 §5.3 Selection); `unique` lights none. */
function columnFor(f: DealFilter): string | null {
  if (f === 'won' || f === 'lost' || f === 'closed') return 'closed';
  if (f === 'unique') return null;
  return f;
}

function stageTag(d: Deal): { text: string; tone: GTagTone } {
  if (d.outcome === 'won') return { text: t('Won'), tone: 'ok' };
  if (d.outcome === 'lost') return { text: t('Lost'), tone: 'err' };
  if (d.outcome === 'skipped' || d.stage === 'skipped') return { text: t('Skipped'), tone: 'neutral' };
  if (d.stage === 'approval') return { text: t('Approve'), tone: 'warn' };
  if (d.stage === 'sent') return { text: t('Sent'), tone: 'accent' };
  return { text: t('Closed'), tone: 'neutral' };
}

export function DealBoardG({ initial, botUrl = null }: { initial: BrandDealsSnapshot; botUrl?: string | null }) {
  const b = useDealBoard(initial);
  const { snap, poll, now, stageFilter, setStageFilter, depth, setDepth, filtered, selected } = b;
  const { counts, volume } = snap;
  const listRef = useRef<HTMLDivElement>(null);
  const toList = () => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  /* Pipeline: the revenue chart (FR-B2): bars in dollars, count secondary. */
  const columns: StageColumn[] = useMemo(() => {
    const open = volume.openUsd;
    return stageBars(snap).map((c) => {
      if (c.key === 'closed') {
        const [won, lost] = c.segments ?? [];
        return {
          id: c.key,
          label: c.label,
          value: c.usd,
          count: c.count,
          won: won?.usd ?? 0,
          lost: lost?.usd ?? 0,
          sub: dealsN(c.count),
          tip: { lines: [t('{n} won · {usd}', { n: won?.count ?? 0, usd: usd(won?.usd ?? 0) }), t('{n} lost · {usd}', { n: lost?.count ?? 0, usd: usd(lost?.usd ?? 0) })], hint: t('Click a segment to show won or lost') },
        };
      }
      const share = c.key !== 'all' && open > 0 ? t('{pct}% of open value', { pct: Math.round((c.usd / open) * 100) }) : t('every tracked deal thread');
      return { id: c.key, label: c.label, value: c.usd, count: c.count, tip: { lines: [t('{usd} across {deals}', { usd: usd(c.usd), deals: dealsN(c.count) }), share] } };
    });
  }, [snap, volume.openUsd]);
  const allZero = columns.every((c) => !(c.value > 0));
  const segment = stageFilter === 'won' || stageFilter === 'lost' ? stageFilter : null;

  /* Send activity (FR-B4): one dot per event in the chosen range. */
  const [range, setRange] = useState<SendRange | null>(null);
  const effRange = range ?? (now ? sendRangeFor(snap.events, now) : '30d');
  const r = SEND_RANGES[effRange];
  const span = sendSpanMs(effRange, snap.events, now || Date.parse(snap.lastActivityAt ?? '') || 0);
  const events: TimelineEvent[] = useMemo(
    () =>
      snap.events.map((e, i) => {
        const d = snap.deals.find((x) => x.id === e.dealId);
        const when = new Date(e.at);
        return {
          id: `${e.dealId}:${e.kind}:${i}`,
          at: e.at,
          status: e.kind,
          lane: e.kind === 'sent' ? 1 : e.kind === 'announced' ? 0 : 2,
          title: e.brand,
          detail: `${e.kind === 'sent' ? t('Sent') : e.kind === 'announced' ? t('Announced') : t('Skipped')} · ${when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
          meta: d && d.chainLen > 0 ? t('{msgs} in thread', { msgs: msgsN(d.chainLen) }) : undefined,
        };
      }),
    [snap.events, snap.deals],
  );
  const sendsInRange = now ? snap.events.filter((e) => e.kind === 'sent' && now - Date.parse(e.at) <= span).length : 0;
  const order = Object.keys(SEND_RANGES) as SendRange[];
  const step = (dir: 'wider' | 'narrower') => {
    const i = order.indexOf(effRange);
    const j = dir === 'wider' ? Math.min(order.length - 1, i + 1) : Math.max(0, i - 1);
    setRange(order[j]);
  };
  const agoLabel = r.spanMs ? r.ago : t('{n} d ago', { n: Math.round(span / 86_400_000) });

  /* Chains (FR-B5): depth columns filter the list. */
  const depthCols = useMemo(() => {
    const n = new Map<ChainDepthBucket, number>(CHAIN_DEPTH_BUCKETS.map((k) => [k, 0]));
    for (const d of snap.deals) {
      const k = chainDepthBucket(d.chainLen);
      if (k) n.set(k, (n.get(k) ?? 0) + 1);
    }
    return CHAIN_DEPTH_BUCKETS.map((k) => ({ id: k, label: k, value: n.get(k) ?? 0, title: `${k === '1' ? t('{k} message', { k }) : t('{k} messages', { k })} · ${dealsN(n.get(k) ?? 0)}` }));
  }, [snap.deals]);
  const totalMsgs = snap.deals.reduce((n, d) => n + d.chainLen, 0);
  const deepest = Math.max(0, ...snap.deals.map((d) => d.chainLen));

  const uniqueDeals = snap.deals.filter((d) => d.tag === 'UNIQUE');
  const reasons = Array.from(new Set(uniqueDeals.map((d) => d.tagReason).filter(Boolean))).slice(0, 2);
  const { token } = parseDealQuery(b.query);

  const head = (
    <GSectionHeader
      size="page"
      title={t('Deal journeys')}
      caption={t('Every brand thread bdpilot is working, from first email to outcome.')}
      action={
        <div className="bd-g-head-actions">
          <span role="status" data-poll-status={poll.tone} title={poll.title}>
            <GTag tone={poll.tone === 'warn' ? 'warn' : 'neutral'} dot={poll.tone === 'warn'}>{poll.text}</GTag>
          </span>
          {botUrl && (
            <GButton href={botUrl} external data-bot-link="" title={t('Approve drafts in the Telegram bot')}>
              {t('Approve in Telegram')} <ExternalLink size={13} strokeWidth={1.75} aria-hidden />
            </GButton>
          )}
          <GButton variant="icon" aria-label={t('Refresh')} title={t('Refresh now')} onClick={b.refresh}>
            <RefreshCw size={15} strokeWidth={1.75} aria-hidden />
          </GButton>
        </div>
      }
    />
  );

  // bdpilot not reporting on this host (H7): route to setup instead of a board of zeros.
  if (!snap.sources.state) {
    return (
      <GPage className="bd-g">
        <div data-bd-empty="unconfigured">
          {head}
          <GCard p={24} className="bd-g-gap">
            <GEmpty kind="unconfigured" title={t('bdpilot is not reporting')} body={t('No brand-deal daemon state was found on this host, so there are no deals, quotes or sends to show yet.')} setupHref="/setup" setupHint={t('bdpilot state file not found (BDPILOT_STATE)')} />
          </GCard>
        </div>
      </GPage>
    );
  }

  return (
    <GPage className="bd-g">
      {head}

      <div className="bd-g-row1">
        <GCard p={24} className="bd-g-pipeline" aria-labelledby="bd-g-pipeline">
          <GSectionHeader
            id="bd-g-pipeline"
            size={22}
            title="Pipeline"
            caption={t('Bar height is quoted value; the count is under each figure.')}
            action={
              <GButton variant="icon" size="sm" aria-label={t('Show the deal list')} title={t('Show the deal list')} onClick={toList}>
                <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden />
              </GButton>
            }
          />
          <div className="bd-g-chart">
            <GBarChart
              variant="stages"
              measure="usd"
              flow
              columns={columns}
              selected={columnFor(stageFilter)}
              onSelect={(id) => setStageFilter(id as DealFilter)}
              onSegmentSelect={(_, seg) => setStageFilter(seg)}
              selectedSegment={segment}
              countNoun={[t('deal'), t('deals')]}
              tipHint={t('Click to show these deals')}
              label={t('Pipeline by stage, bar height in quoted dollars')}
            />
            {allZero && <p className="bd-g-note">{t("No quotes yet. Set one from a deal's drawer.")}</p>}
          </div>
          <GAsk mode="filter" value={b.query} onValueChange={b.setQuery} label={t('Filter deals')} placeholder={t('Filter deals, or type /unique /approval /won /lost')} className="bd-g-ask" />
          {token && (
            <p className="bd-g-token">
              {parseDealQuery(b.query).tokenFilter ? <>{t('Filtering by')} <GTag size="xs" tone="accent">{token}</GTag></> : <>{t('Unknown filter')} <GTag size="xs" tone="warn">{token}</GTag> · {t('try /unique /approval /won /lost')}</>}
            </p>
          )}
        </GCard>

        <GHeroCard
          variant="a"
          className="bd-g-volume"
          caption={t('Open deal value')}
          value={formatUsdCompact(volume.openUsd)}
          label={t('Open deal value {usd}', { usd: usd(volume.openUsd) })}
          title={t('Open = needs approval + awaiting brand. {q} of {n} threads carry a quote.', { q: volume.quotedDeals, n: snap.deals.length })}
          status={t('{q} of {n} threads quoted', { q: volume.quotedDeals, n: snap.deals.length })}
          strip={
            <GDriverBars
              labelWidth={116}
              label={t('Open value by stage')}
              max={1}
              rows={[
                { id: 'approval', label: t('Needs approval ({n})', { n: counts.approval }), value: frac(volume.approvalUsd, volume.openUsd), display: formatUsdCompact(volume.approvalUsd), title: t('Needs approval: {usd} across {deals}, share of open value. Click to show them.', { usd: usd(volume.approvalUsd), deals: dealsN(counts.approval) }), onClick: () => { setStageFilter('approval'); toList(); }, selected: stageFilter === 'approval' },
                { id: 'sent', label: t('Awaiting brand ({n})', { n: counts.sent }), value: frac(volume.awaitingUsd, volume.openUsd), display: formatUsdCompact(volume.awaitingUsd), title: t('Awaiting brand: {usd} across {deals}, share of open value. Click to show them.', { usd: usd(volume.awaitingUsd), deals: dealsN(counts.sent) }), onClick: () => { setStageFilter('sent'); toList(); }, selected: stageFilter === 'sent' },
                { id: 'closed', label: t('Won vs lost ({won}/{lost})', { won: counts.won, lost: counts.lost }), value: frac(volume.wonUsd, volume.wonUsd + volume.lostUsd), display: `${formatUsdCompact(volume.wonUsd)} / ${formatUsdCompact(volume.lostUsd)}`, title: t('Won {won}, lost {lost}; the bar is the won share of closed value. Click to show closed deals.', { won: usd(volume.wonUsd), lost: usd(volume.lostUsd) }), onClick: () => { setStageFilter('closed'); toList(); }, selected: stageFilter === 'closed' },
              ]}
            />
          }
        />
      </div>

      <div className="bd-g-row2">
        <GCard p={24} aria-labelledby="bd-g-sends">
          <GSectionHeader id="bd-g-sends" size={22} title={t('Send activity')} />
          <div className="bd-g-stat">
            <GDotNumber value={String(sendsInRange)} size={4} label={t('{n} sends in range', { n: sendsInRange })} />
            <span className="bd-g-stat-cap">{sendsInRange === 1 ? t('send') : t('sends')} · {r.long}</span>
          </div>
          <GTimelineStrip
            readOnly
            events={events}
            spanMs={span}
            now={now || undefined}
            agoLabel={agoLabel}
            emptyText={t('No sends yet')}
            onDot={(id) => b.setSelectedId(id.split(':')[0])}
            onCluster={() => (effRange === '24h' ? toList() : step('narrower'))}
            onRangeStep={step}
            rangeControl={
              <GSegmented<SendRange>
                label={t('Range')}
                value={effRange}
                onChange={setRange}
                options={order.map((k) => ({ value: k, label: SEND_RANGES[k].label, title: SEND_RANGES[k].long }))}
              />
            }
            label={t('Brand deal sends, announcements and skips over time')}
          />
        </GCard>

        <GCard p={24} aria-labelledby="bd-g-chains">
          <GSectionHeader id="bd-g-chains" size={22} title={t('Chains')} />
          <div className="bd-g-stat">
            <GDotNumber value={String(totalMsgs)} size={4} label={t('{n} messages', { n: totalMsgs })} />
            <span className="bd-g-stat-cap">{t('messages · deepest {n}', { n: deepest })}</span>
          </div>
          <GDotMatrix
            columns={depthCols}
            color="series-2"
            selected={depth}
            onSelect={(id) => setDepth(depth === id ? null : (id as ChainDepthBucket))}
            label={t('Deals by chain depth; pick a column to filter the list')}
            className="bd-g-depth"
          />
          <p className="bd-g-cap">{t('Messages per thread. Pick a column to filter the list.')}</p>
        </GCard>

        <GHeroCard
          variant="b"
          className="bd-g-unique"
          caption={t('Outside the reel playbook')}
          value={String(counts.unique)}
          label={t('{n} unique deals', { n: counts.unique })}
          status={`${t('{n} of {deals}', { n: counts.unique, deals: dealsN(snap.deals.length) })}${reasons.length ? ` · ${reasons.join(' · ')}` : ''}`}
          title={t('Deals tagged unique by bdpilot. Click to show them.')}
          strip={<GDotCloud total={snap.deals.length} lit={counts.unique} onHero label={t('{n} of {total} deals are unique', { n: counts.unique, total: snap.deals.length })} />}
          onClick={() => { setStageFilter('unique'); toList(); }}
        />
      </div>

      <div ref={listRef} className="bd-g-listwrap">
        <GCard p={24} aria-labelledby="bd-g-deals">
          <div className="bd-g-listhead">
            <GSectionHeader id="bd-g-deals" size={22} title={t('Deals')} caption={t('{n} of {total}', { n: filtered.length, total: snap.deals.length })} />
            <div className="bd-g-filters">
              {depth && (
                <GButton size="sm" onClick={() => setDepth(null)} aria-label={t('Remove chain depth filter {depth}', { depth })} title={t('Remove the chain depth filter')}>
                  {t('Depth {depth}', { depth })} <X size={12} strokeWidth={1.75} aria-hidden />
                </GButton>
              )}
              <GSegmented<DealFilter>
                label={t('Stage')}
                size="md"
                value={stageFilter === 'closed' ? 'closed' : stageFilter}
                onChange={setStageFilter}
                options={[
                  { value: 'all', label: t('All {n}', { n: snap.deals.length }) },
                  { value: 'approval', label: t('Needs approval {n}', { n: counts.approval }) },
                  { value: 'sent', label: t('Awaiting {n}', { n: counts.sent }) },
                  { value: 'unique', label: t('Unique {n}', { n: counts.unique }) },
                  ...(stageFilter === 'closed' ? [{ value: 'closed' as const, label: t('Closed {n}', { n: counts.won + counts.lost }) }] : []),
                  { value: 'won', label: t('Won {n}', { n: counts.won }) },
                  { value: 'lost', label: t('Lost {n}', { n: counts.lost }) },
                ]}
              />
            </div>
          </div>
          {filtered.length === 0 ? (
            <GEmpty inline title={t('Nothing matches that filter.')} />
          ) : (
            <GList label={t('Deals')} className="bd-g-list">
              {filtered.map((d) => {
                const st = stageTag(d);
                return (
                  <GRow
                    key={d.id}
                    className="bd-g-row"
                    selected={b.selectedId === d.id}
                    onClick={() => b.setSelectedId(d.id)}
                    hint={t('Open {brand}', { brand: d.brand })}
                    title={d.brand}
                    meta={d.email}
                    trailing={
                      <span className="bd-g-trail">
                        <span className="bd-g-subject">{d.subject || d.tagReason || '—'}</span>
                        <span className="bd-g-tags">
                          {d.quotedUsd != null && <GTag tone="accent" title={d.quoteSource === 'manual' ? t('Quote set manually') : t('Quote parsed from the thread')}>{usd(d.quotedUsd)}</GTag>}
                          {d.tag === 'UNIQUE' && <GTag tone="outline">{t('Unique')}</GTag>}
                          <GTag tone={st.tone}>{st.text}</GTag>
                        </span>
                        <span className="bd-g-meta" title={t('{messages} cached', { messages: messagesN(d.chainLen) })}>
                          {d.chainLen > 0 && (<><MessagesSquare size={12} strokeWidth={1.6} aria-hidden /> {d.chainLen}</>)}
                        </span>
                        <span className="bd-g-meta bd-g-age" title={d.lastEventAt ?? undefined}>{age(d.lastEventAt, now)}</span>
                      </span>
                    }
                  />
                );
              })}
            </GList>
          )}
        </GCard>
      </div>

      <DealDrawerG b={b} deal={selected} />
    </GPage>
  );
}

/* ── the deal drawer (FR-B8): behaviour unchanged, kit controls ─────────── */

function DealDrawerG({ b, deal }: { b: ReturnType<typeof useDealBoard>; deal: Deal | null }) {
  const [armed, setArmed] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [quote, setQuote] = useState('');
  const id = deal?.id ?? null;
  useEffect(() => {
    setArmed(false);
    setDraft(null);
    b.setNotice(null);
    setQuote(deal?.quotedUsd != null ? String(deal.quotedUsd) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  if (!deal) return null;
  const busy = b.busy;
  const st = stageTag(deal);
  return (
    <GDrawer open onClose={() => b.setSelectedId(null)} title={deal.brand} width={480} className="bd-g-drawer">
      <div className="bd-g-dhead">
        <span className="bd-g-email">{deal.email}</span>
        <span className="bd-g-tags">
          <GTag tone={st.tone}>{deal.stage === 'approval' && deal.outcome === 'open' ? t('Needs approval') : st.text}</GTag>
          {deal.tag === 'UNIQUE' && <GTag tone="outline">{t('Unique')}</GTag>}
          {deal.chainLen > 0 && <GTag>{msgsN(deal.chainLen)}</GTag>}
        </span>
        {deal.tagReason && <p className="bd-g-cap">{deal.tagReason}</p>}
      </div>
      {b.notice && <GErrorLine align="left">{b.notice}</GErrorLine>}

      {deal.stage === 'approval' && (
        <section className="bd-g-sec">
          <h3 className="bd-g-sec-title">{t('Draft actions')}</h3>
          <div className="bd-g-actions">
            {!armed ? (
              <GButton variant="ink" onClick={() => setArmed(true)} disabled={busy != null}>
                <Send size={13} strokeWidth={1.75} aria-hidden /> {t('Send as the verified sender')}
              </GButton>
            ) : (
              <>
                <GButton variant="ink" busy={busy === 'send'} disabled={busy != null && busy !== 'send'} onClick={async () => { if (await b.act('send', '/api/brand-deals/send', { dealId: deal.id })) setArmed(false); }}>
                  {t('Confirm send')}
                </GButton>
                <GButton onClick={() => setArmed(false)} disabled={busy != null}>{t('Cancel')}</GButton>
              </>
            )}
            <GButton busy={busy === 'skip'} disabled={busy != null && busy !== 'skip'} onClick={() => b.act('skip', '/api/brand-deals/override', { dealId: deal.id, outcome: 'skipped' })}>{t('Skip')}</GButton>
            {draft === null && (
              <GButton busy={busy === 'draft-load'} disabled={busy != null && busy !== 'draft-load'} onClick={async () => { const body = await b.loadDraft(deal.id); if (body !== null) setDraft(body); }}>
                {t('Edit draft')}
              </GButton>
            )}
          </div>
          {draft !== null && (
            <div className="bd-g-draft">
              <GTextarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={8} maxLines={16} aria-label={t('Draft email body')} />
              <div className="bd-g-actions">
                <GButton variant="ink" busy={busy === 'draft-save'} disabled={(busy != null && busy !== 'draft-save') || !draft.trim()} disabledReason={t('The draft is empty')} onClick={async () => { if (await b.act('draft-save', '/api/brand-deals/draft', { dealId: deal.id, text: draft })) setDraft(null); }}>
                  {t('Save draft')}
                </GButton>
                <GButton onClick={() => setDraft(null)} disabled={busy != null}>{t('Cancel')}</GButton>
              </div>
              <p className="bd-g-cap">{t('Recipient, subject, and thread are locked in code, so an edit can never redirect the email.')}</p>
            </div>
          )}
        </section>
      )}

      <section className="bd-g-sec">
        <h3 className="bd-g-sec-title">{t('Outcome')}</h3>
        <div className="bd-g-actions">
          {([['open', t('Reopen')], ['won', t('Mark won')], ['lost', t('Mark lost')]] as Array<[DealOutcome, string]>).map(([o, label]) => (
            <GButton
              key={o}
              variant={deal.outcome === o ? 'ink' : 'default'}
              aria-pressed={deal.outcome === o}
              busy={busy === `outcome-${o}`}
              disabled={(busy != null && busy !== `outcome-${o}`) || deal.outcome === o}
              disabledReason={deal.outcome === o ? t('Already the outcome') : undefined}
              onClick={() => b.act(`outcome-${o}`, '/api/brand-deals/override', { dealId: deal.id, outcome: o })}
            >
              {label}
            </GButton>
          ))}
        </div>
        <div className="bd-g-quote">
          <GInput value={quote} onChange={(e) => setQuote(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="USD" aria-label={t('Quote in USD')} className="bd-g-quote-input" />
          <GButton busy={busy === 'quote'} disabled={busy != null && busy !== 'quote'} onClick={() => b.act('quote', '/api/brand-deals/override', { dealId: deal.id, amountUsd: quote ? Number(quote) : null })}>{t('Set quote')}</GButton>
          <span className="bd-g-cap">{deal.quotedUsd != null ? (deal.quoteSource === 'manual' ? t('Set manually') : t('Parsed from the thread')) : t('No quote detected')}</span>
        </div>
        <p className="bd-g-cap">{t('Outcome and quote are tracked here only. They never email anyone.')}</p>
      </section>

      {deal.summary && (
        <section className="bd-g-sec">
          <h3 className="bd-g-sec-title">{t('Summary')}</h3>
          <p className="bd-g-body">{deal.summary}</p>
        </section>
      )}

      <section className="bd-g-sec">
        <h3 className="bd-g-sec-title">{t('Email chain')} {deal.chain.length > 0 && <span className="bd-g-cap">{deal.chain.length}</span>}</h3>
        {deal.chain.length === 0 && <p className="bd-g-cap">{t('No cached chain for this deal (sent before chain caching existed).')}</p>}
        <div className="bd-g-chain">
          {deal.chain.map((m, i) => (
            <GWell key={i}>
              <details open={i >= deal.chain.length - 2}>
                <summary className="bd-g-msg-head">
                  <span className="bd-g-msg-who">{m.who}</span>
                  <span className="bd-g-cap">{m.date}</span>
                </summary>
                <p className="bd-g-body">{m.body}</p>
              </details>
            </GWell>
          ))}
        </div>
      </section>
    </GDrawer>
  );
}
