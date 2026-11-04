'use client';

/**
 * /trading under the Bennett Legacy style (pages/trading.md §8): FounderOS's
 * own Trading slab, card for card (shots/founderos-v1/trading-1440-full.png),
 * minus its defects: no seeded rows, limits editable, works at 390. Legacy kit
 * and --l-* tokens only; the same model (lib/trading-model.ts) and behaviour
 * (use-trading.ts) as the other trees. Monitor only: nothing here places an order.
 */
import { useId, useMemo, useState, type PointerEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, RefreshCw, SlidersHorizontal, TrendingUp } from 'lucide-react';
import {
  Badge,
  BigStat,
  Chip,
  DotMatrix,
  InsightCard,
  LDialog,
  LEmpty,
  LError,
  LSampleChip,
  LSwitch,
  LUnconfigured,
  MeterStack,
  Pressable,
  SlabCard,
  SlabTitle,
  ToggleChip,
  type BadgeTone,
  type Meter,
} from '@/components/legacy';
import { extent, nearestIndex, spreadX } from '@/lib/chart-geometry';
import {
  ago, logRows, qty, signedUsd, stamp, toneOf, tradeLine, usd, whoOf, type ActivityFilter, type TradingModel,
} from '@/lib/trading-model';
import type { TradeActivity, TradingPosition } from '@/lib/schemas';
import { useTrading, type TradingUi } from './use-trading';
import type { TradingTreeProps } from './TradingG';
import { localeTag, t } from '@/lib/i18n';
import { statusLabel as enumLabel } from '@/lib/i18n/status';

const statusTone: Record<TradeActivity['status'], BadgeTone> = { filled: 'ok', pending: 'default', cancelled: 'default', rejected: 'err' };
const statusLabel: Record<TradeActivity['status'], string> = { filled: t('Filled'), pending: t('Pending'), cancelled: t('Cancelled'), rejected: t('Rejected') };
const verdictTone = (v: string): BadgeTone => (/buy|enter|long|take/i.test(v) ? 'ok' : /sell|exit|trim/i.test(v) ? 'warn' : /watch|hold/i.test(v) ? 'accent' : 'default');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const acctName = (id: string) => (id === 'agentic' ? t('Agentic') : cap(id));
const sideLabel = (side: string) => (side === 'buy' ? t('buy') : side === 'sell' ? t('sell') : side);
const EYEBROW = t('Markets · Robinhood + Phantom · agent-fed');

function Pnl({ n, cents = true }: { n: number | null; cents?: boolean }) {
  if (n === null) return <span className="l-muted">{t('unknown')}</span>;
  return (
    <span className="l-pnl" data-tone={toneOf(n)}>
      {signedUsd(n, cents)}
    </span>
  );
}

export function TradingLegacy({ model: m, pushPath, setup }: TradingTreeProps) {
  const ui = useTrading(m, pushPath);
  const p = m.payload;

  const right = (
    <>
      {m.fixture && <LSampleChip label={t('Sample')} />}
      {m.feedPill ? (
        <span title={m.feedPill.title}>
          <Chip tone={m.feedPill.tone}>{m.feedPill.text}</Chip>
        </span>
      ) : null}
      <span data-l="Pill" className="l-pill-static">
        {t('monitor-only')}
      </span>
      {!m.unconfigured && (
        <Pressable tone="ghost" onClick={ui.refresh} disabled={ui.refreshing} aria-label={t('Refresh')} title={t('Reload from the store; the wallet read is cached 60 s')}>
          <RefreshCw size={14} strokeWidth={1.7} aria-hidden className={ui.refreshing ? 'l-spin' : undefined} />
        </Pressable>
      )}
    </>
  );

  return (
    <div data-l="TradingLegacy" className="l-page">
      <SlabTitle eyebrow={EYEBROW} title={t('Trading')} meta={m.subtitle ?? m.copy.subtitleEmpty} right={right} />

      {m.unconfigured ? (
        <div className="l-row l-row-hero">
          <ConnectCard ui={ui} setupHref={setup.robinhood} i={1} />
          <SlabCard title={t('Accounts')} sub={t('no source connected')} i={2}>
            <LUnconfigured what={t('The Phantom wallet')} href={setup.phantom} hint={t('Set PHANTOM_WALLET_ADDRESS (a public address, not a key)')} />
          </SlabCard>
        </div>
      ) : (
        <div className="l-stack">
          <div className="l-row l-row-hero">
            {m.feed === 'none' ? <ConnectCard ui={ui} setupHref={setup.robinhood} i={1} /> : <Sleeve m={m} ui={ui} />}
            <Accounts m={m} setupPhantom={setup.phantom} />
          </div>
          {m.feed !== 'none' && (
            <>
              <div className="l-row l-row-three">
                <Reasoning m={m} ui={ui} />
                <Positions m={m} ui={ui} />
                <NextMove m={m} />
              </div>
              <OpenOrders m={m} />
              <TradeLog m={m} ui={ui} />
            </>
          )}
          <Limits m={m} ui={ui} />
          <p className="l-foot-note">{t('Only the agentic sleeve can be traded by an agent. Wallet read from a public RPC.')}</p>
        </div>
      )}

      {ui.openTrade && <TradeDialog trade={ui.openTrade} onClose={() => ui.setOpenTrade(null)} />}
      {ui.positionsOpen && (
        <LDialog title={t('Positions')} sub={t('{n} open · {amount} invested', { n: p.positions.length, amount: usd(m.investedUsd) })} onClose={() => ui.setPositionsOpen(false)} width={720}>
          <PositionRows rows={p.positions} />
        </LDialog>
      )}
      {ui.notesOpen && p.analysis && (
        <LDialog title={t('Agent · reasoning')} sub={`${p.analysis.agent} · ${stamp(p.analysis.at)}`} onClose={() => ui.setNotesOpen(false)}>
          <p className="l-prose">{p.analysis.notes}</p>
        </LDialog>
      )}
      {ui.autopilot.confirmOpen && (
        <LDialog
          title={t('Turn on autopilot?')}
          onClose={() => ui.autopilot.setConfirmOpen(false)}
          footer={
            <>
              <Pressable onClick={() => ui.autopilot.setConfirmOpen(false)}>{t('Cancel')}</Pressable>
              <Pressable tone="primary" disabled={ui.autopilot.switching} onClick={() => void ui.autopilot.setAutopilot(true, true)}>
                {t('Turn on')}
              </Pressable>
            </>
          }
        >
          <p className="l-prose is-muted">{m.copy.autopilotBody}</p>
        </LDialog>
      )}
    </div>
  );
}

/** The unconfigured hero: the Not configured badge, the push URL and its copy button. */
function ConnectCard({ ui, setupHref, i }: { ui: TradingUi; setupHref: string; i: number }) {
  return (
    <SlabCard title={t('Connect the feed')} sub={t('Markets agent · push token stays in the agent')} i={i}>
      <LUnconfigured what={t('The Markets agent feed')} href={setupHref} hint={t('Have the Markets agent push to /api/trading/snapshot with TRADING_PUSH_TOKEN')} />
      <div className="l-card-body pt-0">
        <p className="l-lead">{t('Connect the Markets agent feed. Its first push fills this page.')}</p>
        <p className="l-caption">{t('The agent posts account snapshots, positions and trades with its push token. The token stays in the agent; only the URL goes here.')}</p>
        <div data-l="CopyField" className="l-copy-field">
          <code data-copy="">{ui.pushUrl}</code>
          <Pressable onClick={ui.copyPushUrl} aria-label={t('Copy push URL')}>
            <Copy size={12} strokeWidth={1.7} aria-hidden /> {t('Copy')}
          </Pressable>
        </div>
      </div>
    </SlabCard>
  );
}

/**
 * FO's sleeve chart: a straight line over fading pinstripes with square
 * markers on each capture, scaled to the account's own range (a value series
 * would read flat against zero), the change pinned under the middle.
 */
function ValueLine({ points, label }: { points: Array<{ at: string; valueUsd: number }>; label: string }) {
  const W = 600;
  const H = 170;
  const pad = 10;
  const uid = useId().replace(/:/g, '');
  const [hover, setHover] = useState<number | null>(null);
  const values = points.map((x) => x.valueUsd);
  const geo = useMemo(() => {
    const [lo0, hi0] = extent(values, false);
    const span = hi0 - lo0 || Math.max(1, Math.abs(hi0) * 0.02);
    const lo = lo0 - span * 0.1;
    const hi = hi0 + span * 0.25;
    const xs = spreadX(values.length, pad, W - pad);
    const ys = values.map((v) => pad + (1 - (v - lo) / (hi - lo)) * (H - pad * 2));
    const d = xs.map((x, i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
    return { xs, ys, d, area: `${d} L ${xs[xs.length - 1]} ${H} L ${xs[0]} ${H} Z` };
  }, [values]);
  if (points.length < 2) {
    return <LEmpty>{points.length === 1 ? t('One capture so far. The line starts with the next push.') : t('No captures for this account yet.')}</LEmpty>;
  }
  const first = points[0];
  const last = points[points.length - 1];
  const change = last.valueUsd - first.valueUsd;
  const pct = first.valueUsd ? (change / first.valueUsd) * 100 : null;
  const h = hover !== null ? points[hover] : null;
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover(nearestIndex(geo.xs, ((e.clientX - r.left) / r.width) * W));
  };
  // FO pins a square on a handful of captures: every one on a short series, else the peak, the last and the hovered one
  const peak = values.indexOf(Math.max(...values));
  const marked = (i: number) => i === hover || (values.length <= 8 ? i > 0 : i === peak || i === values.length - 1);
  const pins = `l-trd-pins-${uid}`;
  const fade = `l-trd-fade-${uid}`;
  const mask = `l-trd-mask-${uid}`;
  return (
    <div data-l="ValueLine" className="l-stepline l-trd-line">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={label} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <defs>
          <pattern id={pins} width="5" height="8" patternUnits="userSpaceOnUse">
            <rect width="1.2" height="8" style={{ fill: 'var(--l-text)' }} opacity="0.28" />
          </pattern>
          <linearGradient id={fade} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--l-text)', stopOpacity: 0.9 }} />
            <stop offset="1" style={{ stopColor: 'var(--l-text)', stopOpacity: 0.05 }} />
          </linearGradient>
          <mask id={mask}>
            <rect width={W} height={H} fill={`url(#${fade})`} />
          </mask>
        </defs>
        <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="l-trd-mid" />
        <path d={geo.area} fill={`url(#${pins})`} mask={`url(#${mask})`} />
        <path className="l-draw" d={geo.d} fill="none" strokeWidth={2.5} strokeLinejoin="miter" pathLength={1} style={{ stroke: 'var(--l-text)' }} />
        {geo.xs.map((x, i) =>
          !marked(i) ? null : (
            <rect key={i} className="l-fade" x={x - 4.5} y={geo.ys[i] - 4.5} width={9} height={9} style={{ fill: i === hover || i === geo.xs.length - 1 ? 'var(--l-text)' : 'var(--l-bg-2)', stroke: 'var(--l-text)', strokeWidth: 2 }} />
          ),
        )}
      </svg>
      <div className="l-axis l-trd-axis">
        <span>{stamp(first.at)}</span>
        <span className="l-pnl" data-tone={toneOf(change)}>
          {h ? `${stamp(h.at)} · ${usd(h.valueUsd, true)}` : `${signedUsd(change)}${pct !== null ? ` (${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%)` : ''}`}
        </span>
        <span>{stamp(last.at)}</span>
      </div>
    </div>
  );
}

function Sleeve({ m, ui }: { m: TradingModel; ui: TradingUi }) {
  const a = m.payload.view.agent;
  const s = m.series.find((x) => x.accountId === ui.acct) ?? m.series[0];
  const strip: Array<{ label: string; value: ReactNode }> = [
    { label: t('Deployed'), value: usd(a.deployedUsd, true) },
    { label: t('Idle cash'), value: a.idleCashUsd === null ? t('unknown') : usd(a.idleCashUsd, true) },
    { label: t('Unrealized'), value: <Pnl n={a.unrealizedPnlUsd} /> },
    { label: t('Agent trades'), value: a.tradeCount },
  ];
  return (
    <SlabCard
      title={t('Agent · the sleeve')}
      sub={a.hasActed ? `${a.tradeCount === 1 ? t('{n} trade', { n: a.tradeCount }) : t('{n} trades', { n: a.tradeCount })} · ${t('last {ago}', { ago: a.lastTrade ? ago(a.lastTrade.at, m.now) : '' })}` : t('the agent has not traded yet')}
      i={1}
    >
      {m.series.length > 1 && (
        <div role="radiogroup" aria-label={t('Account shown in the chart')} className="l-chip-row l-pad-x pt-3">
          {m.series.map((x) => (
            <ToggleChip key={x.accountId} role="radio" aria-checked={ui.acct === x.accountId} on={ui.acct === x.accountId} onClick={() => ui.setAcct(x.accountId)}>
              {x.label}
            </ToggleChip>
          ))}
        </div>
      )}
      <div className="pt-4">
        <ValueLine points={s?.points ?? []} label={t('{account} value per capture', { account: s?.label ?? t('Account') })} />
      </div>
      {m.hasAgentic ? (
        <dl data-l="StatStrip" className="l-strip mx-6 mb-6">
          {strip.map((x) => (
            <div key={x.label}>
              <dt>{x.label}</dt>
              <dd>{x.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <LEmpty>{t('No agentic account in the feed.')} {t("The agent's stats appear once a push carries the account with id agentic.")}</LEmpty>
      )}
    </SlabCard>
  );
}

function Accounts({ m, setupPhantom }: { m: TradingModel; setupPhantom: string }) {
  const hasWallet = m.accounts.some((a) => a.kind === 'wallet');
  const brokerage = m.accounts.filter((a) => a.kind === 'brokerage');
  const n = m.payload.positions.length;
  const chips = [
    ...(m.dayPnlUsd !== null ? [{ tone: (m.dayPnlUsd < 0 ? 'err' : 'ok') as 'ok' | 'err', text: t('{amount} today', { amount: signedUsd(m.dayPnlUsd) }) }] : []),
    ...(n ? [{ tone: 'accent' as const, text: t('{amount} in {positions}', { amount: usd(m.investedUsd), positions: n === 1 ? t('{n} position', { n }) : t('{n} positions', { n }) }) }] : []),
  ];
  const meters: Meter[] = m.accounts.map((a) => ({
    label: `${a.label} · ${a.note}`,
    frac: a.valueUsd === null ? null : a.frac,
    display: a.valueUsd === null ? t('unknown') : usd(a.valueUsd, true),
  }));
  return (
    <SlabCard title={t('Accounts')} sub={`${m.accounts.length === 1 ? t('{n} source', { n: m.accounts.length }) : t('{n} sources', { n: m.accounts.length })} · ${m.payload.view.freshness.label}`} i={2} className="flex flex-col">
      <div className="l-card-body flex flex-1 flex-col">
        <BigStat display={m.totalUsd === null ? undefined : usd(m.totalUsd, true)} value={m.totalUsd} caption={brokerage.length === 1 ? t('brokerage, {n} account', { n: brokerage.length }) : t('brokerage, {n} accounts', { n: brokerage.length })} />
        {chips.length > 0 && (
          <div className="l-chip-row mt-3">
            {chips.map((c) => (
              <Chip key={c.text} tone={c.tone}>
                {c.text}
              </Chip>
            ))}
          </div>
        )}
        <MeterStack meters={meters} dense empty={t('No account has reported yet.')} />
        {!hasWallet && <LUnconfigured what={t('The Phantom wallet')} href={setupPhantom} hint={t('Set PHANTOM_WALLET_ADDRESS')} />}
        {brokerage.length > 0 && (
          <dl className="l-kv mt-4">
            <div>
              <dt>{t('Cash')}</dt>
              <dd>{usd(brokerage.reduce((tr, a) => tr + (a.cashUsd ?? 0), 0), true)}</dd>
            </div>
            <div>
              <dt>{t('Buying power')}</dt>
              <dd>{usd(brokerage.reduce((tr, a) => tr + (a.buyingPowerUsd ?? 0), 0), true)}</dd>
            </div>
            <div>
              <dt>{t('Total P&L')}</dt>
              <dd>
                <Pnl n={m.payload.accounts.reduce((tr, a) => tr + a.totalPnlUsd, 0)} />
              </dd>
            </div>
          </dl>
        )}
      </div>
    </SlabCard>
  );
}

function Reasoning({ m, ui }: { m: TradingModel; ui: TradingUi }) {
  const a = m.payload.analysis;
  return (
    <SlabCard
      title={t('Agent · reasoning')}
      sub={a ? `${t('examined {n}', { n: a.examined })} · ${a.signals === 1 ? t('{n} signal', { n: a.signals }) : t('{n} signals', { n: a.signals })} · ${ago(a.at, m.now)}` : t('no run recorded')}
      i={3}
      action={
        a && a.notes.length > 140 ? (
          <Pressable onClick={() => ui.setNotesOpen(true)}>{t('Read all')}</Pressable>
        ) : undefined
      }
    >
      {!a ? (
        <LEmpty>{t('No analysis pushed yet.')} {t('The agent writes here every run, whether or not it trades.')}</LEmpty>
      ) : (
        <div className="l-card-body">
          {a.notes && <p className="l-clamp-3 l-body-text">{a.notes}</p>}
          <ul className="l-rows mt-3">
            {a.rows.slice(0, 6).map((r) => (
              <li key={r.ticker} className="l-trd-why" title={r.score === null ? t('Not scored') : t('Score {score}', { score: r.score.toFixed(2) })}>
                <span className="l-sym">{r.ticker}</span>
                <span className="l-trd-why-text">{r.reason}</span>
                <Badge tone={verdictTone(r.verdict)}>{enumLabel(r.verdict, 'verdict')}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SlabCard>
  );
}

function PositionRows({ rows }: { rows: TradingPosition[] }) {
  return (
    <ul className="l-rows">
      {rows.map((r) => (
        <li key={`${r.accountId}:${r.symbol}`} className="l-trd-pos">
          <span className="min-w-0">
            <span className="l-sym">{r.symbol}</span> <span className="l-tag">{acctName(r.accountId)}</span>
            <span className="l-sub-line">
              {qty(r.quantity)} @ {usd(r.avgCostUsd, true)}
            </span>
          </span>
          <span className="l-num">{usd(r.marketValueUsd, true)}</span>
          <span className="l-num">
            <Pnl n={r.unrealizedPnlUsd} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Positions({ m, ui }: { m: TradingModel; ui: TradingUi }) {
  const pos = m.payload.positions;
  return (
    <SlabCard
      title={t('Positions')}
      sub={pos.length ? t('{amount} invested', { amount: usd(m.investedUsd) }) : t('nothing held')}
      i={4}
      action={pos.length > 4 ? <Pressable onClick={() => ui.setPositionsOpen(true)}>{t('See all')}</Pressable> : undefined}
    >
      {pos.length === 0 ? (
        <LEmpty>{t('No open positions.')}</LEmpty>
      ) : (
        <>
          <div className="l-trd-pos-head">
            <BigStat value={pos.length} size={30} caption={t('open positions')} />
            <DotMatrix cols={m.payload.view.sizes.map((b) => ({ label: b.label, count: b.count }))} />
          </div>
          <PositionRows rows={pos.slice(0, 4)} />
        </>
      )}
    </SlabCard>
  );
}

function NextMove({ m }: { m: TradingModel }) {
  const a = m.payload.view.agent;
  const last = m.lastAgentTrade;
  const notes = m.payload.analysis?.notes;
  const budget = m.limits.saved?.maxDeployedCapitalUsd ?? null;
  const frac = budget ? a.deployedUsd / Math.max(1, budget) : null;
  return (
    <InsightCard
      badge={t('Agent · next move')}
      value={a.tradeCount}
      headline={a.tradeCount === 1 ? t('trade filled in the sleeve.') : t('trades filled in the sleeve.')}
      body={
        <>
          <span className="l-clamp-4">{notes || (last ? t('Last: {action} {trade}, {ago}. {rationale}', { action: last.action, trade: tradeLine(last), ago: ago(last.at, m.now), rationale: last.rationale }) : t('The agent has not reported a run yet.'))}</span>
          {m.limits.saved && frac !== null && (
            <span className="mt-2 block text-[11px]">
              {m.limits.saved.autopilot ? t('Autopilot on') : t('Autopilot off')} · {t('{pct}% of the autonomy budget deployed', { pct: Math.round(frac * 100) })}
            </span>
          )}
        </>
      }
      frac={frac}
      i={5}
      icon={<TrendingUp size={13} strokeWidth={1.7} aria-hidden />}
    />
  );
}

function OpenOrders({ m }: { m: TradingModel }) {
  const orders = m.payload.openOrders;
  return (
    <SlabCard title={t('Open orders')} sub={orders.length ? t('{n} working', { n: orders.length }) : t('nothing working')} i={6}>
      {orders.length === 0 ? (
        <LEmpty>{t('No live orders at the broker.')}</LEmpty>
      ) : (
        <ul className="l-rows l-rows-ruled mt-3">
          {orders.map((o) => (
            <li key={o.id} className="l-trd-trade">
              <span className="l-side" data-side={o.side}>
                {sideLabel(o.side)}
              </span>
              <span className="min-w-0">
                <span className="l-sym">{o.symbol}</span>{' '}
                <span className="l-body-text">
                  {o.dollarAmountUsd !== null ? usd(o.dollarAmountUsd, true) : `${qty(o.quantity)}${o.limitPriceUsd !== null ? ` @ ${usd(o.limitPriceUsd, true)}` : ''}`}
                </span>{' '}
                <Badge>{enumLabel(o.state, 'order')}</Badge>
                <span className="l-sub-line">
                  {enumLabel(o.type, 'ordertype', cap(o.type))} · {o.filledQuantity ? `${t('{n} filled', { n: qty(o.filledQuantity) })} · ` : ''}
                  {o.placedAgent || t('Unknown')}
                </span>
              </span>
              <span className="l-when">{ago(o.createdAt, m.now)}</span>
            </li>
          ))}
        </ul>
      )}
    </SlabCard>
  );
}

function TradeLog({ m, ui }: { m: TradingModel; ui: TradingUi }) {
  const c = m.payload.view.activityCounts;
  const rows = logRows(m, ui.log);
  const filters: { value: ActivityFilter; label: string }[] = [
    { value: 'all', label: t('All') },
    { value: 'agent', label: t('Agent') },
    { value: 'you', label: t('You') },
    { value: 'rejected', label: t('Rejected') },
  ];
  return (
    <SlabCard
      title={t('Trade log')}
      sub={c.all ? t('{done} of {total}', { done: rows.length, total: c.all }) : undefined}
      i={7}
      action={
        c.all ? (
          <div role="radiogroup" aria-label={t('Filter the trade log')} className="l-chip-row l-chip-scroll">
            {filters.map((f) => (
              <ToggleChip key={f.value} role="radio" aria-checked={ui.log === f.value} on={ui.log === f.value} onClick={() => ui.setLog(f.value)}>
                {f.label} {c[f.value]}
              </ToggleChip>
            ))}
          </div>
        ) : undefined
      }
    >
      {c.all === 0 ? (
        <LEmpty>{t('No trades yet.')}</LEmpty>
      ) : rows.length === 0 ? (
        <LEmpty>{t('Nothing matches this filter.')}</LEmpty>
      ) : (
        <ul className="l-rows l-rows-ruled mt-3">
          {rows.map((tr) => (
            <li key={tr.id}>
              <Pressable tone="row" className="l-trd-trade" onClick={() => ui.setOpenTrade(tr)}>
                <span className="l-side" data-side={tr.action}>
                  {sideLabel(tr.action)}
                </span>
                <span className="min-w-0">
                  <span className="l-sym">{tradeLine(tr)}</span> <Badge tone={statusTone[tr.status]}>{statusLabel[tr.status]}</Badge>
                  <span className="l-sub-line">{tr.rationale || t('No rationale given')}</span>
                </span>
                <span className="l-when">
                  {whoOf(tr)} · {acctName(tr.accountId)}
                  <span className="block">{ago(tr.at, m.now)}</span>
                </span>
              </Pressable>
            </li>
          ))}
        </ul>
      )}
    </SlabCard>
  );
}

function TradeDialog({ trade: tr, onClose }: { trade: TradeActivity; onClose: () => void }) {
  const rows: [string, ReactNode][] = [
    [t('Order'), tradeLine(tr)],
    [t('Notional'), usd(tr.quantity * tr.priceUsd, true)],
    [t('Status'), <Badge key="s" tone={statusTone[tr.status]}>{statusLabel[tr.status]}</Badge>],
    [t('Who'), whoOf(tr)],
    [t('Account'), tr.accountId === 'agentic' ? t('Agentic sleeve') : acctName(tr.accountId)],
  ];
  return (
    <LDialog title={`${tr.action === 'buy' ? t('Buy') : t('Sell')} ${tr.symbol}`} sub={stamp(tr.at)} onClose={onClose}>
      <dl className="l-kv">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="l-quote mt-4">{tr.rationale || t('No rationale given.')}</p>
    </LDialog>
  );
}

function Limits({ m, ui }: { m: TradingModel; ui: TradingUi }) {
  const L = ui.limits;
  return (
    <section data-l="SlabCard" className="l-rise l-card l-trd-limits" style={{ ['--l-rise-i' as string]: 8 }} aria-labelledby="l-trd-limits">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void L.save();
        }}
      >
        <div className="l-trd-limits-head">
          <h2 id="l-trd-limits" className="l-label">
            <SlidersHorizontal size={12} strokeWidth={1.8} aria-hidden /> {t('Agent limits')}
          </h2>
          <span className="l-micro">{m.limits.savedLabel}</span>
        </div>
        <div className="l-trd-fields">
          {m.limits.fields.map((f) => {
            const err = L.fieldError(f.key);
            return (
              <label key={f.key} className="l-trd-field" htmlFor={`l-trd-${f.key}`}>
                <span className="min-w-0 flex-1">
                  <span className="l-field-label">{f.label}</span>
                  <span className={err ? 'l-field-hint is-err' : 'l-field-hint'} role={err ? 'alert' : undefined}>
                    {err ?? f.hint}
                  </span>
                </span>
                <span className="l-trd-input" data-invalid={err ? '' : undefined}>
                  {f.unit === '$' && <span aria-hidden>$</span>}
                  <input
                    id={`l-trd-${f.key}`}
                    inputMode="decimal"
                    value={L.values[f.key] ?? ''}
                    placeholder={t('Not set')}
                    aria-invalid={Boolean(err)}
                    disabled={m.readOnly}
                    title={m.readOnly ? (m.readOnlyReason ?? undefined) : t('{from} to {to}', { from: f.min.toLocaleString(localeTag()), to: f.max.toLocaleString(localeTag()) })}
                    onChange={(e) => L.setValue(f.key, e.target.value)}
                    onBlur={() => L.blur(f.key)}
                    className="l-input"
                  />
                  {f.unit === '%' && <span aria-hidden>%</span>}
                </span>
              </label>
            );
          })}
        </div>
        <div className="l-trd-autopilot">
          <span className="min-w-0 flex-1">
            <span className="l-field-label">{t('Autopilot')}</span>
            <span className="l-field-hint">
              {ui.autopilot.on ? t('On: the Markets agent may place real orders inside these limits.') : t('Off: the daily run proposes and logs every order as a dry run; nothing reaches the broker.')}
            </span>
          </span>
          <LSwitch
            on={ui.autopilot.on}
            label={t('Autopilot')}
            disabled={Boolean(ui.autopilot.reason) || ui.autopilot.switching}
            title={ui.autopilot.reason}
            onToggle={() => void ui.autopilot.setAutopilot(!ui.autopilot.on)}
          />
        </div>
        <div className="l-trd-save">
          {L.saveError && (
            <span role="alert" className="l-err-text">
              {L.saveError}
            </span>
          )}
          <Pressable type="submit" disabled={Boolean(L.saveReason) || L.saving} title={L.saveReason}>
            {L.saving ? t('Saving') : t('Save')}
          </Pressable>
        </div>
      </form>
    </section>
  );
}

/** The trading store itself is unreachable: the whole page says so, with Retry. */
export function TradingLegacyError({ message }: { message: string }) {
  const router = useRouter();
  return (
    <div data-l="TradingLegacy" className="l-page">
      <SlabTitle eyebrow={EYEBROW} title={t('Trading')} meta={t('the trading store could not be read')} />
      <SlabCard title={t('The trading store is not reachable.')} i={1}>
        <LError message={message} onRetry={() => router.refresh()} />
      </SlabCard>
    </div>
  );
}
