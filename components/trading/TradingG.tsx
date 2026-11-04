'use client';

/**
 * /trading under the GladOS style (pages/trading.md §6). Renders the model
 * from lib/trading-page.ts with G kit parts only; behaviour lives in
 * use-trading.ts so every tree acts the same. Monitor only: no control here
 * places an order (T13).
 */
import { Copy, RefreshCw } from 'lucide-react';
import {
  GAreaChart, GBarChart, GButton, GCard, GDelta, GDialog, GDriverBars, GEmpty, GErrorLine, GField, GHeroCard, GInput, GKeyValue, GList, GPage, GRow,
  GSampleBadge, GSectionHeader, GSegmented, GSheet, GSparkline, GStat, GTable, GTag, GToggle, GWell, type GColumn, type GTagTone,
} from '@/components/g';
import {
  ago, day, logRows, usdCompact, qty, signedUsd, stamp, toneOf, tradeLine, usd, whoOf, type ActivityFilter, type TradingModel,
} from '@/lib/trading-model';
import type { TradeActivity, TradingOrder, TradingPosition } from '@/lib/schemas';
import { useTrading, type TradingUi } from './use-trading';
import { localeTag, t } from '@/lib/i18n';
import { statusLabel as enumLabel } from '@/lib/i18n/status';

export type TradingTreeProps = { model: TradingModel; pushPath: string; setup: { robinhood: string; phantom: string } };

const statusTone: Record<TradeActivity['status'], GTagTone> = { filled: 'ok', pending: 'neutral', cancelled: 'outline', rejected: 'err' };
const statusLabel: Record<TradeActivity['status'], string> = { filled: t('Filled'), pending: t('Pending'), cancelled: t('Cancelled'), rejected: t('Rejected') };
const verdictTone = (v: string): GTagTone => (/buy|enter|long|take/i.test(v) ? 'ok' : /sell|exit|trim/i.test(v) ? 'warn' : /watch|hold/i.test(v) ? 'neutral' : 'outline');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** P&L in ok / err (never a bordered pill), sans tabular. */
function Pnl({ n, cents = true }: { n: number | null; cents?: boolean }) {
  if (n === null) return <span className="trd-g-pnl">—</span>;
  return (
    <span className="trd-g-pnl" data-tone={toneOf(n)}>
      {signedUsd(n, cents)}
    </span>
  );
}

export function TradingG({ model, pushPath, setup }: TradingTreeProps) {
  const ui = useTrading(model, pushPath);
  const m = model;
  const p = m.payload;

  const headerAction = (
    <div className="trd-g-head-actions">
      {m.fixture && <GSampleBadge fixture={m.fixture} />}
      {m.feedPill ? (
        <GTag tone={m.feedPill.tone} dot title={m.feedPill.title}>
          {m.feedPill.text}
        </GTag>
      ) : (
        <SourceTag label={t('Robinhood feed')} href={setup.robinhood} hint={t('Have the Markets agent push to /api/trading/snapshot with TRADING_PUSH_TOKEN')} />
      )}
      {m.wallet === 'unconfigured' && <SourceTag label={t('Phantom wallet')} href={setup.phantom} hint={t('Set PHANTOM_WALLET_ADDRESS (a public address, not a key)')} />}
      {!m.unconfigured && (
        <GButton onClick={ui.refresh} busy={ui.refreshing} title={t('Reload from the store; the wallet read is cached 60 s')}>
          <RefreshCw size={14} strokeWidth={1.75} aria-hidden />
          {t('Refresh')}
        </GButton>
      )}
    </div>
  );

  return (
    <GPage className="trd-g">
      <GSectionHeader size="page" title={t('Trading')} caption={m.subtitle ?? m.copy.subtitleEmpty} action={headerAction} />

      {m.unconfigured ? (
        <ConnectCard ui={ui} setupHref={setup.robinhood} />
      ) : (
        <>
          <div className="trd-g-top">
            <Hero m={m} />
            {m.feed === 'none' ? <ConnectCard ui={ui} setupHref={setup.robinhood} /> : <Sleeve m={m} ui={ui} />}
          </div>

          <div className="trd-g-mid">
            <Accounts m={m} setupPhantom={setup.phantom} />
            {m.feed !== 'none' && <Positions m={m} ui={ui} />}
            {m.feed !== 'none' && <Reasoning m={m} ui={ui} />}
          </div>

          {m.feed !== 'none' && <TradeLog m={m} ui={ui} />}

          <div className="trd-g-bottom">
            {m.feed !== 'none' && <OpenOrders orders={p.openOrders} now={m.now} />}
            <Limits m={m} ui={ui} />
          </div>

          <p className="trd-g-foot">{t('Only the agentic sleeve can be traded by an agent. Wallet read from a public RPC.')}</p>
        </>
      )}

      <TradeSheet trade={ui.openTrade} onClose={() => ui.setOpenTrade(null)} />
      <GSheet open={ui.positionsOpen} onClose={() => ui.setPositionsOpen(false)} title={t('Positions')} caption={t('{n} open · {amount} invested', { n: p.positions.length, amount: usd(m.investedUsd) })} width={760}>
        <PositionsTable rows={p.positions} />
      </GSheet>
      <GSheet open={ui.notesOpen} onClose={() => ui.setNotesOpen(false)} title={t('Agent reasoning')} caption={p.analysis ? `${p.analysis.agent} · ${stamp(p.analysis.at)}` : undefined} width={640}>
        <p className="trd-g-notes-full">{p.analysis?.notes}</p>
      </GSheet>
      <GDialog
        open={ui.autopilot.confirmOpen}
        onClose={() => ui.autopilot.setConfirmOpen(false)}
        title={t('Turn on autopilot?')}
        confirmLabel={t('Turn on')}
        busy={ui.autopilot.switching}
        onConfirm={() => ui.autopilot.setAutopilot(true, true)}
      >
        {m.copy.autopilotBody}
      </GDialog>
    </GPage>
  );
}

function SourceTag({ label, href, hint }: { label: string; href: string; hint: string }) {
  return (
    <span className="trd-g-source" title={hint}>
      <GTag tone="outline">{label} · {t('Not configured')}</GTag>
      <GButton variant="sm" href={href} title={hint}>
        {t('Set up')}
      </GButton>
    </span>
  );
}

function ConnectCard({ ui, setupHref }: { ui: TradingUi; setupHref: string }) {
  return (
    <GCard p={24} className="trd-g-connect" aria-label={t('Connect the Markets agent feed')}>
      <GEmpty
        kind="unconfigured"
        title={t('Connect the Markets agent feed. Its first push fills this page.')}
        body={t('The agent posts account snapshots, positions and trades with its push token. The token stays in the agent; only the URL goes here.')}
        setupHref={setupHref}
        setupHint="TRADING_PUSH_TOKEN"
      />
      <GWell className="trd-g-push">
        <code className="trd-g-push-url" data-copy="">
          {ui.pushUrl}
        </code>
        <GButton variant="sm" onClick={ui.copyPushUrl} aria-label={t('Copy push URL')}>
          <Copy size={13} strokeWidth={1.75} aria-hidden />
          {t('Copy')}
        </GButton>
      </GWell>
    </GCard>
  );
}

function Hero({ m }: { m: TradingModel }) {
  const status =
    m.dayPnlUsd === null ? (
      m.wallet === 'ok' ? t('Wallet only') : undefined
    ) : (
      <>
        {t('{amount} today', { amount: signedUsd(m.dayPnlUsd, false) })}
        {m.investedFrac !== null && <> · {t('{pct}% invested', { pct: Math.round(m.investedFrac * 100) })}</>}
      </>
    );
  return (
    <GHeroCard
      variant="a"
      className="trd-g-hero"
      caption={t('Total value')}
      value={m.totalUsd === null ? null : usd(m.totalUsd)}
      label={m.totalUsd === null ? t('Total value unknown') : t('Total value {amount}', { amount: usd(m.totalUsd) })}
      title={t('Brokerage accounts from the newest push, plus the Phantom wallet when priced')}
      status={status}
      strip={<GSparkline values={m.totalHistory} label={t('Total value · {n} captures · Markets agent feed', { n: m.totalHistory.length })} onHero />}
    />
  );
}

function Sleeve({ m, ui }: { m: TradingModel; ui: TradingUi }) {
  const p = m.payload;
  const s = m.series.find((x) => x.accountId === ui.acct) ?? m.series[0];
  const pts = s?.points ?? [];
  const agent = p.view.agent;
  const caption = agent.hasActed
    ? `${agent.tradeCount === 1 ? t('{n} trade', { n: agent.tradeCount }) : t('{n} trades', { n: agent.tradeCount })} · ${t('last {ago}', { ago: agent.lastTrade ? ago(agent.lastTrade.at, m.now) : '' })}`
    : t('The agent has not traded yet');
  return (
    <GCard p={24} className="trd-g-sleeve" aria-labelledby="trd-g-sleeve">
      <GSectionHeader
        id="trd-g-sleeve"
        size={22}
        title={t('Agent sleeve')}
        caption={caption}
        action={
          m.series.length > 1 ? (
            <GSegmented
              label={t('Account shown in the chart')}
              value={ui.acct ?? ''}
              onChange={ui.setAcct}
              options={m.series.map((x) => ({ value: x.accountId, label: x.label }))}
            />
          ) : undefined
        }
      />
      <div className="trd-g-chart">
        <GAreaChart
          labels={pts.map((x) => stamp(x.at))}
          axisLabels={pts.map((x) => day(x.at))}
          series={[{ id: s?.accountId ?? 'none', label: s?.label ?? t('Account'), values: pts.map((x) => x.valueUsd), color: 'series-1' }]}
          formatValue={usdCompact}
          zeroBase={false}
          height={180}
          tip={(i) => ({ title: stamp(pts[i].at), lines: [`${s?.label}: ${usd(pts[i].valueUsd, true)}`] })}
          label={t('{account} value per capture, {n} captures, Markets agent feed', { account: s?.label ?? t('Account'), n: pts.length })}
          emptyText={t('No captures for this account yet.')}
        />
      </div>
      {m.hasAgentic ? (
        <div className="trd-g-stats">
          <GStat value={usd(agent.deployedUsd, true)} label={t('Deployed')} source={t("Market value of the agentic sleeve's positions")} />
          <GStat value={agent.idleCashUsd === null ? null : usd(agent.idleCashUsd, true)} label={t('Idle cash')} source={t('Cash in the agentic sleeve, newest push')} />
          <div className="trd-g-stat-tone" data-tone={toneOf(agent.unrealizedPnlUsd)}>
            <GStat value={signedUsd(agent.unrealizedPnlUsd)} label={t('Unrealized')} source={t("Unrealized P&L across the agentic sleeve's positions")} />
          </div>
          <GStat value={t('{n} filled', { n: agent.tradeCount })} label={t('Agent trades')} source={t('Filled orders the agent placed in the sleeve')} />
        </div>
      ) : (
        <GEmpty inline title={t('No agentic account in the feed.')} body={t("The agent's stats appear once a push carries the account with id agentic.")} />
      )}
    </GCard>
  );
}

function Accounts({ m, setupPhantom }: { m: TradingModel; setupPhantom: string }) {
  const brokerage = m.accounts.filter((a) => a.kind === 'brokerage');
  const wallet = m.accounts.find((a) => a.kind === 'wallet');
  const rows = m.accounts
    .filter((a) => a.valueUsd !== null)
    .map((a) => ({
      id: a.id,
      label: a.label,
      value: a.valueUsd ?? 0,
      display: usd(a.valueUsd ?? 0),
      title: `${a.label} · ${a.note} · ${t('{pct}% of the total', { pct: Math.round(a.frac * 100) })}`,
      tone: a.agentMayTrade ? undefined : ('soft' as const),
    }));
  const cash = brokerage.reduce((s, a) => s + (a.cashUsd ?? 0), 0);
  const bp = brokerage.reduce((s, a) => s + (a.buyingPowerUsd ?? 0), 0);
  const totalPnl = m.payload.accounts.reduce((s, a) => s + a.totalPnlUsd, 0);
  return (
    <GCard p={24} className="trd-g-accounts" aria-labelledby="trd-g-accounts">
      <GSectionHeader id="trd-g-accounts" size={22} title={t('Accounts')} caption={m.accounts.length === 1 ? t('{n} source', { n: m.accounts.length }) : t('{n} sources', { n: m.accounts.length })} />
      {rows.length > 0 && <GDriverBars rows={rows} labelWidth={84} label={t('Value per account')} />}
      <GList divided label={t('Account notes')}>
        {m.accounts.map((a) => (
          <GRow
            key={a.id}
            title={a.label}
            meta={a.note}
            hint={a.error}
            trailing={a.kind === 'wallet' && a.valueUsd === null ? <GTag tone="warn" title={a.error}>{t('Not reachable')}</GTag> : <GDelta cur={a.valueUsd} prev={a.dayPnlUsd === null || a.valueUsd === null ? null : a.valueUsd - a.dayPnlUsd} money window={t('today')} />}
          />
        ))}
        {!wallet && (
          <GRow
            title="Phantom"
            meta={t('Solana wallet, read from a public address')}
            trailing={
              <GButton variant="sm" href={setupPhantom} title={t('Set PHANTOM_WALLET_ADDRESS')}>
                {t('Set up')}
              </GButton>
            }
          />
        )}
      </GList>
      {brokerage.length > 0 && (
        <GKeyValue
          className="trd-g-kv"
          items={[
            { label: t('Cash'), value: usd(cash, true) },
            { label: t('Buying power'), value: usd(bp, true) },
            { label: t('Total P&L'), value: <Pnl n={totalPnl} /> },
          ]}
        />
      )}
    </GCard>
  );
}

function PositionsTable({ rows }: { rows: TradingPosition[] }) {
  const cols: GColumn<TradingPosition>[] = [
    { key: 'symbol', label: t('Symbol'), render: (r) => <span className="trd-g-sym">{r.symbol}</span>, sortValue: (r) => r.symbol },
    { key: 'acct', label: t('Account'), render: (r) => (r.accountId === 'agentic' ? t('Agentic') : cap(r.accountId)), sortValue: (r) => r.accountId },
    { key: 'qty', label: t('Qty'), align: 'right', numeric: true, render: (r) => qty(r.quantity), sortValue: (r) => r.quantity },
    { key: 'value', label: t('Value'), align: 'right', numeric: true, render: (r) => usd(r.marketValueUsd, true), sortValue: (r) => r.marketValueUsd },
    { key: 'pnl', label: 'P&L', align: 'right', numeric: true, render: (r) => <Pnl n={r.unrealizedPnlUsd} />, sortValue: (r) => r.unrealizedPnlUsd },
  ];
  return <GTable columns={cols} rows={rows} rowKey={(r) => `${r.accountId}:${r.symbol}`} caption={t('Open positions, largest first')} sticky={false} empty={t('No open positions.')} />;
}

function Positions({ m, ui }: { m: TradingModel; ui: TradingUi }) {
  const pos = m.payload.positions;
  const top = pos.slice(0, 6);
  const sizes = m.payload.view.sizes;
  const biggest = sizes.reduce((a, b) => (b.count > a.count ? b : a), sizes[0]);
  return (
    <GCard p={24} className="trd-g-positions" aria-labelledby="trd-g-positions">
      <GSectionHeader
        id="trd-g-positions"
        size={22}
        title={t('Positions')}
        caption={pos.length ? t('{n} open · {amount} invested', { n: pos.length, amount: usd(m.investedUsd) }) : t('Nothing held')}
        action={
          pos.length > top.length ? (
            <GButton variant="sm" onClick={() => ui.setPositionsOpen(true)}>
              {t('See all {n}', { n: pos.length })}
            </GButton>
          ) : undefined
        }
      />
      {pos.length === 0 ? (
        <GEmpty inline title={t('No open positions.')} body={t('Holdings appear with the next push that carries them.')} />
      ) : (
        <>
          <div className="trd-g-buckets">
            <GBarChart
              variant="series"
              bars={sizes.map((b) => ({ id: b.label, label: b.label, value: b.count, tip: { title: b.label, lines: [b.count === 1 ? t('{n} position', { n: b.count }) : t('{n} positions', { n: b.count })] } }))}
              highlight={biggest.count > 0 ? biggest.label : null}
              height={64}
              formatValue={(v) => String(v)}
              label={t('Positions by size: under $50, $50 to $250, $250 to $1k, over $1k')}
            />
          </div>
          <div className="trd-g-pos-table">
            <PositionsTable rows={top} />
          </div>
          <GList divided className="trd-g-pos-list" label={t('Largest positions')}>
            {top.map((r) => (
              <GRow
                key={`${r.accountId}:${r.symbol}`}
                title={r.symbol}
                meta={`${qty(r.quantity)} @ ${usd(r.avgCostUsd, true)} · ${r.accountId === 'agentic' ? t('Agentic') : cap(r.accountId)}`}
                trailing={
                  <span className="trd-g-stack">
                    <span>{usd(r.marketValueUsd, true)}</span>
                    <Pnl n={r.unrealizedPnlUsd} />
                  </span>
                }
              />
            ))}
          </GList>
        </>
      )}
    </GCard>
  );
}

function Reasoning({ m, ui }: { m: TradingModel; ui: TradingUi }) {
  const a = m.payload.analysis;
  return (
    <GCard p={24} className="trd-g-reasoning" aria-labelledby="trd-g-reasoning">
      <GSectionHeader
        id="trd-g-reasoning"
        size={22}
        title={t('Agent reasoning')}
        caption={a ? `${t('Examined {n}', { n: a.examined })} · ${a.signals === 1 ? t('{n} signal', { n: a.signals }) : t('{n} signals', { n: a.signals })} · ${ago(a.at, m.now)}` : t('No run recorded')}
      />
      {!a ? (
        <GEmpty inline title={t('No analysis pushed yet.')} body={t('The agent writes here every run, whether or not it trades.')} />
      ) : (
        <>
          {a.notes && (
            <div className="trd-g-notes">
              <p>{a.notes}</p>
              {a.notes.length > 140 && (
                <GButton variant="sm" onClick={() => ui.setNotesOpen(true)}>
                  {t('More')}
                </GButton>
              )}
            </div>
          )}
          {a.rows.length > 0 ? (
            <GList divided label={t('Names the agent examined')}>
              {a.rows.slice(0, 6).map((r) => (
                <GRow
                  key={r.ticker}
                  title={<span className="trd-g-sym">{r.ticker}</span>}
                  meta={r.reason}
                  hint={r.score === null ? t('Not scored') : t('Score {score}', { score: r.score.toFixed(2) })}
                  trailing={<GTag tone={verdictTone(r.verdict)}>{enumLabel(r.verdict, 'verdict', cap(r.verdict))}</GTag>}
                />
              ))}
            </GList>
          ) : (
            <GEmpty inline title={t('The run listed no names.')} />
          )}
        </>
      )}
    </GCard>
  );
}

function TradeLog({ m, ui }: { m: TradingModel; ui: TradingUi }) {
  const c = m.payload.view.activityCounts;
  const rows = logRows(m, ui.log);
  const opts: { value: ActivityFilter; label: string }[] = [
    { value: 'all', label: `${t('All')} ${c.all}` },
    { value: 'agent', label: `${t('Agent')} ${c.agent}` },
    { value: 'you', label: `${t('You')} ${c.you}` },
    { value: 'rejected', label: `${t('Rejected')} ${c.rejected}` },
  ];
  return (
    <GCard p={24} className="trd-g-log" aria-labelledby="trd-g-log">
      <GSectionHeader
        id="trd-g-log"
        size={22}
        title={t('Trade log')}
        caption={c.all ? t('{done} of {total}', { done: rows.length, total: c.all }) : undefined}
        action={c.all ? <GSegmented label={t('Filter the trade log')} value={ui.log} onChange={ui.setLog} options={opts} className="trd-g-logseg" /> : undefined}
      />
      {c.all === 0 ? (
        <GEmpty inline title={t('No trades yet.')} body={t('Every order the agent or you place in a fed account lands here with its rationale.')} />
      ) : rows.length === 0 ? (
        <GEmpty inline title={t('Nothing matches this filter.')} />
      ) : (
        <GList divided label={t('Trades, newest first')}>
          {rows.map((trade) => (
            <GRow
              key={trade.id}
              onClick={() => ui.setOpenTrade(trade)}
              leading={<GTag tone={trade.action === 'buy' ? 'ok' : 'warn'}>{trade.action === 'buy' ? t('Buy') : t('Sell')}</GTag>}
              title={
                <span className="trd-g-trade-title">
                  <span className="trd-g-sym">
                    <span className="trd-g-act" data-side={trade.action}>{`${trade.action === 'buy' ? t('Buy') : t('Sell')} `}</span>
                    {tradeLine(trade)}
                  </span>
                  <GTag tone={statusTone[trade.status]} size="xs">
                    {statusLabel[trade.status]}
                  </GTag>
                </span>
              }
              meta={trade.rationale || t('No rationale given')}
              trailing={
                <span className="trd-g-stack trd-g-who">
                  <span>{whoOf(trade)}</span>
                  <span className="trd-g-muted">{ago(trade.at, m.now)}</span>
                </span>
              }
            />
          ))}
        </GList>
      )}
    </GCard>
  );
}

function TradeSheet({ trade: tr, onClose }: { trade: TradeActivity | null; onClose: () => void }) {
  return (
    <GSheet open={tr !== null} onClose={onClose} title={tr ? `${tr.action === 'buy' ? t('Buy') : t('Sell')} ${tr.symbol}` : ''} caption={tr ? stamp(tr.at) : undefined} width={560}>
      {tr && (
        <div className="trd-g-sheet">
          <GKeyValue
            items={[
              { label: t('Order'), value: tradeLine(tr) },
              { label: t('Notional'), value: usd(tr.quantity * tr.priceUsd, true) },
              { label: t('Status'), value: <GTag tone={statusTone[tr.status]}>{statusLabel[tr.status]}</GTag> },
              { label: t('Who'), value: whoOf(tr) },
              { label: t('Account'), value: tr.accountId === 'agentic' ? t('Agentic sleeve') : cap(tr.accountId) },
            ]}
          />
          <GWell>
            <p className="trd-g-rationale">{tr.rationale || t('No rationale given.')}</p>
          </GWell>
        </div>
      )}
    </GSheet>
  );
}

function OpenOrders({ orders, now }: { orders: TradingOrder[]; now: number }) {
  return (
    <GCard p={24} className="trd-g-orders" aria-labelledby="trd-g-orders">
      <GSectionHeader id="trd-g-orders" size={22} title={t('Open orders')} caption={orders.length ? t('{n} working', { n: orders.length }) : t('Nothing working')} />
      {orders.length === 0 ? (
        <GEmpty inline title={t('No live orders at the broker.')} />
      ) : (
        <GList divided label={t('Working orders')}>
          {orders.map((o) => (
            <GRow
              key={o.id}
              leading={<GTag tone={o.side === 'buy' ? 'ok' : 'warn'}>{o.side === 'buy' ? t('Buy') : t('Sell')}</GTag>}
              title={
                <span className="trd-g-sym">
                  {o.symbol} {o.dollarAmountUsd !== null ? usd(o.dollarAmountUsd, true) : `${qty(o.quantity)}${o.limitPriceUsd !== null ? ` @ ${usd(o.limitPriceUsd, true)}` : ''}`}
                </span>
              }
              meta={`${enumLabel(o.type, 'ordertype', cap(o.type))} · ${o.filledQuantity ? `${t('{n} filled', { n: qty(o.filledQuantity) })} · ` : ''}${o.placedAgent || t('Unknown')} · ${ago(o.createdAt, now)}`}
              trailing={<GTag>{enumLabel(o.state, 'order', cap(o.state))}</GTag>}
            />
          ))}
        </GList>
      )}
    </GCard>
  );
}

function Limits({ m, ui }: { m: TradingModel; ui: TradingUi }) {
  const L = ui.limits;
  return (
    <GCard p={24} className="trd-g-limits" aria-labelledby="trd-g-limits">
      <GSectionHeader id="trd-g-limits" size={22} title={t('Agent limits')} caption={m.limits.savedLabel} />
      <form
        className="trd-g-limits-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void L.save();
        }}
      >
        <div className="trd-g-fields">
          {m.limits.fields.map((f) => (
            <GField key={f.key} label={f.unit ? `${f.label} (${f.unit})` : f.label} hint={f.hint} error={L.fieldError(f.key)} htmlFor={`trd-g-${f.key}`}>
              <GInput
                id={`trd-g-${f.key}`}
                inputMode="decimal"
                value={L.values[f.key] ?? ''}
                placeholder={t('Not set')}
                invalid={Boolean(L.fieldError(f.key))}
                disabled={m.readOnly}
                title={m.readOnly ? (m.readOnlyReason ?? undefined) : t('{from} to {to}', { from: f.min.toLocaleString(localeTag()), to: f.max.toLocaleString(localeTag()) })}
                onChange={(e) => L.setValue(f.key, e.target.value)}
                onBlur={() => L.blur(f.key)}
              />
            </GField>
          ))}
        </div>
        <div className="trd-g-autopilot">
          <GToggle
            checked={ui.autopilot.on}
            onCheckedChange={(next) => void ui.autopilot.setAutopilot(next)}
            disabled={Boolean(ui.autopilot.reason) || ui.autopilot.switching}
            disabledReason={ui.autopilot.reason}
            aria-label={t('Autopilot')}
          >
            {t('Autopilot')}
          </GToggle>
          <p className="trd-g-muted">
            {ui.autopilot.on
              ? t('On: the Markets agent may place real orders inside these limits.')
              : t('Off: the daily run proposes and logs every order as a dry run; nothing reaches the broker.')}
          </p>
        </div>
        {L.saveError && (
          <GErrorLine align="left">{L.saveError}</GErrorLine>
        )}
        <div className="trd-g-save">
          <GButton variant="ink" type="submit" busy={L.saving} disabled={Boolean(L.saveReason)} disabledReason={L.saveReason}>
            {t('Save')}
          </GButton>
        </div>
      </form>
    </GCard>
  );
}
