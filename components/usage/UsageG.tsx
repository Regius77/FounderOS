'use client';

import { useState } from 'react';
import {
  GButton,
  GCard,
  GCardRaised,
  GDotNumber,
  GDriverBars,
  GEmpty,
  GErrorLine,
  GHeroCard,
  GKeyValue,
  GLegend,
  GList,
  GPage,
  GRingGauge,
  GRow,
  GSampleBadge,
  GSectionHeader,
  GSegmented,
  GSheet,
  GSparkline,
  GStackedBar,
  GTag,
  type GTagTone,
  type VizColor,
} from '@/components/g';
import type { UsagePlan } from '@/lib/schemas';
import type { UsagePayload } from '@/lib/usage-payload';
import { USAGE_SUBTITLE, USAGE_TITLE, fmtTokens, type PlanCardView, type UsageReadyView } from '@/lib/usage-view';
import { setupHrefFor } from '@/lib/integrations-catalog';
import { pushUrl, useUsage } from './use-usage';
import { t } from '@/lib/i18n';

/**
 * /usage under the GladOS style (pages/usage.md §6): a hero with this
 * machine's lanes, the daily burn stacked per plan, burn by model, official
 * gauges only, and one raised card per plan that opens its detail sheet.
 * Everything it shows comes from lib/usage-view.ts.
 */

const RANGES = [
  { value: '7', label: t('{n} d', { n: 7 }), title: t('Last 7 days') },
  { value: '30', label: t('{n} d', { n: 30 }), title: t('Last 30 days') },
] as const;

const series = (slot: 1 | 2 | 3): VizColor => `series-${slot}`;

function CopyPushUrl({ path, variant = 'sm' }: { path: string; variant?: 'sm' | 'default' }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  return (
    <GButton
      variant={variant}
      title={t('POST readings here with Authorization: Bearer <USAGE_PUSH_TOKEN> ({path})', { path })}
      onClick={async () => {
        try {
          if (!navigator.clipboard) throw new Error('no clipboard');
          await navigator.clipboard.writeText(pushUrl(path));
          setState('copied');
        } catch {
          setState('failed');
        }
        window.setTimeout(() => setState('idle'), 1800);
      }}
    >
      {state === 'copied' ? t('Copied') : state === 'failed' ? t('Copy failed') : t('Copy push URL')}
    </GButton>
  );
}

function PlanSheet({ plan, view, onClose }: { plan: PlanCardView; view: UsageReadyView; onClose: () => void }) {
  const d = plan.detail;
  return (
    <GSheet
      open
      onClose={onClose}
      title={plan.label}
      caption={`${plan.total === 'Not reported' ? t('Not reported') : t('{n} tokens', { n: plan.total })} · ${view.rangeLabel}`}
      width={880}
      footer={<CopyPushUrl path={view.push.path} variant="default" />}
      className="us-sheet"
    >
      <div className="us-sheet-grid">
        <section className="us-sheet-sec" aria-labelledby="us-sh-days">
          <h3 id="us-sh-days" className="us-sheet-h">
            {t('Per day')}
          </h3>
          {d.days ? (
            <GStackedBar
              label={t('{label} burn per day, {range}', { label: plan.label, range: view.rangeLabel })}
              columns={d.days.map((x) => ({
                id: x.id,
                label: x.label,
                parts: [x.burn],
              }))}
              keys={[{ id: plan.plan, label: plan.label, color: series(plan.slot) }]}
              height={120}
              formatValue={fmtTokens}
              emptyText={t('No burn in this window.')}
            />
          ) : (
            <GEmpty inline title={t('Not reported')} body={t('No machine reported this plan in the window.')} />
          )}
        </section>
        <section className="us-sheet-sec" aria-labelledby="us-sh-lanes">
          <h3 id="us-sh-lanes" className="us-sheet-h">
            {t('Lanes')}
          </h3>
          {d.lanes ? (
            <GDriverBars
              rows={d.lanes.map((l) => ({
                id: l.id,
                label: l.label,
                value: l.burn,
                display: l.display,
              }))}
              labelWidth={132}
              label={t('{label} burn by lane', { label: plan.label })}
              emptyText={t('No burn in this window.')}
            />
          ) : null}
          <p className="us-note">{d.lanesNote}</p>
        </section>
        <section className="us-sheet-sec" aria-labelledby="us-sh-machines">
          <h3 id="us-sh-machines" className="us-sheet-h">
            {t('Machines')}
          </h3>
          {d.machines.length ? (
            <GList divided label={t('{label} machines', { label: plan.label })}>
              {d.machines.map((m) => (
                <GRow
                  key={m.machine}
                  title={m.machine}
                  meta={`${m.sourceLabel} · ${m.age}`}
                  trailing={
                    <span className="us-row-trail">
                      {m.stale && (
                        <GTag tone="warn" size="xs">
                          {t('Stale')}
                        </GTag>
                      )}
                      <span className="us-num">{m.burn}</span>
                    </span>
                  }
                  hint={m.title}
                />
              ))}
            </GList>
          ) : (
            <p className="us-note">{t('No machine has reported this plan. Another machine can push its readings to {path}.', { path: view.push.path })}</p>
          )}
        </section>
        <section className="us-sheet-sec" aria-labelledby="us-sh-windows">
          <h3 id="us-sh-windows" className="us-sheet-h">
            {t('Windows')}
          </h3>
          {d.windows.length ? (
            <GKeyValue
              items={d.windows.map((w) => ({
                key: w.id,
                label: w.label,
                value: `${t('{pct}% used', { pct: Math.round(w.used) })}${w.resets ? ` · ${w.resets}` : ''}`,
                title: w.title,
              }))}
            />
          ) : (
            <p className="us-note">{t('No provider reported an official window for this plan.')}</p>
          )}
        </section>
      </div>
    </GSheet>
  );
}

function PlanCard({ p, onOpen }: { p: PlanCardView; onOpen: () => void }) {
  const tone: GTagTone = p.status?.tone ?? 'neutral';
  return (
    <GCardRaised p={20} onClick={onOpen} title={t('{label}: open the plan detail', { label: p.label })} className="us-plan">
      <span className="us-plan-head">
        <span className="us-plan-name">
          <i className="us-key" data-slot={p.slot} aria-hidden />
          {p.label}
        </span>
        {p.status && (
          <GTag tone={tone} dot size="xs">
            {p.status.text}
          </GTag>
        )}
      </span>
      <span className="us-plan-num">
        {p.reported ? <GDotNumber value={p.total} size={5} label={t('{label}: {n} tokens', { label: p.label, n: p.total })} /> : <span className="us-notrep">{t('Not reported')}</span>}
      </span>
      <span className="us-plan-spark">
        {p.spark ? <GSparkline values={p.spark} color={series(p.slot)} label={t('{label} burn per day', { label: p.label })} height={28} /> : <span className="us-spark-none" aria-hidden />}
      </span>
      <span className="us-plan-meta">{p.meta}</span>
    </GCardRaised>
  );
}

function Ready({ v, hidden, toggle }: { v: UsageReadyView; hidden: string[]; toggle: (id: string) => void }) {
  const [open, setOpen] = useState<UsagePlan | null>(null);
  const plan = open ? (v.plans.find((p) => p.plan === open) ?? null) : null;
  return (
    <>
      <div className="us-top">
        <GHeroCard
          variant="a"
          caption={v.hero.caption}
          value={v.hero.value}
          label={v.hero.label}
          title={v.hero.title}
          status={v.hero.status}
          strip={<GSparkline values={v.burnChart.columns.map((c) => c.total)} onHero label={t('Burn per day, {range}', { range: v.rangeLabel })} height={28} />}
        />
        <GCard as="section" p={24} aria-labelledby="us-burn" className="us-burn">
          <GSectionHeader
            size={22}
            id="us-burn"
            title={t('Token burn')}
            caption={v.burnChart.caption}
            action={
              v.empty ? undefined : (
                <GLegend
                  label={t('Plans in the chart')}
                  items={v.burnChart.keys.map((k) => ({
                    id: k.id,
                    label: k.label,
                    color: series(k.slot),
                    on: !hidden.includes(k.id),
                  }))}
                  onToggle={toggle}
                />
              )
            }
          />
          {v.empty ? (
            <GEmpty title={t('No burn in this window.')} body={t('Daily burn per plan appears here once Claude Code or Codex runs on a reporting machine.')} />
          ) : (
            <>
              <GStackedBar
                label={t('Token burn per day by plan, {range}', { range: v.rangeLabel })}
                columns={v.burnChart.columns.map((c) => ({
                  id: c.id,
                  label: c.label,
                  parts: c.parts,
                }))}
                keys={v.burnChart.keys.map((k) => ({
                  id: k.id,
                  label: k.label,
                  color: series(k.slot),
                }))}
                hiddenKeys={hidden}
                height={136}
                formatValue={fmtTokens}
              />
            </>
          )}
        </GCard>
      </div>

      <div className="us-mid">
        <GCard as="section" p={24} aria-labelledby="us-lanes">
          <GSectionHeader size={22} id="us-lanes" title={t('Burn volume')} caption={v.lanes.rows ? t('By lane on {machine}', { machine: v.lanes.machine ?? '' }) : t('By lane')} />
          {v.lanes.rows ? (
            <GDriverBars
              rows={v.lanes.rows.map((l) => ({
                id: l.id,
                label: l.label,
                value: l.burn,
                display: l.display,
              }))}
              labelWidth={132}
              label={t('Burn by lane on {machine}', { machine: v.lanes.machine ?? '' })}
            />
          ) : (
            <GEmpty inline title={t('Lanes not reported')} body={t('No transcript folder on this machine. Pushed machines report totals only.')} />
          )}
          <p className="us-note">{t('Agent board, your Superset sessions, plain terminals, and crons or headless runs.')}</p>
        </GCard>
        <GCard as="section" p={24} aria-labelledby="us-models">
          <GSectionHeader size={22} id="us-models" title={t('Burn by model')} caption={v.models.caption} />
          {v.models.rows.length ? (
            <GDriverBars
              rows={v.models.rows.slice(0, 6).map((m) => ({
                id: m.id,
                label: m.label,
                value: m.burn,
                display: m.display,
                tone: series(m.plan === 'claude' ? 1 : m.plan === 'codex' ? 2 : 3),
              }))}
              labelWidth={132}
              label={t('Burn by model')}
            />
          ) : (
            <GEmpty inline title={t('No model burn in this window.')} body={t("Each model's share appears once a plan reports burn.")} />
          )}
        </GCard>
        <GCard as="section" p={24} aria-labelledby="us-limits">
          <GSectionHeader size={22} id="us-limits" title={t('Plan limits')} caption={t('Official gauges only')} />
          {v.limits.gauges.length ? (
            <div className="us-gauges">
              {v.limits.gauges.map((g) => (
                <div key={g.id} className="us-gauge" title={g.title}>
                  <GRingGauge value={g.used} max={100} label={g.label} format={(n) => `${Math.round(n)}%`} scaleCaption={t('used')} size={112} />
                  <span className="us-gauge-label">{g.label}</span>
                  <span className="us-note">{g.resets ?? g.caption}</span>
                </div>
              ))}
            </div>
          ) : (
            <GEmpty
              inline
              title={v.limits.note}
              body={t('A percentage appears here only when Claude or Codex reports one. Burn is measured from transcripts, not against a guessed limit.')}
            />
          )}
        </GCard>
      </div>

      <section className="us-plans-sec" aria-labelledby="us-plans">
        <GSectionHeader
          size={22}
          id="us-plans"
          title={t('Plans')}
          caption={
            v.topBurner
              ? t('Top burner: {machine} on {plan}, {share} {caption}', { machine: v.topBurner.machine, plan: v.topBurner.planLabel, share: v.topBurner.share, caption: v.topBurner.caption })
              : t('Open a plan for its lanes, machines and windows')
          }
        />
        <div className="us-plans">
          {v.plans.map((p) => (
            <PlanCard key={p.plan} p={p} onOpen={() => setOpen(p.plan)} />
          ))}
        </div>
      </section>

      <p className="us-foot">
        {v.footnote} {t('Read {ago}.', { ago: v.readAgo })}
      </p>
      {plan && <PlanSheet plan={plan} view={v} onClose={() => setOpen(null)} />}
    </>
  );
}

export function UsageG({ initial, initialNow, sample }: { initial: UsagePayload; initialNow: number; sample: boolean }) {
  const { data, view, range, setRange, error, lastGoodAgo, retry } = useUsage(initial, initialNow, sample);
  const [raw, setRaw] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const toggle = (id: string) => setHidden((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));
  const showSample = view.kind === 'ready' ? view.sample : view.kind === 'off' && view.filming;

  return (
    <GPage className="us-page">
      <GSectionHeader
        size="page"
        title={USAGE_TITLE}
        caption={USAGE_SUBTITLE}
        action={
          <span className="us-actions">
            {showSample && <GSampleBadge fixture={view.kind === 'off' ? t('Filming mode: Usage is off') : 'lib/fo-sample.ts sampleUsageReadings'} />}
            {view.kind === 'ready' && (
              <GSegmented
                label={t('Range')}
                size="sm"
                options={RANGES.map((r) => ({
                  value: r.value,
                  label: r.label,
                  title: r.title,
                }))}
                value={String(range) as '7' | '30'}
                onChange={(r) => setRange(r === '30' ? 30 : 7)}
              />
            )}
            {view.kind !== 'off' && (
              <GButton variant="sm" onClick={() => setRaw(true)}>
                {t('Raw reading')}
              </GButton>
            )}
          </span>
        }
      />

      {error && view.kind !== 'off' && (
        <GErrorLine align="left" onRetry={retry}>
          {t('Refresh failed ({error}).', { error })} {lastGoodAgo ? t('Showing the reading from {ago}.', { ago: lastGoodAgo }) : ''}
        </GErrorLine>
      )}

      {view.kind === 'off' ? (
        <GCard p={24}>
          <GEmpty title={view.title} body={view.body} />
        </GCard>
      ) : view.kind === 'unconfigured' ? (
        <div className="us-unconf">
          <GCard p={24}>
            <GEmpty kind="unconfigured" title={view.title} body={view.body} setupHref={setupHrefFor('usage')} setupHint={view.setupHint} />
          </GCard>
          <GCard as="section" p={24} aria-labelledby="us-sources">
            <GSectionHeader size={22} id="us-sources" title={t('Sources checked')} caption={t('On this machine, read locally, nothing sent anywhere')} />
            <GKeyValue
              items={[
                ...view.checks.map((c) => ({
                  key: c.label,
                  label: c.label,
                  value: (
                    <GTag tone={c.ok ? 'ok' : 'neutral'} dot size="xs">
                      {c.value}
                    </GTag>
                  ),
                })),
                {
                  key: 'ollama',
                  label: 'Ollama',
                  value: (
                    <GTag tone={view.ollama.up ? 'ok' : 'err'} dot size="xs">
                      {view.ollama.text}
                    </GTag>
                  ),
                },
                {
                  key: 'push',
                  label: t('Push URL'),
                  value: <span className="us-path">{view.push.path}</span>,
                },
              ]}
            />
            <div className="us-unconf-act">
              <CopyPushUrl path={view.push.path} />
            </div>
          </GCard>
        </div>
      ) : (
        <Ready v={view} hidden={hidden} toggle={toggle} />
      )}

      <GSheet
        open={raw}
        onClose={() => setRaw(false)}
        title={t('Raw reading')}
        caption={t('The /api/usage payload this page renders')}
        width={880}
        footer={<GButton onClick={() => setRaw(false)}>{t('Close')}</GButton>}
      >
        <pre className="us-raw" data-mono-ok="">
          {JSON.stringify(data, null, 2)}
        </pre>
      </GSheet>
    </GPage>
  );
}
