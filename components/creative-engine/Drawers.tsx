'use client';

import { localeTag, t, tc } from '@/lib/i18n';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ResolvedRun } from '@/lib/creative-engine/runs';
import type { SavedAd } from '@/lib/foreplay/saved';
import type { WatchEntry } from '@/lib/foreplay/watchlist';
import type { Signal } from '@/lib/foreplay/signals';
import { api, type HealthSnapshot } from '@/components/creative-engine/api';
import { Drawer } from '@/components/creative-engine/Widget';
import { ErrorLine, ago, fmtMs } from '@/components/creative-engine/primitives';
import { fmtCredits } from '@/lib/creative-engine/format';
import { adpilotHref, proofLibrarySections, signalLink, PROOF_ROWS, type AdpilotLink } from '@/lib/adpilot-links';
import { GRow } from '@/components/g';
import { Btn, SetupLink, TextButton, useG } from '@/components/creative-engine/skin';
import { Tag } from '@/components/creative-engine/skin-dash';

const STATUS_COLOUR: Record<string, string> = { delivered: 'var(--p-green)', failed: 'var(--p-red)', stale: 'var(--p-red)', running: 'var(--p-orange)', queued: 'var(--p-dim)', abandoned: 'var(--p-dim)' };
export const SAMPLE_OFF = t('Sample data: actions are off');

/**
 * One run, the same row in the Runs tab and the Runs drawer (S04 B27, SPEC
 * C24). The title is a button that routes the run like the timeline pill
 * (S07 F15) when there is somewhere to go; the error wraps under the title
 * instead of squeezing it; Abandon sits on running and stale rows.
 */
export function RunRow({ run: r, readOnly = false, busy = false, focused = false, onOpen, onAbandon, openLabel }: { run: ResolvedRun; readOnly?: boolean; busy?: boolean; focused?: boolean; onOpen?: (r: ResolvedRun) => void; onAbandon?: (id: string) => void; openLabel?: string }) {
  const meta = `${t(r.kind)} · ${t(r.status)} · ${fmtMs(r.elapsedMs)} · ${t('started {ago}', { ago: ago(r.startedAt) })}${r.dry ? t(' · dry') : ''}${r.arcads?.creditsCharged != null ? ` · ${r.arcads.creditsCharged === 1 ? t('{n} credit', { n: fmtCredits(r.arcads.creditsCharged) }) : t('{n} credits', { n: fmtCredits(r.arcads.creditsCharged) })}` : ''}${r.foreplay ? ` · ${(r.foreplay.apiCalls === 1 ? t('{n} Foreplay call', { n: fmtCredits(r.foreplay.apiCalls) }) : t('{n} Foreplay calls', { n: fmtCredits(r.foreplay.apiCalls) }))}` : ''}`;
  const canAbandon = (r.status === 'stale' || r.status === 'running') && !!onAbandon;
  return (
    <li className="ae-card-3 ae-run-row flex items-start gap-3 p-4" data-run-id={r.id} data-focus={focused || undefined}>
      <span className={`ae-run-dot mt-1.5 h-[8px] w-[8px] shrink-0 rounded-full ${r.status === 'running' ? 'animate-pulse' : ''}`} data-status={r.status} style={{ background: STATUS_COLOUR[r.status] }} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {onOpen ? (
          <TextButton onClick={() => onOpen(r)} cClassName="ae-run-open block max-w-full truncate text-left text-[13.5px]" gClassName="ce-g-rowtitle" title={openLabel ?? r.title}>{r.title}</TextButton>
        ) : (
          <div className="truncate text-[13.5px]" title={r.title}>{r.title}</div>
        )}
        <div className="ae-cap">{meta}</div>
        {r.arcads?.lastStatus && r.status === 'running' && <div className="ae-faint">{t('Arcads says {status}', { status: r.arcads.lastStatus })}{r.arcads.lastPolledAt ? t(', checked {ago}', { ago: ago(r.arcads.lastPolledAt) }) : ''}</div>}
        {r.error && <div className="mt-1 whitespace-pre-wrap break-words text-[12px] text-[var(--p-red)]">{r.error}</div>}
      </div>
      {canAbandon && <Btn size="sm" onClick={() => onAbandon?.(r.id)} disabled={busy || readOnly} title={readOnly ? SAMPLE_OFF : t('Stop waiting on this run. Arcads may still finish it; nothing is refunded.')} className="shrink-0">{busy ? t('Abandoning') : t('Abandon')}</Btn>}
    </li>
  );
}

/** Check now and Abandon for a run list, shared by the tab and the drawer. */
export function useRunActions(campaignId: string | null, readOnly: boolean, onChange: (r: ResolvedRun[]) => void) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = async () => {
    if (readOnly) return;
    setBusy('refresh'); setError(null);
    try { onChange((await api.runs(campaignId)).runs); } catch { setError(t('Could not check the runs. Try again in a moment.')); } finally { setBusy(null); }
  };
  const abandon = async (id: string) => {
    if (readOnly) return;
    setBusy(id); setError(null);
    try { await api.abandon(id); onChange((await api.runs(campaignId)).runs); } catch { setError(t('Could not abandon that run.')); } finally { setBusy(null); }
  };
  return { busy, error, refresh, abandon };
}

export function CheckNow({ busy, readOnly, onClick }: { busy: boolean; readOnly: boolean; onClick: () => void }) {
  return <Btn size="sm" onClick={onClick} disabled={readOnly || busy} title={readOnly ? SAMPLE_OFF : t('Read the status of every run again now')} className="shrink-0">{busy ? t('Checking') : t('Check now')}</Btn>;
}

export function RunsDrawer({ runs: allRuns, campaignId, readOnly = false, onClose, onChange, focusRunIds, onOpenRun, kind = null, onAllKinds, backLabel }: { runs: ResolvedRun[]; campaignId: string | null; readOnly?: boolean; onClose: () => void; onChange: (r: ResolvedRun[]) => void; focusRunIds?: string[]; onOpenRun?: (r: ResolvedRun) => void; kind?: 'motion' | null; onAllKinds?: () => void; backLabel?: string }) {
  // the console's asset counter opens this on motion and image runs only (S05a G5)
  const runs = kind === 'motion' ? allRuns.filter((r) => r.kind === 'motion' || r.kind === 'image') : allRuns;
  const { busy, error, refresh, abandon } = useRunActions(campaignId, readOnly, onChange);
  // S07 F15, §7.5: opened from the timeline on one run (or a cluster), that run is ringed and scrolled to.
  const [onlyFocused, setOnlyFocused] = useState((focusRunIds?.length ?? 0) > 1);
  const focus = new Set(focusRunIds ?? []);
  const listRef = useRef<HTMLUListElement>(null);
  const firstFocus = focusRunIds?.[0];
  useEffect(() => {
    if (firstFocus) listRef.current?.querySelector(`[data-run-id='${CSS.escape(firstFocus)}']`)?.scrollIntoView({ block: 'center' });
  }, [firstFocus]);
  const shown = onlyFocused && focus.size ? runs.filter((r) => focus.has(r.id)) : runs;
  return (
    <Drawer title={kind === 'motion' ? t('Runs · motion') : t('Runs')} onClose={onClose} backLabel={backLabel}>
      {kind === 'motion' && onAllKinds && <div className="mb-3 flex items-center justify-between gap-3"><span className="ae-cap">{t('Showing motion and image runs.')}</span><Btn size="sm" onClick={onAllKinds}>{t('Show all runs')}</Btn></div>}
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="ae-cap">{t('Status is worked out on every read. Nothing here is marked done by the page.')}</span>
        <CheckNow busy={busy === 'refresh'} readOnly={readOnly} onClick={() => void refresh()} />
      </div>
      {error && <ErrorLine text={error} />}
      {runs.length === 0 && <p className="ae-cap">{t('No runs yet.')}</p>}
      {onlyFocused && focus.size > 0 && (
        <div className="mb-3 flex items-center justify-between gap-3" data-run-filter>
          <span className="ae-cap">{shown.length === 1 ? t('{n} run from the timeline', { n: fmtCredits(shown.length) }) : t('{n} runs from the timeline', { n: fmtCredits(shown.length) })}</span>
          <Btn size="sm" onClick={() => setOnlyFocused(false)}>{t('Show all')}</Btn>
        </div>
      )}
      {focus.size > 0 && runs.length > 0 && !runs.some((r) => focus.has(r.id)) && <p className="ae-cap mb-3">{t('That run is not in this list any more.')}</p>}
      <ul ref={listRef} className="space-y-2">
        {shown.map((r) => (
          // A row opens only where it leads somewhere other than this drawer.
          <RunRow key={r.id} run={r} readOnly={readOnly} busy={busy === r.id} focused={focus.has(r.id)} onOpen={onOpenRun && opensElsewhere(r) ? onOpenRun : undefined} openLabel={t('Open what this run made')} onAbandon={(id) => void abandon(id)} />
        ))}
      </ul>
    </Drawer>
  );
}

/** A delivered run with a campaign routes to its result; everything else lives in the Runs drawer (S07 F15). */
export function opensElsewhere(r: Pick<ResolvedRun, 'status' | 'campaignId' | 'kind'>): boolean {
  return r.kind === 'health' || (r.status === 'delivered' && r.campaignId !== null);
}

/**
 * Proof library (S04 B26): every row is a link into AdPilot, saved ads to the
 * ad, watched brands to the brand, signals to the ad they name else the brand
 * (lib/adpilot-links.ts; ACG2.3 is tests/adpilot-proof-links.test.ts).
 * Repeated signals within 24 hours collapse into one row with a count (X5).
 * Sample rows are fictional and not in AdPilot, so they are not links (§3.2).
 */
export function ProofDrawer({ saved, watchlist, signals, onClose, note = null, sample = false }: { saved: SavedAd[]; watchlist: WatchEntry[]; signals: Signal[]; onClose: () => void; note?: string | null; sample?: boolean }) {
  const g = useG();
  const sec = proofLibrarySections(saved, watchlist, signals);
  const more = (n: number) => (n > PROOF_ROWS && !sample ? <li><Btn size="sm" href="/adpilot">{t('Show all {n} in AdPilot', { n })}</Btn></li> : null);
  // Under the kit a linked row is a GRow (its text block is the link); sample rows are not links (§3.2).
  const row = (link: AdpilotLink, title: string, className: string, children: ReactNode) =>
    sample ? <div className={`ae-card-3 flex justify-between gap-3 p-3 ${className}`}>{children}</div>
      : g ? <ul className="ce-g-proof-row"><GRow title={<span className={`flex justify-between gap-3 ${className}`}>{children}</span>} href={adpilotHref(link)} hint={title} /></ul>
      : <a href={adpilotHref(link)} className={`ae-card-3 ae-proof-row flex justify-between gap-3 p-3 ${className}`} title={title}>{children}</a>;
  return (
    <Drawer title={t('Proof library')} onClose={onClose}>
      {note && <Tag className="mb-3">{note}</Tag>}
      <p className="ae-cap">{sample ? t('Sample rows: fictional brands and ads, not in AdPilot, so they do not open there.') : t('Saved winners, watched brands and recent signals from the AdPilot library. Picking an angle saves its proof ads here. Each row opens in AdPilot.')}</p>
      <h3 className="mt-5 text-[15px] font-light">{tc('list', 'Saved')} <span className="ae-faint">{sec.savedTotal}</span></h3>
      <ul className="mt-2 space-y-2">
        {sec.saved.map((s) => (
          <li key={s.ad.id}>{row({ kind: 'ad', id: s.ad.id }, t('Open this {brand} ad in AdPilot', { brand: s.ad.brand }), '', <><span className="min-w-0 truncate text-[13px]">{s.ad.brand}{s.ad.hook ? `, “${s.ad.hook.slice(0, 48)}”` : ''}</span><span className="ae-faint shrink-0 tabular-nums">{(s.ad.daysRunning === 1 ? t('{n} day', { n: fmtCredits(s.ad.daysRunning) }) : t('{n} days', { n: fmtCredits(s.ad.daysRunning) }))}</span></>)}</li>
        ))}
        {more(sec.savedTotal)}
        {sec.savedTotal === 0 && <li className="ae-cap">{t('Nothing saved yet.')}</li>}
      </ul>
      <h3 className="mt-5 text-[15px] font-light">{t('Watched brands')} <span className="ae-faint">{sec.watchTotal}</span></h3>
      <ul className="mt-2 space-y-2">
        {sec.watchlist.map((w) => (<li key={w.id}>{row({ kind: 'brand', id: w.id }, t('Open {name} on the AdPilot watchlist', { name: w.name }), 'text-[13px]', <><span className="min-w-0 truncate">{w.name}</span>{w.domain && <span className="ae-faint shrink-0">{w.domain}</span>}</>)}</li>))}
        {more(sec.watchTotal)}
        {sec.watchTotal === 0 && <li className="ae-cap">{t('No brands watched.')}</li>}
      </ul>
      <h3 className="mt-5 text-[15px] font-light">{t('Signals')} <span className="ae-faint">{sec.signalsTotal}</span></h3>
      <ul className="mt-2 space-y-2">
        {sec.signals.map((s) => (
          <li key={s.ids.join('|')}>
            {row(signalLink(s), s.adId ? t('Open the ad in AdPilot') : t('Open {name} in AdPilot', { name: s.brandName }), 'text-[12.5px] text-[var(--p-muted)]', <>
              <span className="min-w-0">{s.message}{s.count > 1 && <span className="ae-faint"> ×{s.count}</span>}</span>
              <span className="ae-faint shrink-0">{ago(s.at)}</span>
            </>)}
          </li>
        ))}
        {more(sec.signalsTotal)}
        {sec.signalsTotal === 0 && <li className="ae-cap">{t('No signals since the last sync.')}</li>}
      </ul>
    </Drawer>
  );
}

export function CreditsDrawer({ health, readOnly = false, onRefresh, onConnect, onClose, backLabel }: { health: HealthSnapshot; readOnly?: boolean; onRefresh: () => Promise<void>; onConnect: () => void; onClose: () => void; backLabel?: string }) {
  const [busy, setBusy] = useState(false);
  const [probeError, setProbeError] = useState<string | null>(null);
  const probe = async () => { if (readOnly) return; setBusy(true); setProbeError(null); try { await api.probe(); await onRefresh(); } catch (err) { setProbeError(err instanceof Error ? err.message : t('The checks did not answer.')); } finally { setBusy(false); } };
  const rows = Object.entries(health.arcads.health);
  const b = health.arcads.balance;
  return (
    <Drawer title={t('Credits & health')} onClose={onClose} backLabel={backLabel}>
      <div className="space-y-4">
        <section className="ae-card-3 p-4">
          <div className="text-[15px] font-light">Foreplay</div>
          <div className="mt-1 text-[13.5px]">{health.foreplay.configured ? (health.foreplay.remaining !== null ? t('{n} of {total} credits left', { n: health.foreplay.remaining.toLocaleString(localeTag()), total: health.foreplay.total?.toLocaleString(localeTag()) ?? '' }) : t('Connected, no usage read yet. Run one sync.')) : t('Not connected.')}</div>
          <div className="ae-faint">{t('Last sync {ago}', { ago: ago(health.foreplay.lastSyncAt) })}</div>
          {!health.foreplay.configured && <div className="mt-2"><SetupLink href={health.foreplay.setupHref} hint="FOREPLAY_API_KEY" /></div>}
        </section>
        <section className="ae-card-3 p-4">
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-light">Arcads</div>
            <Btn size="sm" onClick={onConnect}>{health.arcads.configured ? t('Settings') : t('Connect')}</Btn>
          </div>
          {health.arcads.configured ? (
            <div className="ae-kv-grid mt-2 text-[13px]">
              <div><span>{t('Balance')}</span><span>{b?.creditsRemaining != null ? t('{spent} of {cap}', { spent: fmtCredits(b.creditsRemaining), cap: b.creditsIncluded != null ? fmtCredits(b.creditsIncluded) : '—' }) : t('not read yet')}</span></div>
              <div><span>{t('Plan')}</span><span>{b?.plan ?? '—'}{b?.periodEnd ? t(', renews {date}', { date: new Date(b.periodEnd).toLocaleDateString(localeTag()) }) : ''}</span></div>
              <div><span>{t('This month')}</span><span>{health.arcads.creditsThisMonth === 1 ? t('{n} credit', { n: fmtCredits(health.arcads.creditsThisMonth) }) : t('{n} credits', { n: fmtCredits(health.arcads.creditsThisMonth) })}{t(' in {charges}', { charges: (health.arcads.ledgerEntries === 1 ? t('{n} charge', { n: fmtCredits(health.arcads.ledgerEntries) }) : t('{n} charges', { n: fmtCredits(health.arcads.ledgerEntries) })) })}</span></div>
              <div><span>{t('This session')}</span><span style={{ color: health.arcads.sessionSpent >= health.arcads.sessionCap ? 'var(--p-red)' : undefined }}>{t('{spent} of {cap} cap', { spent: fmtCredits(health.arcads.sessionSpent), cap: fmtCredits(health.arcads.sessionCap) })}</span></div>
              <div><span>{t('Product')}</span><span>{health.arcads.productName ?? t('first in the workspace')}</span></div>
              <div><span>{t('UGC path')}</span><span>{health.arcads.ugcPath === 'v2' ? t('talking actors v2') : t('script chain v1')}</span></div>
            </div>
          ) : (
            <div className="mt-1 text-[13.5px]">{t('Not connected.')}</div>
          )}
          <div className="ae-faint mt-2 leading-snug">{t('The balance is GET /v1/credits, read before every submit and after every delivery. Charges are the create reply when it prices itself, else the balance delta.')}</div>
          {!health.arcads.configured && <div className="mt-2"><SetupLink href={health.arcads.setupHref} hint="ARCADS_BASIC_AUTH" /></div>}
          <div className="mt-3 flex items-center gap-3">
            <Btn size="sm" onClick={probe} disabled={busy || readOnly || !health.arcads.configured} title={readOnly ? SAMPLE_OFF : !health.arcads.configured ? t('Connect Arcads first') : t('Sign-in, catalog and balance; free')}>{busy ? t('Checking') : t('Run the free checks')}</Btn>
            <span className="ae-faint">{t('Sign-in, catalog and balance. Model probes cost credits and run from Connect Arcads.')}</span>
          </div>
          {probeError && <ErrorLine text={probeError} />}
          <ul className="mt-3 space-y-1.5">
            {rows.length === 0 && <li className="ae-faint">{t('No checks recorded.')}</li>}
            {rows.map(([k, v]) => (<li key={k} className="flex items-center gap-2 text-[12.5px]"><span className="h-[7px] w-[7px] rounded-full" style={{ background: v.ok ? 'var(--p-green)' : 'var(--p-red)' }} /><span>{k}</span><span className="ae-faint min-w-0 truncate">{ago(v.lastProbeAt)}{v.error ? `, ${v.error}` : ''}</span></li>))}
          </ul>
        </section>
        <section className="ae-card-3 p-4">
          <div className="text-[15px] font-light">Claude</div>
          <div className="mt-1 text-[13.5px]">{health.claude.present ? t('Present, {version}.', { version: health.claude.version ?? t('version unknown') }) : t('Absent on this host. Research falls back to keyword searches; angles and scripts cannot run.')}</div>
        </section>
      </div>
    </Drawer>
  );
}
