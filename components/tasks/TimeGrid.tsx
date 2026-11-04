'use client';

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { GButton, GInput, GPopover } from '@/components/g';
import type { AgentTask } from '@/lib/schemas';
import { t, localeTag } from '@/lib/i18n';

/**
 * Week × hour grid (glados-ui SPEC S04 F-T6, X1 composite "TimeGrid"):
 * tasks placed by `dueAt`, a today marker, an anchored popover to add a
 * task at a cell (replaces window.prompt, AC04.15), and a collapsed mode
 * when the visible week has no timed task (one line instead of ten empty
 * rows). A day header press filters the To-Do rail to that day.
 */
const DAYS = [0, 1, 2, 3, 4, 5, 6];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

export const startOfWeek = (now: number): Date => {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
};

function sameHour(iso: string, cell: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === cell.getFullYear() && d.getMonth() === cell.getMonth() && d.getDate() === cell.getDate() && d.getHours() === cell.getHours();
}

function CellAdd({ cell, onAdd, active, setActive }: { cell: Date; onAdd: (title: string, at: Date) => void; active: boolean; setActive: (on: boolean) => void }) {
  const [draft, setDraft] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const when = cell.toLocaleString(localeTag(), { weekday: 'short', hour: 'numeric' });
  return (
    <GPopover
      open={active}
      onOpenChange={(o) => {
        setActive(o);
        if (!o) setDraft('');
      }}
      label={t('New task, {when}', { when })}
      initialFocus={input}
      className="wg-cell-pop"
      trigger={(p) => (
        <GButton {...p} variant="icon" size="compact" aria-label={`Add a task at ${when}`} className="wg-cell-add">
          <Plus size={13} strokeWidth={1.75} aria-hidden />
        </GButton>
      )}
    >
      <form
        className="wg-cell-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          onAdd(draft.trim(), cell);
          setDraft('');
          setActive(false);
        }}
      >
        <span className="wg-cap">{t('New task · {when}', { when })}</span>
        <GInput ref={input} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('What needs doing?')} aria-label={t('Task title')} />
        <GButton type="submit" variant="ink" size="sm" disabled={!draft.trim()} disabledReason={t('Type a title first')}>
          {t('Add')}
        </GButton>
      </form>
    </GPopover>
  );
}

export function TimeGrid({
  tasks,
  agentNames,
  now,
  dayFilter,
  onDay,
  onAdd,
}: {
  tasks: AgentTask[];
  agentNames: Record<string, string>;
  now: number;
  dayFilter: string | null;
  onDay: (dayKey: string | null, label: string) => void;
  onAdd: (title: string, at: Date) => void;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const s = startOfWeek(now);
  const weekStart = new Date(s.getFullYear(), s.getMonth(), s.getDate() + weekOffset * 7);
  const dayDate = (i: number) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
  const open = tasks.filter((tk) => tk.dueAt && tk.status !== 'done');
  const weekEnd = dayDate(7).getTime();
  const timed = open.filter((tk) => {
    const at = Date.parse(tk.dueAt!);
    return at >= weekStart.getTime() && at < weekEnd;
  });
  const today = new Date(now);
  const todayKey = today.toDateString();
  const collapsed = timed.length === 0 && !expanded;

  return (
    <div className="wg-grid">
      <div className="wg-grid-head">
        <span className="wg-grid-month">{weekStart.toLocaleDateString(localeTag(), { month: 'long', year: 'numeric' })}</span>
        <div className="wg-grid-nav">
          <GButton variant="icon" size="compact" aria-label={t('Previous week')} onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft size={14} strokeWidth={1.75} aria-hidden />
          </GButton>
          <GButton size="compact" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0} disabledReason={t('Already on this week')}>
            {t('Today')}
          </GButton>
          <GButton variant="icon" size="compact" aria-label={t('Next week')} onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRight size={14} strokeWidth={1.75} aria-hidden />
          </GButton>
        </div>
      </div>
      <div className="wg-grid-scroll">
        <div className="wg-grid-table" role="grid" aria-label={t('Week of timed tasks')}>
          <div className="wg-grid-row" role="row">
            <span role="columnheader" />
            {DAYS.map((i) => {
              const date = dayDate(i);
              const key = date.toDateString();
              const label = `${date.toLocaleDateString(localeTag(), { weekday: 'short' })} ${date.getDate()}`;
              return (
                <span key={i} role="columnheader" className="wg-grid-day">
                  <GButton
                    size="compact"
                    aria-pressed={dayFilter === key}
                    data-today={key === todayKey || undefined}
                    className="wg-grid-daybtn"
                    title={t('Show what is due {date}', { date: date.toLocaleDateString(localeTag(), { weekday: 'long', month: 'short', day: 'numeric' }) })}
                    onClick={() => onDay(dayFilter === key ? null : key, label)}
                  >
                    {label}
                  </GButton>
                </span>
              );
            })}
          </div>
          {collapsed ? (
            <div className="wg-grid-empty">
              <span className="wg-cap">{t('No timed tasks this week.')}</span>
              <GButton size="sm" onClick={() => setExpanded(true)}>
                {t('Show hours')}
              </GButton>
            </div>
          ) : (
            HOURS.map((h) => (
              <div key={h} className="wg-grid-row" role="row">
                <span className="wg-grid-hour" role="rowheader">
                  {String(h).padStart(2, '0')}:00
                </span>
                {DAYS.map((_, i) => {
                  const cell = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i, h);
                  const key = cell.toISOString();
                  const items = timed.filter((tk) => sameHour(tk.dueAt!, cell));
                  return (
                    <div key={i} role="gridcell" className="wg-grid-cell">
                      {items.map((tk) => (
                        <span key={tk.id} className="wg-grid-task" title={`${tk.title} · ${tk.agentId ? agentNames[tk.agentId] ?? tk.agentId : t('You')}`}>
                          <span className="wg-grid-task-title">{tk.title}</span>
                          <span className="wg-grid-task-who">{tk.agentId ? agentNames[tk.agentId] ?? tk.agentId : t('You')}</span>
                        </span>
                      ))}
                      {items.length === 0 && <CellAdd cell={cell} onAdd={onAdd} active={activeCell === key} setActive={(o) => setActiveCell(o ? key : null)} />}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
