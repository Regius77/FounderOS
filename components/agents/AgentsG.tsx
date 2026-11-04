'use client';

import { useEffect, useMemo, useState } from 'react';
import { GAsk, GButton, GChip, GEmpty, GHeroCard, GPage, GSectionHeader, GSegmented, GSparkline, GTabs } from '@/components/g';
import { ReviewG } from '@/components/agents-fo/AgentsFoG';
import type { ReviewView } from '@/lib/agent-review';
import { openWizard } from '@/lib/wizard-dock';
import type { AgentDirectory } from '@/lib/agent-directory';
import type { DeptFilter } from '@/lib/agent-dept';
import { AgentCard } from './AgentCard';
import { AgentSheetHost } from './AgentSheet';
import { openAgentSheet } from './agent-param';
import { t, localeTag } from '@/lib/i18n';

/**
 * /agents under the GladOS style (glados-ui SPEC S04 §4.1, X5). Same data as
 * the Classic tree, presentation only: two heroes (Fleet, Runs) replace the
 * five tiles; the face wall, the inline Wizard chat and the per-card
 * chat/work panels are gone (F-A3, F0.1, F-A4); every card opens the one
 * AgentSheet through `?agent=` (F0.3). The ask box hands its text to the
 * global Wizard dock (GP2) instead of running a third chat.
 */
export type AgentsRunStats = {
  runs7d: number;
  ok7d: number;
  daily30: number[];
  lifetime: number;
  lastRunAge: string | null;
};

type Filter = 'all' | 'active' | 'setup';

function readFilter(): Filter {
  if (typeof window === 'undefined') return 'all';
  const f = new URL(window.location.href).searchParams.get('filter');
  return f === 'active' || f === 'setup' ? f : 'all';
}

export function AgentsG({ dir, stats, review, now, dept: deptProp = null }: { dir: AgentDirectory; stats: AgentsRunStats; review?: ReviewView; now?: number; dept?: DeptFilter }) {
  const [filter, setFilterState] = useState<Filter>('all');
  // ?dept= (the Social content crew card): one department; clearing drops it from the URL
  const [dept, setDept] = useState<DeptFilter>(deptProp);
  const clearDept = () => {
    setDept(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('dept');
    window.history.replaceState(window.history.state, '', url);
  };
  // F9: the Review tab (deliverables awaiting a decision), mirrored in `?tab=`.
  const [tab, setTab] = useState<'agents' | 'review'>('agents');
  useEffect(() => {
    if (new URL(window.location.href).searchParams.get('tab') === 'review') setTab('review');
  }, []);
  const [ask, setAsk] = useState('');
  useEffect(() => setFilterState(readFilter()), []);
  const setFilter = (f: Filter) => {
    setFilterState(f);
    const url = new URL(window.location.href);
    if (f === 'all') url.searchParams.delete('filter');
    else url.searchParams.set('filter', f);
    window.history.replaceState(window.history.state, '', url);
  };

  const setupSet = useMemo(() => new Set(dir.setupIds), [dir.setupIds]);
  const total = dir.agents.length;
  const activeCount = dir.agents.filter((a) => a.status === 'active').length;
  const shown = dir.agents.filter(
    (a) =>
      (filter === 'active' ? a.status === 'active' : filter === 'setup' ? setupSet.has(a.id) : true) &&
      (!dept || (dept.department != null && a.departmentId === dept.department.id)),
  );
  const okPct = stats.runs7d > 0 ? Math.round((stats.ok7d / stats.runs7d) * 100) : null;
  const runsStatus =
    stats.runs7d > 0
      ? t('runs · 7 days · {pct}% ok', { pct: okPct ?? 0 })
      : stats.lastRunAge
        ? t('runs · 7 days · last run {age}', { age: stats.lastRunAge })
        : t('no runs recorded');

  return (
    <GPage className="wg-page">
      <GSectionHeader
        size="page"
        title={t('Agents')}
        caption={t('{n} agents · {runs} runs all time', { n: total, runs: stats.lifetime.toLocaleString(localeTag()) })}
        action={
          <div className="wg-head-actions">
            <GAsk
              className="wg-head-ask"
              value={ask}
              onValueChange={setAsk}
              label={t('Ask the Wizard')}
              placeholder={t('Ask the Wizard')}
              onSubmit={(text) => {
                openWizard({ text, source: 'agents-ask' });
                setAsk('');
              }}
            />
            {dir.setupIds.length > 0 && (
              <GButton onClick={() => setFilter(filter === 'setup' ? 'all' : 'setup')} aria-pressed={filter === 'setup'}>
                {t('Set up {n}', { n: dir.setupIds.length })}
              </GButton>
            )}
          </div>
        }
      />

      {review && (
        <GTabs
          className="wg-cf-tabs"
          label={t('Agents view')}
          param="tab"
          value={tab}
          onChange={(v) => setTab(v === 'review' ? 'review' : 'agents')}
          tabs={[
            { value: 'agents', label: t('Agents'), controls: 'wg-af-panel' },
            { value: 'review', label: review.pending.length > 0 ? t('Review {n}', { n: review.pending.length }) : t('Review'), controls: 'wg-af-panel' },
          ]}
        />
      )}

      {review && tab === 'review' ? (
        <div id="wg-af-panel" role="tabpanel">
          <ReviewG initial={review} avatars={dir.avatars} now={now ?? Date.now()} />
        </div>
      ) : total === 0 ? (
        <GEmpty
          title={t('No agents yet')}
          body={t('Describe the agent you want in a Wizard session and it gets designed with you.')}
          action={{ label: t('Ask the Wizard to design one'), onClick: () => openWizard({ text: 'Design a new agent that ', source: 'agents-empty' }) }}
        />
      ) : (
        <>
          <div className="wg-hero-row">
            <GHeroCard
              variant="a"
              caption={t('Fleet')}
              value={`${activeCount}/${total}`}
              label={t('{a} of {b} agents active', { a: activeCount, b: total })}
              status={t('active agents')}
              title={t('Agents with status active, of every agent in the roster. Click to show only active agents.')}
              onClick={() => setFilter('active')}
            />
            <GHeroCard
              variant="b"
              caption={t('Runs')}
              value={stats.runs7d}
              label={t('{n} runs in the last 7 days', { n: stats.runs7d })}
              status={runsStatus}
              title={t('Agent runs started in the last 7 days (agent_runs). Opens run outcomes on Tasks.')}
              href="/tasks?range=7d#outcomes"
              strip={<GSparkline values={stats.daily30} label={t('Runs per day · last 30 days')} onHero />}
            />
          </div>

          <GSegmented<Filter>
            className="wg-fit"
            label={t('Show agents')}
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: t('All {n}', { n: total }) },
              { value: 'active', label: t('Active {n}', { n: activeCount }) },
              { value: 'setup', label: t('Needs setup {n}', { n: dir.setupIds.length }), disabled: dir.setupIds.length === 0, title: dir.setupIds.length === 0 ? t('Every agent with a setup guide is wired') : undefined },
            ]}
          />

          {dept && (
            <div className="wg-fit" data-dept-filter={dept.department?.id ?? ''}>
              <GChip pressed onPressedChange={clearDept} title={t('Show every department')}>
                {dept.department ? dept.department.name : t('No department “{param}”', { param: dept.param })} · {shown.length}
              </GChip>
            </div>
          )}
          {shown.length === 0 && <GEmpty inline title={dept && !dept.department ? t('No department matches “{param}”', { param: dept.param }) : t('No agents match this filter')} />}
          {dir.departments.map((dept) => {
            const list = shown.filter((a) => a.departmentId === dept.id);
            if (list.length === 0) return null;
            return (
              <section key={dept.id} className="wg-dept">
                <GSectionHeader size={22} title={`${dept.name} · ${list.length}`} caption={dept.tagline || undefined} />
                <div className="wg-roster">
                  {list.map((a) => (
                    <AgentCard key={a.id} agent={a} avatar={dir.avatars[a.id]} runs={dir.runsByAgent[a.id] ?? []} setup={setupSet.has(a.id)} onOpen={() => openAgentSheet(a.id)} />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
      <AgentSheetHost dir={dir} />
    </GPage>
  );
}
