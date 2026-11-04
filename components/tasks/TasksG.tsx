'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import {
  GAreaChart,
  GBarChart,
  GButton,
  GCard,
  GCheck,
  GChip,
  GDelta,
  GDotNumber,
  GEmpty,
  GHeroCard,
  GInput,
  GList,
  GPage,
  GRow,
  GSearch,
  GSectionHeader,
  GSegmented,
  GStat,
  GTable,
  GTag,
  useToast,
  type GColumn,
} from '@/components/g';
import {
  HORIZONS,
  MIN_PREV_TASKS,
  TASK_RANGES,
  activityByWeekday,
  formatRuntime,
  outcomeTrend,
  rangeContaining,
  sinceText,
  taskOverview,
  taskStats,
  todoGroups,
  TASK_STATUS_LABEL,
  type LinkedTask,
  workloadRows,
  type Grain,
  type RangeId,
  type WorkloadRow,
} from '@/lib/tasks-metrics';
import type { AgentDirectory } from '@/lib/agent-directory';
import type { AgentRun, AgentTask } from '@/lib/schemas';
import { AgentSheetHost } from '@/components/agents/AgentSheet';
import { openAgentSheet } from '@/components/agents/agent-param';
import { TimeGrid } from './TimeGrid';
import { localeTag, t, tc } from '@/lib/i18n';

/**
 * /tasks under the GladOS style (glados-ui SPEC S04 §4.3, X5). Same data and
 * the same /api/agents/work calls as the Classic TasksView; presentation and
 * the honest fixes only: two heroes for the numbers that ask the operator to
 * act, small-base deltas hidden (F-T3), one schedule surface (F-T5), the
 * board with a 5 s Undo before a completion is sent (F-T6, AC04.16), an
 * anchored add popover instead of window.prompt (AC04.15), and one Run
 * outcomes card on the page range with honest empty copy (F-T8).
 */
const UNDO_MS = 5000;
const RANGE_LABEL: Record<RangeId, string> = { '7d': '7d', '30d': '30d', '90d': '90d', '12mo': '1y' };
const LOAD_TONE = { low: 'ok', medium: 'warn', high: 'err' } as const;

type RailFilter = { kind: 'blocked' | 'overdue' } | { kind: 'day'; key: string; label: string } | { kind: 'task'; id: string } | null;

export function TasksG({
  tasks,
  runs,
  dir,
  rangeId,
  rangeDays,
  rangeLabel,
  now,
  linked = null,
}: {
  /** ?task=<id> (Home's Needs you, the composer): the board opens filtered to this task */
  linked?: LinkedTask;
  tasks: AgentTask[];
  runs: AgentRun[];
  dir: AgentDirectory;
  rangeId: RangeId;
  rangeDays: number;
  rangeLabel: string;
  now: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { toast } = useToast();

  const agents = dir.agents;
  const stats = useMemo(() => taskStats(tasks, runs, rangeDays, now), [tasks, runs, rangeDays, now]);
  const rows = useMemo(() => workloadRows(tasks, agents, dir.departments), [tasks, agents, dir.departments]);
  const activity = useMemo(() => activityByWeekday(runs, rangeDays, now), [runs, rangeDays, now]);
  const trend = useMemo(() => outcomeTrend(runs, rangeDays, now), [runs, rangeDays, now]);
  const agentNames = useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a.name])), [agents]);

  // open on the finest grain that has something to show (the daily window is short)
  const [grain, setGrain] = useState<Grain>(() => (['daily', 'monthly', 'yearly'] as Grain[]).find((g) => taskOverview(tasks, g, now).some((b) => b.completed + b.pending > 0)) ?? 'daily');
  const overview = useMemo(() => taskOverview(tasks, grain, now), [tasks, grain, now]);

  const [filter, setFilterState] = useState<RailFilter>(() => (linked ? { kind: 'task', id: linked.id } : null));
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => () => timers.current.forEach((tk) => clearTimeout(tk)), []);
  const board = useRef<HTMLDivElement>(null);
  // a deep link lands on the board, not the top of the page
  const linkedId = linked?.id ?? null;
  useEffect(() => {
    if (!linkedId) return;
    setFilterState({ kind: 'task', id: linkedId });
    board.current?.scrollIntoView({ block: 'start' });
  }, [linkedId]);
  // leaving a linked task also drops ?task from the URL, so a reload does not reopen it
  const setFilter = (f: RailFilter) => {
    if (filter?.kind === 'task' && f?.kind !== 'task' && params?.get('task')) {
      const next = new URLSearchParams(params.toString());
      next.delete('task');
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }
    setFilterState(f);
  };

  const setRange = (id: RangeId) => {
    const next = new URLSearchParams(params?.toString() ?? '');
    next.set('range', id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const showRail = (f: RailFilter) => {
    setFilter(f);
    board.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Complete with a 5 s Undo window: the row hides at once, the PATCH fires only when the window closes.
  const complete = (tk: AgentTask) => {
    setHidden((h) => new Set(h).add(tk.id));
    const timer = setTimeout(async () => {
      timers.current.delete(tk.id);
      await fetch('/api/agents/work', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'task', id: tk.id, status: 'done' }),
      }).catch(() => null);
      router.refresh();
    }, UNDO_MS);
    timers.current.set(tk.id, timer);
    toast({
      text: t('Completed “{name}”', { name: tk.title }),
      tone: 'ok',
      ms: UNDO_MS,
      action: {
        label: t('Undo'),
        onClick: () => {
          const tm = timers.current.get(tk.id);
          if (tm) clearTimeout(tm);
          timers.current.delete(tk.id);
          setHidden((h) => {
            const n = new Set(h);
            n.delete(tk.id);
            return n;
          });
        },
      },
    });
  };

  const create = async (title: string, horizon: string | null, dueAt: string | null) => {
    await fetch('/api/agents/work', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'task', title, ownerKind: 'me', agentId: null, horizon, dueAt }),
    }).catch(() => null);
    router.refresh();
  };

  const live = tasks.filter((tk) => !hidden.has(tk.id));
  const runtimeText = stats.runtimeMs && stats.runsInWindow > 0 ? formatRuntime(stats.runtimeMs.value) : null;
  const wl = t(rangeLabel).toLowerCase();

  return (
    <GPage className="wg-page">
      <GSectionHeader
        size="page"
        title={t('Tasks')}
        caption={t('Agent work across the board · {range}', { range: wl })}
        action={
          <div className="wg-head-actions">
            <GSegmented<RangeId> label={t('Range')} value={rangeId} onChange={setRange} options={TASK_RANGES.map((r) => ({ value: r.id, label: t(RANGE_LABEL[r.id]), title: t(r.label) }))} />
            <GButton variant="ink" href={`/api/tasks/export?range=${rangeId}`} download>
              <Download size={14} strokeWidth={1.75} aria-hidden /> {t('Export')}
            </GButton>
          </div>
        }
      />

      {/* Zone 1: the two numbers that ask the operator to act, then three plain stats */}
      <div className="wg-tasks-top">
        <GHeroCard
          variant="a"
          size="sm"
          caption={t('Needs you')}
          value={stats.needsYou}
          status={t('blocked until you act')}
          title={t('Tasks with status blocked. Shows them on the board.')}
          onClick={() => showRail({ kind: 'blocked' })}
        />
        <GHeroCard
          variant="b"
          size="sm"
          caption={t('Overdue')}
          value={stats.overdue}
          status={stats.overdue == null ? t('no due dates set') : t('past due, not done')}
          title={t('Tasks past their due date and not done. Shows them on the board.')}
          onClick={() => showRail({ kind: 'overdue' })}
        />
        <GCard className="wg-tasks-stats">
          <GStat
            value={stats.total.value}
            label={t('Total tasks')}
            source={t('Tasks created in the {range}', { range: wl })}
            extra={<GDelta cur={stats.total.value} prev={stats.total.prev} min={MIN_PREV_TASKS} window={t('vs the previous {n} days', { n: rangeDays })} />}
          />
          <GStat value={stats.inProgress} label={t('In progress')} source={t('Tasks being worked on right now')} />
          <GStat
            value={runtimeText}
            label={t('Agent runtime')}
            source={t('Time agents spent running in the {range}', { range: wl })}
            extra={
              runtimeText ? (
                stats.runtimeMs?.delta != null ? <GDelta cur={stats.runtimeMs.value} prev={stats.runtimeMs.prev} window={t('vs the previous {n} days', { n: rangeDays })} /> : null
              ) : (
                <span className="wg-cap">{stats.lastRunAt ? t('last run {since}', { since: sinceText(stats.lastRunAt, now) }) : t('no runs recorded')}</span>
              )
            }
          />
        </GCard>
      </div>

      {/* Zone 2: overview + due next */}
      <div className="wg-tasks-2">
        <GCard>
          <GSectionHeader
            size={22}
            title={t('Task overview')}
            caption={t('Completed and pending, by when they were created')}
            action={
              <GSegmented<Grain>
                label={t('Grain')}
                value={grain}
                onChange={setGrain}
                options={[
                  { value: 'daily', label: t('Daily') },
                  { value: 'monthly', label: t('Monthly') },
                  { value: 'yearly', label: t('Yearly') },
                ]}
              />
            }
          />
          <GBarChart
            variant="grouped"
            label={t('Tasks completed and pending, {grain}', { grain: t(grain) })}
            height={180}
            keys={[
              { id: 'completed', label: t('Completed'), color: 'muted' },
              { id: 'pending', label: t('Pending'), color: 'accent' },
            ]}
            groups={overview.map((b) => ({ id: b.label, label: b.label, values: [b.completed, b.pending] }))}
            state={overview.every((b) => b.completed + b.pending === 0) ? 'empty' : 'ready'}
            emptyText={t('No tasks in this window')}
            className="wg-chart"
          />
        </GCard>
        <DueNext tasks={live} agentNames={agentNames} now={now} onAdd={() => showRail(null)} />
      </div>

      {/* Zone 3: the board */}
      <div ref={board} className="wg-anchor">
        <GCard className="wg-board">
          <TodoRail tasks={live} filter={filter} setFilter={setFilter} agentNames={agentNames} now={now} onComplete={complete} onCreate={(title, horizon) => create(title, horizon, null)} />
          <TimeGrid
            tasks={live}
            agentNames={agentNames}
            now={now}
            dayFilter={filter?.kind === 'day' ? filter.key : null}
            onDay={(key, label) => setFilter(key ? { kind: 'day', key, label } : null)}
            onAdd={(title, at) => create(title, null, at.toISOString())}
          />
        </GCard>
      </div>

      {/* Zone 4: workload + outcomes */}
      <div className="wg-tasks-4">
        <Workload rows={rows} />
        <Outcomes trend={trend} activity={activity} runsTotal={runs.length} lastRunAt={stats.lastRunAt} rangeDays={rangeDays} rangeLabel={wl} now={now} onWiden={setRange} />
      </div>
      <AgentSheetHost dir={dir} />
    </GPage>
  );
}

function DueNext({ tasks, agentNames, now, onAdd }: { tasks: AgentTask[]; agentNames: Record<string, string>; now: number; onAdd: () => void }) {
  const next = tasks
    .filter((tk) => tk.dueAt && tk.status !== 'done')
    .sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!))
    .slice(0, 5);
  return (
    <GCard>
      <GSectionHeader size={22} title={t('Due next')} caption={t('The next five dated tasks')} />
      {next.length === 0 ? (
        <GEmpty inline title={t('Nothing has a due date')} action={{ label: t('Add a to-do'), onClick: onAdd }} />
      ) : (
        <GList>
          {next.map((tk) => {
            const late = Date.parse(tk.dueAt!) < now;
            return (
              <GRow
                key={tk.id}
                title={tk.title}
                meta={tk.agentId ? agentNames[tk.agentId] ?? tk.agentId : t('You')}
                trailing={late ? <GTag tone="err">{t('Overdue {since}', { since: sinceText(tk.dueAt!, now) })}</GTag> : <span className="wg-cap">{new Date(tk.dueAt!).toLocaleDateString(localeTag(), { weekday: 'short', month: 'short', day: 'numeric' })}</span>}
                onClick={tk.agentId ? () => openAgentSheet(tk.agentId!) : undefined}
              />
            );
          })}
        </GList>
      )}
    </GCard>
  );
}

function TodoRail({
  tasks,
  filter,
  setFilter,
  agentNames,
  now,
  onComplete,
  onCreate,
}: {
  tasks: AgentTask[];
  filter: RailFilter;
  setFilter: (f: RailFilter) => void;
  agentNames: Record<string, string>;
  now: number;
  onComplete: (tk: AgentTask) => void;
  onCreate: (title: string, horizon: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const [horizon, setHorizon] = useState<string>('week');
  const groups = todoGroups(tasks);
  const filtered =
    filter == null
      ? null
      : filter.kind === 'task'
        ? tasks.filter((tk) => tk.id === filter.id)
        : tasks.filter((tk) => {
          if (tk.status === 'done') return false;
          if (filter.kind === 'blocked') return tk.status === 'blocked';
          if (filter.kind === 'overdue') return tk.dueAt != null && Date.parse(tk.dueAt) < now;
          const key = filter.kind === 'day' ? filter.key : '';
          return tk.dueAt != null && new Date(tk.dueAt).toDateString() === key;
        });
  const filterLabel = filter?.kind === 'task' ? t('Linked task') : filter?.kind === 'blocked' ? t('Blocked') : filter?.kind === 'overdue' ? t('Overdue') : filter?.kind === 'day' ? t('Due {day}', { day: filter.label }) : '';

  const owner = (tk: AgentTask) => (tk.agentId ? agentNames[tk.agentId] ?? tk.agentId : t('You'));
  const row = (tk: AgentTask) => {
    const focus = filter?.kind === 'task' && tk.id === filter.id;
    return (
      <GRow
        key={tk.id}
        selected={focus}
        leading={tk.status === 'done' ? undefined : <GCheck checked={false} onCheckedChange={() => onComplete(tk)} aria-label={t('Complete {name}', { name: tk.title })} />}
        title={tk.title}
        meta={focus ? `${owner(tk)} · ${t(TASK_STATUS_LABEL[tk.status])}` : filter ? owner(tk) : undefined}
        hint={focus && tk.detail ? tk.detail : undefined}
      />
    );
  };

  return (
    <div className="wg-rail" data-task-focus={filter?.kind === 'task' ? filter.id : undefined}>
      <GSectionHeader size={22} title={t('To-do')} />
      {filter && (
        <div className="wg-rail-filter">
          <GChip pressed onPressedChange={() => setFilter(null)} title={t('Clear the filter')}>
            {filterLabel} · {filtered?.length ?? 0}
          </GChip>
        </div>
      )}
      {filtered ? (
        filtered.length === 0 ? (
          <p className="wg-cap">
            {filter?.kind === 'task' ? t('That task is no longer on the board.') : t('Nothing here.')}
          </p>
        ) : <GList label={filterLabel}>{filtered.map(row)}</GList>
      ) : groups.length === 0 ? (
        <p className="wg-cap">{t('Nothing on your own list.')}</p>
      ) : (
        groups.map((g) => (
          <div key={g.id} className="wg-rail-group">
            <span className="wg-cap">
              {t(g.label)} · {g.tasks.length}
            </span>
            <GList label={t(g.label)}>{g.tasks.map(row)}</GList>
          </div>
        ))
      )}
      <form
        className="wg-rail-add"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          onCreate(draft.trim(), horizon);
          setDraft('');
        }}
      >
        <div className="wg-inline-add">
          <GInput value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('Add a to-do')} aria-label={t('New to-do')} />
          <GButton type="submit" variant="icon" aria-label={t('Add to-do')} disabled={!draft.trim()} disabledReason={t('Type a title first')}>
            <Plus size={16} strokeWidth={1.75} aria-hidden />
          </GButton>
        </div>
        <GSegmented label={t('Horizon')} size="compact" value={horizon} onChange={setHorizon} options={HORIZONS.map((h) => ({ value: h.id, label: t(h.label.replace('This ', '')) }))} />
      </form>
    </div>
  );
}

function Workload({ rows }: { rows: WorkloadRow[] }) {
  const [q, setQ] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const shown = rows.filter((r) => (!q || `${r.name} ${r.department}`.toLowerCase().includes(q.toLowerCase())) && (!openOnly || r.ongoing + r.pending > 0));
  const columns: GColumn<WorkloadRow>[] = [
    {
      key: 'name',
      label: t('Agent'),
      sortValue: (r) => r.name,
      render: (r) => (
        <GButton size="compact" onClick={() => openAgentSheet(r.agentId)} title={t('Open {name} · {department}', { name: r.name, department: r.department })}>
          {r.name}
        </GButton>
      ),
    },
    { key: 'assigned', label: t('Assigned'), numeric: true, sortValue: (r) => r.assigned, render: (r) => r.assigned },
    { key: 'done', label: tc('tasks', 'Done'), numeric: true, sortValue: (r) => r.completed, render: (r) => r.completed },
    { key: 'doing', label: t('In progress'), numeric: true, sortValue: (r) => r.ongoing, render: (r) => r.ongoing },
    { key: 'pending', label: t('Pending'), numeric: true, sortValue: (r) => r.pending, render: (r) => r.pending },
    {
      key: 'load',
      label: t('Load'),
      title: t('Open work against the fleet median'),
      sortValue: (r) => (r.load === 'high' ? 2 : r.load === 'medium' ? 1 : 0),
      render: (r) => <GTag tone={LOAD_TONE[r.load]}>{r.load === 'low' ? t('low') : r.load === 'medium' ? t('medium') : t('high')}</GTag>,
    },
  ];
  return (
    <GCard>
      <GSectionHeader
        size={22}
        title={t('Workload')}
        caption={t('{n} agents holding work', { n: rows.length })}
        action={
          <div className="wg-head-actions">
            <GSearch size="md" value={q} onValueChange={setQ} placeholder={t('Search')} aria-label={t('Search agents')} />
            <GChip pressed={openOnly} onPressedChange={setOpenOnly}>
              {t('Open only')}
            </GChip>
          </div>
        }
      />
      <div className="wg-table-wrap">
        <GTable caption={t('Workload by agent')} columns={columns} rows={shown} rowKey={(r) => r.agentId} sort={{ key: 'assigned', dir: 'desc' }} empty={t('No agent holds work')} />
      </div>
    </GCard>
  );
}

function Outcomes({
  trend,
  activity,
  runsTotal,
  lastRunAt,
  rangeDays,
  rangeLabel,
  now,
  onWiden,
}: {
  trend: ReturnType<typeof outcomeTrend>;
  activity: ReturnType<typeof activityByWeekday>;
  runsTotal: number;
  lastRunAt: string | null;
  rangeDays: number;
  rangeLabel: string;
  now: number;
  onWiden: (id: RangeId) => void;
}) {
  let body;
  if (!trend || !activity) {
    if (runsTotal === 0 || !lastRunAt) {
      body = (
        <GEmpty
          inline
          kind="unconfigured"
          title={t('No agent runs recorded yet')}
          body={t('Success rate is measured from real runs.')}
          setupHref="/agents"
          setupHint={t('Agents run on the host; bring one online to start recording runs.')}
        />
      );
    } else {
      const wider = rangeContaining(lastRunAt, now);
      const offer = wider && wider.days > rangeDays ? wider : null;
      body = (
        <GEmpty
          inline
          title={t('No runs in the {range} · last run {since}', { range: rangeLabel, since: sinceText(lastRunAt, now) })}
          body={t('The success rate is measured from runs in the page range.')}
          action={
            offer
              ? {
                  label: offer.days === 365 ? t('Widen to 12 months') : t('Widen to {n} days', { n: offer.days }),
                  onClick: () => onWiden(offer.id),
                }
              : undefined
          }
        />
      );
    }
  } else {
    const total = trend.succeeded + trend.failed;
    body = (
      <>
        <div className="wg-outcomes-num">
          <GDotNumber value={`${activity.pct}%`} size={4} label={t('{pct}% of runs succeeded', { pct: activity.pct })} />
          <span className="wg-cap">
            {t('of {n} runs succeeded · {range}', { n: total.toLocaleString(localeTag()), range: rangeLabel })}
          </span>
        </div>
        <GAreaChart
          label={t('Runs succeeded and failed per day · {range}', { range: rangeLabel })}
          labels={trend.points.map((p) => p.label)}
          series={[
            { id: 'ok', label: tc('runs', 'Succeeded'), values: trend.points.map((p) => p.succeeded), color: 'accent' },
            { id: 'fail', label: tc('runs', 'Failed'), values: trend.points.map((p) => p.failed), color: 'err' },
          ]}
          height={120}
          className="wg-chart"
        />
        <span className="wg-cap">{t('Busiest weekday: {day}', { day: activity.days[activity.peakIndex].label })}</span>
        <GBarChart
          variant="series"
          label={t('Runs per weekday')}
          height={56}
          bars={activity.days.map((d) => ({ id: d.label, label: d.label, value: d.runs }))}
          highlight={activity.days[activity.peakIndex].label}
        />
      </>
    );
  }
  return (
    <GCard id="outcomes" className="wg-anchor">
      <GSectionHeader size={22} title={t('Run outcomes')} caption={t('Fleet runs · {range}', { range: rangeLabel })} />
      <div className="wg-outcomes">{body}</div>
    </GCard>
  );
}
