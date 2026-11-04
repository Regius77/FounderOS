'use client';

/**
 * F9 under the Classic style (and Bennett Legacy, which renders this tree
 * under its skin): a Roster / Review tab strip, the Review list with Approve
 * and Reject, and the failover select for the agent work panel. `os-*`
 * tokens only. Same hooks as the GladOS presentation (AgentsFoG.tsx).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Badge } from '@/components/terminal';
import { outputTitle, type Deliverable, type ReviewView } from '@/lib/agent-review';
import { age, useFailover, useReview } from './hooks';
import { t } from '@/lib/i18n';

const CARD = 'rounded-lg-t border border-os-border bg-os-surface';
const BTN = 'cf-btn';

export function AgentsClassicTabs({ roster, review, pendingCount }: { roster: ReactNode; review: ReactNode; pendingCount: number }) {
  const [tab, setTabState] = useState<'roster' | 'review'>('roster');
  useEffect(() => {
    if (new URL(window.location.href).searchParams.get('tab') === 'review') setTabState('review');
  }, []);
  const setTab = (next: 'roster' | 'review') => {
    setTabState(next);
    const url = new URL(window.location.href);
    if (next === 'roster') url.searchParams.delete('tab');
    else url.searchParams.set('tab', next);
    window.history.replaceState(window.history.state, '', url);
  };
  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-os-border" role="tablist" aria-label={t('Agents view')}>
        {(['roster', 'review'] as const).map((tb) => (
          <button
            key={tb}
            type="button"
            role="tab"
            aria-selected={tab === tb}
            onClick={() => setTab(tb)}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-[13.5px] transition-colors ${
              tab === tb ? 'border-[var(--accent)] text-os-text' : 'border-transparent text-os-muted hover:text-os-text'
            }`}
          >
            {tb === 'roster' ? t('Roster') : t('Review')}
            {tb === 'review' && pendingCount > 0 && <span className="c-chip">{pendingCount}</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel">{tab === 'roster' ? roster : review}</div>
    </div>
  );
}

export function ReviewClassic({ initial, now }: { initial: ReviewView; now: number }) {
  const { pending, decided, busy, decide } = useReview(initial);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const reject = async (d: Deliverable) => {
    if (!reason.trim()) return;
    if (await decide(d, 'rejected', reason)) {
      setRejecting(null);
      setReason('');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className={`${CARD} p-5`} aria-label={t('Awaiting review')}>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-[16px] font-medium text-os-text">{t('Awaiting review')}</h2>
          <span className="font-mono text-[11.5px] text-os-muted">{t('{n} from the last 30 days', { n: pending.length })}</span>
        </div>
        {pending.length === 0 ? (
          <p className="text-[13px] text-os-muted">{t('Nothing to review. Finished agent runs with output land here until you approve or reject them.')}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-os-border">
            {pending.map((d) => (
              <li key={d.runId} className="flex flex-col gap-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] text-os-text">{outputTitle(d.summary)}</div>
                    <div className="mt-1 font-mono text-[11.5px] text-os-muted">
                      {d.agentName} · {age(d.finishedAt, now)}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" className={`${BTN} border-[var(--accent-line)] text-os-accent`} disabled={busy === d.runId} onClick={() => void decide(d, 'approved')}>
                      {t('Approve')}
                    </button>
                    <button
                      type="button"
                      className={BTN}
                      disabled={busy === d.runId}
                      aria-expanded={rejecting === d.runId}
                      onClick={() => {
                        setReason('');
                        setRejecting(rejecting === d.runId ? null : d.runId);
                      }}
                    >
                      {t('Reject')}
                    </button>
                  </div>
                </div>
                {rejecting === d.runId && (
                  <form
                    className="flex flex-wrap items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void reject(d);
                    }}
                  >
                    <input
                      autoFocus
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t('Why is it rejected?')}
                      aria-label={t('Rejection reason')}
                      className="h-8 min-w-[220px] flex-1 rounded-[7px] border border-os-border bg-os-bg px-2.5 text-[13px] text-os-text outline-none focus:border-[var(--accent-line)]"
                    />
                    <button type="submit" className={BTN} disabled={!reason.trim() || busy === d.runId} title={reason.trim() ? undefined : t('Say why first')}>
                      {t('Confirm reject')}
                    </button>
                    <button type="button" className={BTN} onClick={() => setRejecting(null)}>
                      {t('Cancel')}
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {decided.length > 0 && (
        <section className={`${CARD} p-5`} aria-label={t('Decided')}>
          <h2 className="mb-4 text-[16px] font-medium text-os-text">{t('Decided')}</h2>
          <ul className="flex flex-col divide-y divide-os-border">
            {decided.map((d) => (
              <li key={d.runId} className="flex flex-wrap items-baseline justify-between gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-os-text">{outputTitle(d.summary)}</div>
                  <div className="font-mono text-[11.5px] text-os-muted">
                    {d.agentName} · {age(d.at, now)}
                    {d.reason ? ` · ${d.reason}` : ''}
                  </div>
                </div>
                <Badge tone={d.decision === 'approved' ? 'ok' : 'err'}>{d.decision === 'approved' ? t('Approved') : t('Rejected')}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** The failover select in the Classic work panel: pick, confirm inline, PATCH. */
export function FailoverClassic({ agentId, agentName, model, options }: { agentId: string; agentName: string; model: string; options: string[] }) {
  const fo = useFailover(agentId, agentName, model);
  const [choice, setChoice] = useState(fo.model);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[12.5px] text-os-muted" htmlFor={`fo-model-${agentId}`}>
          {t('Model')}
        </label>
        <select
          id={`fo-model-${agentId}`}
          value={choice}
          onChange={(e) => {
            setChoice(e.target.value);
            setConfirming(false);
          }}
          className="h-8 min-w-0 max-w-full flex-1 rounded-[7px] border border-os-border bg-os-bg px-2 text-[12.5px] text-os-text"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o === 'builtin' ? t('builtin (its own code path)') : o}
            </option>
          ))}
        </select>
        <button type="button" className="cf-btn" disabled={choice === fo.model || fo.busy} title={choice === fo.model ? t('Pick a different model first') : undefined} onClick={() => setConfirming(true)}>
          {t('Switch')}
        </button>
      </div>
      {confirming && (
        <div role="alertdialog" aria-label="Confirm failover" className="flex flex-wrap items-center gap-2 rounded-[8px] border border-os-border bg-os-bg p-2.5 text-[12.5px] text-os-text">
          <span className="min-w-0 flex-1">
            {t('Move {name} from {from} to {to}? Its next chat runs on it; logged to run history.', { name: agentName, from: fo.model || t('its default model'), to: choice })}
          </span>
          <button
            type="button"
            className="cf-btn"
            disabled={fo.busy}
            onClick={async () => {
              if (await fo.switchTo(choice)) setConfirming(false);
            }}
          >
            {t('Confirm')}
          </button>
          <button type="button" className="cf-btn" onClick={() => setConfirming(false)}>
            {t('Cancel')}
          </button>
        </div>
      )}
    </div>
  );
}
