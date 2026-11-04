'use client';

/**
 * /funnel under the GladOS style (glados-ui SPEC S02 §4.2, §5.5; X5). The old
 * layout, new widgets: Touches · New leads + Converted · Revenue on top, the
 * Pipeline (GFunnelStep) and the Insights hero below, the sources strip
 * under them. Same props, URL state and views as the Classic FunnelDashboard.
 * Cut (FR-F3, FR-F7): the five kebabs (their one unique action is each card's
 * ↗ button), the insight dashes and glass shapes, the y axis and caps.
 */

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Calendar, Check, ChevronDown, ExternalLink, Link2, RefreshCw } from 'lucide-react';
import {
  GAsk, GBigNumber, GButton, GCard, GDelta, GDisplay, GDotMatrix, GDotNumber, GDrawer, GDriverBars, GEmpty, GFunnelStep, GHeroCard, GKeyValue,
  GLineChart, GMenu, GPage, GSampleBadge, GSectionHeader, GSegmented, GTable, GTag, type GColumn, type GTagTone,
} from '@/components/g';
import { CHANNEL_GLYPHS, DECAY_DAYS, FUNNEL_STAGES, decayFactor, funnelSummary, journeyMeta } from '@/lib/funnel';
import type { FunnelJourney, FunnelStage } from '@/lib/schemas';
import type { DashboardProps } from './FunnelDashboard';
import { FunnelChannelsG } from './FunnelChannelsG';
import { FunnelLinksG } from './FunnelLinksG';
import { LANES, type Compare, type Grain, type Lane, type Period, type View } from './state';
import {
  DAY, LANE_LABEL, PAGE_ROWS, PERIODS, WEEKDAYS, WEEKDAY_INITIALS, defaultStage as leakStage, fmtDate, fmtDay, laneOf, periodStats, stageIndex, stageLabel,
  touchSeries as buildTouchSeries, worstStep as findWorstStep,
} from './model';
import { localeTag, t } from '@/lib/i18n';

const usd = (n: number) => `$${Math.round(n).toLocaleString(localeTag())}`;
const num = (n: number) => n.toLocaleString(localeTag());
const LANE_COLOR = { organic: 'series-1', ads: 'series-2', crm: 'series-3' } as const;

type Command = { token: string; hint: string; run: () => void };

export function FunnelDashboardG({ journeys, archived, nowIso, source, connectors, pushNow, saveNow, initial, sampleOffer = false, channels, trakyo }: DashboardProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const summary = useMemo(() => funnelSummary(journeys), [journeys]);
  const defaultStage = useMemo(() => leakStage(summary), [summary]);

  const [view, setView] = useState<View>(initial.view ?? 'overview');
  const [period, setPeriod] = useState<Period>(initial.period ?? 90);
  const [grain, setGrain] = useState<Grain>(initial.grain ?? 'monthly');
  const [compare, setCompare] = useState<Compare>(initial.compare ?? 'previous');
  const [stage, setStage] = useState<FunnelStage>(initial.stage ?? defaultStage);
  const [segment, setSegment] = useState<FunnelStage | undefined>(initial.stage);
  const [lane, setLane] = useState<Lane | undefined>(initial.lane);
  const [selected, setSelected] = useState<string | undefined>(initial.lead);
  const [copied, setCopied] = useState(false);
  const [explore, setExplore] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE_ROWS);

  // The URL mirrors the view, so a copied link reproduces it (AC02.12).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const put = (k: string, v: string | number | undefined, def?: string | number) => {
      if (v === undefined || v === def) p.delete(k);
      else p.set(k, String(v));
    };
    put('view', view, 'overview');
    put('stage', stage, defaultStage);
    put('period', period, 90);
    put('grain', grain, 'monthly');
    put('compare', compare, 'previous');
    put('lane', lane);
    put('lead', selected);
    const qs = p.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, '', next);
  }, [view, stage, defaultStage, period, grain, compare, lane, selected]);

  useEffect(() => setShown(PAGE_ROWS), [view, segment, lane]);

  const stats = useMemo(() => periodStats(journeys, now, period, compare), [journeys, now, period, compare]);
  const touches = useMemo(() => buildTouchSeries([...journeys, ...archived], now, grain), [journeys, archived, now, grain]);
  const conversion = summary.clients > 0 ? Math.round((summary.converted / summary.clients) * 100) : 0;
  const leak = useMemo(() => findWorstStep(summary), [summary]);
  const openValue = journeys.filter((j) => j.status === stage).reduce((s, j) => s + (j.amountUsd ?? 0), 0);

  const byId = useMemo(() => new Map([...journeys, ...archived].map((j) => [j.id, j])), [journeys, archived]);
  const archivedIds = useMemo(() => new Set(archived.map((j) => j.id)), [archived]);
  const pushList = pushNow.map((id) => byId.get(id)).filter(Boolean) as FunnelJourney[];
  const saveList = saveNow.map((id) => byId.get(id)).filter(Boolean) as FunnelJourney[];
  const selectedLead = selected ? byId.get(selected) : undefined;
  const tableJourneys = journeys.filter((j) => (!segment || j.status === segment) && (!lane || laneOf(j) === lane));
  const stageCounts = new Map<FunnelStage, number>();
  for (const j of journeys) stageCounts.set(j.status, (stageCounts.get(j.status) ?? 0) + 1);
  const laneCounts: Record<Lane, number> = { organic: 0, ads: 0, crm: 0 };
  for (const j of journeys) laneCounts[laneOf(j)]++;

  const goJourneys = (s?: FunnelStage, l?: Lane) => {
    setSegment(s);
    setLane(l);
    if (s) setStage(s);
    setView('journeys');
  };

  const commands: Command[] = [
    ...FUNNEL_STAGES.map((s) => ({ token: `/${s.id.replace('_', '-')}`, hint: t('{stage} segment', { stage: t(s.label) }), run: () => goJourneys(s.id, lane) })),
    ...LANES.map((l) => ({ token: `/${l}`, hint: t('{lane} entries', { lane: LANE_LABEL[l] }), run: () => goJourneys(segment, l) })),
    { token: '/push', hint: t('Hot and moving'), run: () => setView('push') },
    { token: '/save', hint: t('Fading toward the archive'), run: () => setView('save') },
    { token: '/archive', hint: t('Decayed past {n} d', { n: DECAY_DAYS }), run: () => setView('archive') },
    { token: '/overview', hint: t('Back to the board'), run: () => setView('overview') },
  ];
  const slash = explore.match(/\/([\w-]*)$/);
  const matching = slash ? commands.filter((c) => c.token.slice(1).startsWith(slash[1].toLowerCase())) : [];
  const runCommand = (c: Command) => { c.run(); setExplore(''); setNote(null); };
  const submitExplore = (line: string) => {
    const hit = commands.find((c) => line.toLowerCase().includes(c.token));
    if (hit) runCommand(hit);
    else setNote(t('No token in that line. Type / to see where this bar can jump.'));
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt(t('Copy this link'), window.location.href);
    }
  };

  const crm = connectors.find((c) => c.ok && (c.id === 'attio' || c.id === 'ghl'));
  const crmHref = crm ? (crm.id === 'ghl' ? 'https://app.gohighlevel.com' : 'https://app.attio.com') : undefined;
  const attioHref = connectors.find((c) => c.id === 'attio')?.href ?? '/integrations';
  const cmpLabel = stats.cmp ? `${fmtDay(stats.cmp[0], compare === 'year')} – ${fmtDay(stats.cmp[1] - DAY, compare === 'year')}` : null;
  const vsLabel = compare === 'year' ? t('vs last year') : t('vs previous period');
  const periodWindow = PERIODS.find((p) => p.id === period)?.label ?? t('Selected period');
  const compareOptions: { id: Compare; label: string }[] = [
    { id: 'previous', label: compare === 'previous' && cmpLabel ? cmpLabel : t('Previous period') },
    { id: 'year', label: compare === 'year' && cmpLabel ? cmpLabel : t('Same period last year') },
    { id: 'none', label: t('No comparison') },
  ];

  const NAV: { id: View; label: string; n?: number }[] = [
    { id: 'overview', label: t('Overview') },
    { id: 'push', label: t('Push now'), n: pushList.length },
    { id: 'save', label: t('Save now'), n: saveList.length },
    { id: 'journeys', label: t('Journeys'), n: journeys.length },
    { id: 'archive', label: t('Archive'), n: archived.length },
  ];

  const seeJourneys = (label: string, run: () => void) => (
    <GButton variant="icon" size="sm" aria-label={t('See these journeys: {label}', { label })} title={t('See these journeys')} onClick={run}>
      <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden />
    </GButton>
  );

  const countDelta = (cur: number, prev: number) => {
    const d = cur - prev;
    return (
      <GTag tone={d > 0 ? 'ok' : d < 0 ? 'err' : 'neutral'} title={compare === 'year' ? t('{n} in the last year', { n: num(prev) }) : t('{n} in the previous period', { n: num(prev) })}>
        {d >= 0 ? '+' : '−'}{num(Math.abs(d))} {vsLabel}
      </GTag>
    );
  };

  /* ── overview cards ── */
  const touchCard = (
    <GCard p={24} className="fn-g-touches" aria-labelledby="fn-g-touches">
      <GSectionHeader
        id="fn-g-touches"
        size={22}
        title={t('Touches')}
        caption={grain === 'monthly' ? t('Last 6 months') : t('Last 12 weeks')}
        action={seeJourneys(t('Touches'), () => goJourneys())}
      />
      <div className="fn-g-grain">
        <GSegmented<Grain> label={t('Touches chart grain')} value={grain} onChange={setGrain} options={[{ value: 'monthly', label: t('Monthly') }, { value: 'weekly', label: t('Weekly') }]} />
      </div>
      {touches.series.every((v) => v === 0) ? (
        <GEmpty inline title={grain === 'monthly' ? t('No touches in the last 6 months') : t('No touches in the last 12 weeks')} />
      ) : (
        <GLineChart
          variant="step"
          height={170}
          labels={touches.longLabels}
          axisLabels={touches.labels}
          series={[{ id: 'touches', label: t('Touches'), values: touches.series, color: 'accent' }]}
          peakLabel={(i, v) => t('{n} touches · {label}', { n: num(v), label: touches.labels[i] })}
          tip={(i) => {
            const total = touches.series.reduce((a, b) => a + b, 0);
            return { title: touches.longLabels[i], lines: [t('{n} touches', { n: num(touches.series[i]) }), grain === 'monthly' ? t('{pct}% of the 6 months', { pct: total > 0 ? Math.round((touches.series[i] / total) * 100) : 0 }) : t('{pct}% of the 12 weeks', { pct: total > 0 ? Math.round((touches.series[i] / total) * 100) : 0 })] };
          }}
          label={grain === 'monthly' ? t('Touches per month, active and archived journeys') : t('Touches per week, active and archived journeys')}
        />
      )}
    </GCard>
  );

  const dotCard = (kind: 'leads' | 'converted') => {
    const leads = kind === 'leads';
    const n = leads ? stats.leadsIn.length : stats.convIn.length;
    const cols = leads ? stats.leadCols : stats.convCols;
    const peak = leads ? stats.leadPeak : stats.convPeak;
    const noun = leads ? t('leads') : t('conversions');
    return (
      <GCard p={20} className="fn-g-sub" aria-labelledby={`fn-g-${kind}`}>
        <GSectionHeader
          id={`fn-g-${kind}`}
          size={22}
          title={leads ? t('New leads') : t('Converted')}
          caption={periodWindow}
          action={seeJourneys(leads ? t('New leads') : t('Converted'), () => goJourneys(leads ? 'first_touch' : 'converted'))}
        />
        <div className="fn-g-stat">
          <GDotNumber value={num(n)} size={5} label={`${n} ${noun}, ${periodWindow.toLowerCase()}`} />
          <div className="fn-g-dots">
            <GDotMatrix
              columns={cols.map((v, i) => ({ id: WEEKDAYS[i], label: WEEKDAY_INITIALS[i], value: v, title: t('{day} · {n} {noun}', { day: WEEKDAYS[i], n: num(v), noun }) }))}
              rows={6}
              color={leads ? 'accent' : 'accent-2'}
              label={leads ? t('New leads by weekday, {period}', { period: periodWindow.toLowerCase() }) : t('Conversions by weekday, {period}', { period: periodWindow.toLowerCase() })}
            />
          </div>
          <div className="fn-g-stat-side">
            {peak && <GTag>{t('Peak {day}', { day: peak })}</GTag>}
            {stats.cmp && countDelta(n, leads ? stats.leadsPrev.length : stats.convPrev.length)}
          </div>
        </div>
      </GCard>
    );
  };

  const laneMax = Math.max(1, ...Object.values(stats.byLane));
  const revenueCard = (
    <GCard p={24} className="fn-g-revenue" aria-labelledby="fn-g-revenue">
      <GSectionHeader id="fn-g-revenue" size={22} title={t('Revenue')} caption={periodWindow} action={seeJourneys(t('Revenue'), () => goJourneys('converted'))} />
      <div className="fn-g-rev-num">
        <GBigNumber value={usd(stats.revenue)} title={t('Revenue from deals converted in the {period}', { period: periodWindow.toLowerCase() })} />
        {stats.cmp && (stats.revenue > 0 || stats.revenuePrev > 0) && <GDelta cur={stats.revenue} prev={stats.revenuePrev} money window={vsLabel} />}
      </div>
      <GDriverBars
        labelWidth={88}
        max={laneMax}
        label={t('Revenue by entry lane')}
        rows={LANES.map((l) => ({
          id: l,
          label: LANE_LABEL[l],
          value: stats.byLane[l],
          display: usd(stats.byLane[l]),
          tone: LANE_COLOR[l],
          title: t('See the {lane} deals that closed: {usd}', { lane: LANE_LABEL[l].toLowerCase(), usd: usd(stats.byLane[l]) }),
          onClick: () => goJourneys('converted', l),
        }))}
      />
      <p className="fn-g-cap">{t('{n} closed in the period, split by how each deal entered.', { n: stats.convIn.length })}</p>
    </GCard>
  );

  const pipelineCard = (
    <GCard p={24} className="fn-g-pipeline" aria-labelledby="fn-g-pipeline">
      <GSectionHeader id="fn-g-pipeline" size={22} title="Pipeline" caption={t('All active journeys')} action={seeJourneys('Pipeline', () => goJourneys(stage))} />
      <div className="fn-g-chart">
        {summary.clients === 0 ? (
          <GEmpty kind="unconfigured" title={t('No journeys yet.')} body={t('Connect a CRM and the funnel fills itself.')} setupHref={attioHref} setupHint={t('Key Attio or GoHighLevel and the board reads the live pipeline')} />
        ) : (
          <GFunnelStep
            stages={summary.stages.map((s, i) => {
              const conv = s.conversionFromPrev;
              const value = s.stage === stage ? openValue : journeys.filter((j) => j.status === s.stage).reduce((a, j) => a + (j.amountUsd ?? 0), 0);
              return {
                id: s.stage,
                label: stageLabel(s.stage),
                count: s.total,
                conversion: conv === null ? null : conv / 100,
                tip: {
                  title: `${stageLabel(s.stage)} · ${num(s.total)}`,
                  lines: [
                    t('Organic {organic} · Ads {ads}', { organic: num(s.organic), ads: num(s.ads) }),
                    ...(conv !== null && i > 0 ? [t('Drop-off {pct}% from {stage}', { pct: Math.round(100 - conv), stage: stageLabel(summary.stages[i - 1].stage) })] : []),
                    ...(value > 0 ? [t('Open value {usd}', { usd: usd(value) })] : []),
                  ],
                },
              };
            })}
            selected={stage}
            onSelect={(id) => setStage(id as FunnelStage)}
            countNoun={[t('journey'), t('journeys')]}
            tipHint={t('Click to focus this stage')}
            label={t('Pipeline by stage, every active journey')}
          />
        )}
      </div>
      <GAsk mode="filter" value={explore} onValueChange={(v) => { setExplore(v); setNote(null); }} onSubmit={submitExplore} label={t('Jump to a stage or a view with a slash token')} placeholder={t('Type / to jump to a stage or a view')} className="fn-g-ask" />
      {(matching.length > 0 || explore === '/') && (
        <div className="fn-g-slash" role="group" aria-label={t('Slash tokens')}>
          {(matching.length > 0 ? matching : commands).map((c) => (
            <GButton key={c.token} size="sm" title={c.hint} onClick={() => runCommand(c)}>{c.token}</GButton>
          ))}
        </div>
      )}
      {note && <p className="fn-g-cap">{note}</p>}
    </GCard>
  );

  const insights = (
    <GHeroCard
      variant="a"
      className="fn-g-insights"
      caption={t('Converted, all active journeys')}
      value={summary.clients === 0 ? null : `${conversion}%`}
      label={summary.clients === 0 ? t('Nothing to read yet') : t('{pct}% converted', { pct: conversion })}
      status={summary.clients === 0 ? t('Nothing to read yet') : t('{n} of {total} leads converted', { n: summary.converted, total: summary.clients })}
      title={t('Converted journeys over every active journey')}
      strip={
        <div className="fn-g-ins">
          <p className="fn-g-ins-head">
            {summary.clients === 0
              ? t('Connect Attio or GHL and this card starts reading the pipeline.')
              : leak
                ? t('The leak is {from} → {to}, {pct}% drop at that step.', { from: stageLabel(leak.from), to: stageLabel(leak.to), pct: leak.drop })
                : t('No step stands out as the leak.')}
          </p>
          {summary.clients > 0 && (
            <p className="fn-g-cap">
              {pushList.length === 1
                ? t('{n} hot lead in motion, {save} fading toward the archive, {archived} already there.', { n: pushList.length, save: saveList.length, archived: archived.length })
                : t('{n} hot leads in motion, {save} fading toward the archive, {archived} already there.', { n: pushList.length, save: saveList.length, archived: archived.length })}
            </p>
          )}
          <div className="fn-g-actions">
            {leak && <GButton size="sm" onClick={() => goJourneys(leak.from)}>{t('Who is stuck at {stage}', { stage: stageLabel(leak.from).toLowerCase() })}</GButton>}
            {saveList.length > 0 && <GButton size="sm" onClick={() => setView('save')}>{t('Save the {n} fading', { n: saveList.length })}</GButton>}
          </div>
        </div>
      }
    />
  );

  /* ── tables ── */
  const quietTone = (j: FunnelJourney): GTagTone => {
    const meta = journeyMeta(j, now);
    if (meta.state === 'stalled') return 'err';
    return decayFactor(meta.daysSinceLastTouch, j.status) > 0 ? 'warn' : 'neutral';
  };
  const quietTitle = (j: FunnelJourney) => {
    const meta = journeyMeta(j, now);
    const d = decayFactor(meta.daysSinceLastTouch, j.status);
    return d > 0 ? t('Fading: {pct}% of the way to the archive', { pct: Math.round(d * 100) }) : meta.state === 'stalled' ? t('Stalled: quiet past a week before converting') : t('Days since the last touch');
  };
  const leadCol: GColumn<FunnelJourney> = {
    key: 'lead',
    label: t('Lead'),
    sortValue: (j) => j.person ?? j.name,
    render: (j) => (
      <span className="fn-g-lead">
        <span className="fn-g-lead-name">{j.person ?? j.name}</span>
        {j.company && <span className="fn-g-cap">{j.company}</span>}
      </span>
    ),
  };
  const stageCol: GColumn<FunnelJourney> = { key: 'stage', label: t('Stage'), sortValue: (j) => stageIndex(j.status), render: (j) => <span className="fn-g-muted">{stageLabel(j.status)}</span> };
  const quietCol: GColumn<FunnelJourney> = {
    key: 'quiet',
    label: t('Quiet'),
    numeric: true,
    sortValue: (j) => journeyMeta(j, now).daysSinceLastTouch,
    title: t('Days since the last touch'),
    render: (j) => <GTag tone={quietTone(j)} title={quietTitle(j)}>{t('{n} d', { n: journeyMeta(j, now).daysSinceLastTouch })}</GTag>,
  };
  const likelyCol: GColumn<FunnelJourney> = {
    key: 'likelihood',
    label: t('Likelihood'),
    numeric: true,
    sortValue: (j) => j.likelihood,
    render: (j) => (
      <span className="fn-g-likely">
        <span className="fn-g-likely-bar"><i style={{ width: `${Math.max(0, Math.min(100, j.likelihood))}%` }} /></span>
        {j.likelihood}%
      </span>
    ),
  };
  const valueCol: GColumn<FunnelJourney> = {
    key: 'value',
    label: t('Value'),
    numeric: true,
    sortValue: (j) => j.amountUsd ?? 0,
    render: (j) => ((j.amountUsd ?? 0) > 0 ? <span className={j.status === 'converted' ? undefined : 'fn-g-muted'}>{usd(j.amountUsd ?? 0)}{j.status === 'converted' ? '' : t(' open')}</span> : <span className="fn-g-muted">—</span>),
  };
  const contactCol: GColumn<FunnelJourney> = { key: 'contact', label: t('Contact'), render: (j) => <Contact j={j} /> };
  const lastTouchCol: GColumn<FunnelJourney> = {
    key: 'last',
    label: t('Last touch'),
    render: (j) => {
      const last = j.touches[j.touches.length - 1];
      return last ? (
        <span className="fn-g-last" title={t('{stage} · via {source} · {at}', { stage: stageLabel(last.stage), source: last.source, at: last.at })}>
          <span className="fn-g-glyph" aria-hidden>{CHANNEL_GLYPHS[last.channel] ?? '·'}</span>
          <span className="fn-g-last-text">{last.label}</span>
          <span className="fn-g-cap">{fmtDay(Date.parse(`${last.at}T00:00:00Z`))} · {j.touches.length === 1 ? t('{n} touch', { n: j.touches.length }) : t('{n} touches', { n: j.touches.length })}</span>
        </span>
      ) : <span className="fn-g-muted">—</span>;
    },
  };
  const entryCol: GColumn<FunnelJourney> = { key: 'entry', label: t('Entry'), sortValue: (j) => laneOf(j), render: (j) => <span className="fn-g-muted">{LANE_LABEL[laneOf(j)]}</span> };

  const table = (rows: FunnelJourney[], cols: GColumn<FunnelJourney>[], caption: string, empty: string) => (
    <GTable
      caption={caption}
      columns={cols}
      rows={rows}
      rowKey={(j) => j.id}
      onRowClick={(j) => setSelected(j.id)}
      rowLabel={(j) => t('Open {name}', { name: j.person ?? j.name })}
      selectedKey={selected ?? null}
      empty={empty}
      sticky={false}
      className="fn-g-table"
    />
  );

  return (
    <GPage className="fn-g">
      <div className="fn-g-top">
        <GSegmented<View>
          label={t('Funnel views')}
          size="md"
          value={view}
          onChange={setView}
          options={NAV.map((n) => ({ value: n.id, label: <>{n.label}{n.n !== undefined && <span className="fn-g-navn">{n.n}</span>}</> }))}
          className="fn-g-nav"
        />
        <div className="fn-g-top-actions">
          <GButton variant="icon" aria-label={t('Refresh from the sources')} title={t('Re-read the CRM and local journeys')} busy={refreshing} onClick={() => startRefresh(() => router.refresh())}>
            <RefreshCw size={15} strokeWidth={1.75} aria-hidden />
          </GButton>
          {crmHref ? (
            <GButton href={crmHref} external title={t('Open {name} in a new tab', { name: crm?.name ?? '' })}>
              <ExternalLink size={13} strokeWidth={1.75} aria-hidden /> {t('Open {name}', { name: crm?.name ?? '' })}
            </GButton>
          ) : (
            <GButton size="sm" href={attioHref} title={t('Key Attio or GoHighLevel and the board reads the live pipeline')}>{t('Connect a CRM')}</GButton>
          )}
        </div>
      </div>

      <div className="fn-g-title">
        <div className="fn-g-title-l">
          <GDisplay>Funnel</GDisplay>
          <GButton variant="icon" size="sm" onClick={copyLink} title={t('Copy a link to exactly this view')} aria-label={t('Copy a link to this view')}>
            {copied ? <Check size={14} strokeWidth={1.75} aria-hidden /> : <Link2 size={14} strokeWidth={1.75} aria-hidden />}
          </GButton>
          {copied && <span className="fn-g-cap" role="status">{t('Link copied')}</span>}
          {source.kind === 'sample' && <GSampleBadge fixture="components/funnel/sample.ts" />}
        </div>
        <div className="fn-g-filters">
          <GMenu
            label={t('Period')}
            align="start"
            items={PERIODS.map((p) => ({ id: String(p.id), label: p.label, icon: p.id === period ? <Check size={13} aria-hidden /> : undefined, onSelect: () => setPeriod(p.id) }))}
            trigger={(trg) => (
              <GButton {...trg} aria-label={t('Period: {period}', { period: periodWindow })}>
                <Calendar size={13} strokeWidth={1.75} aria-hidden /> {periodWindow} <ChevronDown size={13} strokeWidth={1.75} aria-hidden />
              </GButton>
            )}
          />
          <span className="fn-g-cap">{t('compared to')}</span>
          {period === 0 ? (
            <span className="fn-g-cap" title={t('All time has no earlier window to compare against')}>{t('nothing')}</span>
          ) : (
            <GMenu
              label={t('Comparison window')}
              align="end"
              items={compareOptions.map((o) => ({ id: o.id, label: o.label, icon: o.id === compare ? <Check size={13} aria-hidden /> : undefined, onSelect: () => setCompare(o.id) }))}
              trigger={(trg) => (
                <GButton {...trg} aria-label={t('Comparison window: {label}', { label: compareOptions.find((o) => o.id === compare)?.label ?? '' })}>
                  <Calendar size={13} strokeWidth={1.75} aria-hidden /> {compareOptions.find((o) => o.id === compare)?.label} <ChevronDown size={13} strokeWidth={1.75} aria-hidden />
                </GButton>
              )}
            />
          )}
        </div>
      </div>

      {view === 'overview' && (
        <div className="fn-g-grid">
          <div className="fn-g-c3">{touchCard}</div>
          <div className="fn-g-c4">{dotCard('leads')}{dotCard('converted')}</div>
          <div className="fn-g-c2">{revenueCard}</div>
          <div className="fn-g-c1">{pipelineCard}</div>
          <div className="fn-g-c5">{insights}</div>
          {trakyo && <div className="fn-g-c6"><FunnelLinksG configured={trakyo.configured} setupHref={trakyo.setupHref} /></div>}
          {channels && <div className="fn-g-c7"><FunnelChannelsG card={channels} /></div>}
        </div>
      )}

      {(view === 'push' || view === 'save') && (
        <div className="fn-g-two">
          {(
            [
              { id: 'push', title: t('Push now'), sub: t('Hot and moving. Close them.'), tone: 'ok', list: pushList, empty: t('No hot leads in motion right now') },
              { id: 'save', title: t('Save now'), sub: t('Fading toward the archive, highest likelihood first'), tone: 'err', list: saveList, empty: t('Nothing fading. Every lead is fresh.') },
            ] as const
          ).map((q) => (
            <GCard key={q.id} p={24} className="fn-g-panel" data-quiet={view !== q.id || undefined} aria-labelledby={`fn-g-${q.id}`}>
              <GSectionHeader id={`fn-g-${q.id}`} size={22} title={<span className="fn-g-panel-title"><GTag tone={q.tone} dot size="xs">{q.list.length}</GTag>{q.title}</span>} caption={q.sub} />
              {table(q.list, [leadCol, stageCol, quietCol, likelyCol, valueCol, contactCol], q.title, q.empty)}
            </GCard>
          ))}
        </div>
      )}

      {view === 'journeys' && (
        <GCard p={24} className="fn-g-panel" aria-labelledby="fn-g-journeys">
          <GSectionHeader id="fn-g-journeys" size={22} title={t('Journeys')} caption={t('{n} of {total} leads · click a row for the dossier', { n: tableJourneys.length, total: journeys.length })} />
          <div className="fn-g-segs">
            <GSegmented<string>
              label={t('Stage')}
              value={segment ?? 'all'}
              onChange={(v) => { if (v === 'all') setSegment(undefined); else { setSegment(v as FunnelStage); setStage(v as FunnelStage); } }}
              options={[{ value: 'all', label: t('All stages {n}', { n: journeys.length }) }, ...FUNNEL_STAGES.map((s) => ({ value: s.id, label: `${t(s.label)} ${stageCounts.get(s.id) ?? 0}` }))]}
            />
            <GSegmented<string>
              label={t('Entry')}
              value={lane ?? 'any'}
              onChange={(v) => setLane(v === 'any' ? undefined : (v as Lane))}
              options={[{ value: 'any', label: t('Any entry') }, ...LANES.map((l) => ({ value: l, label: `${LANE_LABEL[l]} ${laneCounts[l]}` }))]}
            />
          </div>
          {table(tableJourneys.slice(0, shown), [leadCol, stageCol, quietCol, likelyCol, entryCol, valueCol, lastTouchCol, contactCol], t('Journey data'), t('No leads match those filters.'))}
          {tableJourneys.length > shown && (
            <div className="fn-g-more">
              <GButton size="sm" onClick={() => setShown((n) => n + PAGE_ROWS)}>{t('Show {n} more', { n: Math.min(PAGE_ROWS, tableJourneys.length - shown) })}</GButton>
              <span className="fn-g-cap">{t('{n} of {total} shown', { n: shown, total: tableJourneys.length })}</span>
            </div>
          )}
        </GCard>
      )}

      {view === 'archive' && (
        <GCard p={24} className="fn-g-panel" aria-labelledby="fn-g-archive">
          <GSectionHeader id="fn-g-archive" size={22} title={t('Archive')} caption={t('Quiet past {n} days · click a row for the dossier', { n: DECAY_DAYS })} />
          {table(archived.slice(0, shown), [leadCol, { ...stageCol, label: t('Reached') }, quietCol, likelyCol, lastTouchCol, contactCol], t('Archived journeys'), t('Nothing decayed. No lead has sat quiet past {n} days.', { n: DECAY_DAYS }))}
          {archived.length > shown && (
            <div className="fn-g-more">
              <GButton size="sm" onClick={() => setShown((n) => n + PAGE_ROWS)}>{t('Show {n} more', { n: Math.min(PAGE_ROWS, archived.length - shown) })}</GButton>
            </div>
          )}
        </GCard>
      )}

      <div className="fn-g-sources">
        {source.kind === 'live' ? (
          <GTag tone="ok" dot>{t('Live · {source}', { source: source.label })}</GTag>
        ) : source.kind === 'db' ? (
          <GTag tone="warn" dot>{t('Local snapshot · CRM not keyed')}</GTag>
        ) : (
          <GTag tone="warn" dot>{t('Sample data · CRM not keyed and no journeys stored')}</GTag>
        )}
        {source.kind !== 'live' && <GButton size="sm" href={attioHref} title={t('Key Attio or GHL to replace this with the live pipeline')}>{t('Set up')}</GButton>}
        {sampleOffer && <GButton size="sm" href="/funnel?sample=1" title={t('See the page on a badged sample set; nothing is stored')}>{t('Preview with sample data')}</GButton>}
        {source.kind === 'sample' && <GButton size="sm" href="/funnel" title={t('Back to the empty, honest state')}>{t('Leave sample data')}</GButton>}
        <span className="fn-g-sep" aria-hidden />
        {connectors.map((c) =>
          c.ok ? (
            <GTag key={c.id} tone="ok" dot title={c.detail}>{c.name}{c.count != null ? ` ${c.count}` : ''}</GTag>
          ) : (
            <GButton key={c.id} size="sm" href={c.href} title={t('{detail} · set up', { detail: c.detail })}>
              <span className="fn-g-off" aria-hidden /> {c.name}
            </GButton>
          ),
        )}
      </div>

      {selectedLead && (
        <LeadDrawerG
          j={selectedLead}
          now={now}
          archived={archivedIds.has(selectedLead.id)}
          onClose={() => setSelected(undefined)}
          onStage={(s) => {
            setSelected(undefined);
            setStage(s);
            setView('overview');
          }}
        />
      )}
    </GPage>
  );
}

/** Contact links: plain prose links (mail, WhatsApp, CRM), never buttons. */
function Contact({ j, full = false }: { j: FunnelJourney; full?: boolean }) {
  const digits = j.phone?.replace(/[^\d]/g, '');
  const isGhl = j.url?.includes('gohighlevel');
  const crm = isGhl ? 'GoHighLevel' : 'Attio';
  const links: { href: string; label: string; ext?: boolean; title?: string }[] = [];
  if (j.email) links.push({ href: `mailto:${j.email}`, label: full ? j.email : t('Email'), title: j.email });
  if (digits) links.push({ href: `https://wa.me/${digits}`, label: full ? `WhatsApp ${j.phone}` : 'WhatsApp', ext: true, title: j.phone ?? undefined });
  if (j.phone && full) links.push({ href: `sms:${j.phone}`, label: 'SMS' });
  if (j.url) links.push({ href: j.url, label: full ? t('Open in {crm}', { crm }) : crm, ext: true });
  if (j.linkedin && full) links.push({ href: j.linkedin, label: 'LinkedIn', ext: true });
  if (links.length === 0) return <span className="fn-g-muted">{full ? t('No contact channel on record') : '—'}</span>;
  return (
    <ul className="fn-g-contact" data-full={full || undefined}>
      {links.map((l) => (
        <li key={l.href}>
          <a href={l.href} target={l.ext ? '_blank' : undefined} rel={l.ext ? 'noopener noreferrer' : undefined} title={l.title}>{l.label}</a>
        </li>
      ))}
    </ul>
  );
}

function LeadDrawerG({ j, now, archived, onClose, onStage }: { j: FunnelJourney; now: Date; archived: boolean; onClose: () => void; onStage: (s: FunnelStage) => void }) {
  const meta = journeyMeta(j, now);
  const decay = decayFactor(meta.daysSinceLastTouch, j.status);
  const reached = stageIndex(j.status);
  const lane = laneOf(j);
  const status = archived
    ? t('Archived · quiet {n} d, past the {days}-day line', { n: meta.daysSinceLastTouch, days: DECAY_DAYS })
    : meta.state === 'converted'
      ? t('Converted')
      : meta.state === 'stalled'
        ? t('Stalled · quiet {n} d', { n: meta.daysSinceLastTouch })
        : decay > 0
          ? t('Fading · quiet {n} d, {pct}% of the way to the archive', { n: meta.daysSinceLastTouch, pct: Math.round(decay * 100) })
          : t('Active · quiet {n} d', { n: meta.daysSinceLastTouch });
  return (
    <GDrawer open onClose={onClose} title={j.person ?? j.name} width={460} className="fn-g-drawer">
      <p className="fn-g-cap fn-g-dsub">{[j.company, j.role].filter(Boolean).join(' · ') || j.name}</p>
      <div className="fn-g-reached" role="img" aria-label={t('Reached {stage}', { stage: stageLabel(j.status) })}>
        {FUNNEL_STAGES.map((s, i) => <i key={s.id} data-on={i <= reached || undefined} title={t(s.label)} />)}
      </div>
      <div className="fn-g-dsec">
        <GSegmented<string>
          label={t('Focus a stage on the board')}
          value={j.status}
          onChange={(v) => onStage(v as FunnelStage)}
          options={FUNNEL_STAGES.map((s) => ({ value: s.id, label: t(s.label), title: t('{stage}: focus this stage on the board', { stage: t(s.label) }) }))}
        />
      </div>
      <GKeyValue
        className="fn-g-facts"
        items={[
          { label: t('Status'), value: status },
          { label: t('Relationship'), value: <span className="fn-g-cap-ink">{j.relationship}</span> },
          { label: t('Likelihood'), value: `${j.likelihood}%` },
          { label: t('Entry'), value: LANE_LABEL[lane] },
          { label: t('Value'), value: `${(j.amountUsd ?? 0) > 0 ? usd(j.amountUsd ?? 0) : '—'}${j.product ? ` · ${j.product}` : ''}${j.status !== 'converted' && (j.amountUsd ?? 0) > 0 ? t(' (open)') : ''}` },
          { label: t('First seen'), value: fmtDate(j.touches[0]?.at ?? j.createdAt) },
          { label: t('Deal'), value: j.name },
        ]}
      />
      <h3 className="fn-g-dlabel">{t('Contact')}</h3>
      <Contact j={j} full />
      <h3 className="fn-g-dlabel">{t('Journey · {n} touches', { n: j.touches.length })}</h3>
      <ol className="fn-g-rail">
        {j.touches.map((tc) => (
          <li key={tc.id}>
            <span className="fn-g-rail-dot" aria-hidden />
            <span className="fn-g-rail-when">{fmtDate(tc.at)}</span>
            <span className="fn-g-rail-what"><span className="fn-g-glyph" aria-hidden>{CHANNEL_GLYPHS[tc.channel] ?? '·'}</span> {tc.label}</span>
            <span className="fn-g-cap">{stageLabel(tc.stage)} · {tc.source}</span>
          </li>
        ))}
        {j.status !== 'converted' && <li data-next=""><span className="fn-g-rail-dot" aria-hidden /><span className="fn-g-cap">{t('Next touch is yours')}</span></li>}
      </ol>
    </GDrawer>
  );
}
