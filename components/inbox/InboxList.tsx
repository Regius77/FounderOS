'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { ArrowDownWideNarrow, Check, Video, X } from 'lucide-react';
import { BUCKET_LABEL, SORTS, TRIAGE, clock, dateBucket, relativeTime, type InboxThread, type Sort, type Triage } from '@/lib/inbox';
import { Avatar, Mono, SourceBadge } from './bits';
import { t, localeTag } from '@/lib/i18n';

/**
 * Middle column: the list. Each row leads with who, and the channel is its own
 * app mark rather than a word — resting, ringed when unread, lit when open.
 * The sort control is real: newest, oldest, or most urgent.
 */
export function InboxList({
  threads,
  selected,
  nowISO,
  sort,
  triage,
  onSelect,
  onSort,
  onTriage,
}: {
  threads: InboxThread[];
  selected: string | null;
  nowISO: string;
  sort: Sort;
  triage: Triage | 'all';
  onSelect: (key: string) => void;
  onSort: (s: Sort) => void;
  onTriage: (t: Triage | 'all') => void;
}) {
  const now = new Date(nowISO);
  const listRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selected || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-key="${CSS.escape(selected)}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!sortRef.current?.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [menu]);

  const active = SORTS.find((s) => s.id === sort) ?? SORTS[0];
  // Day headings only make sense while the list is in time order.
  const grouped = sort !== 'urgency';
  let lastBucket: string | null = null;

  return (
    <section className="ib-col ib-list">
      <header className="ib-list-h">
        <span className="ib-list-title">
          {t('Inbox')} <Mono className="ib-list-n">{threads.length}</Mono>
        </span>
        {triage !== 'all' && (
          <button className="ib-filter-chip" onClick={() => onTriage('all')} title={t('Clear this filter')}>
            {t(TRIAGE.find((x) => x.id === triage)?.label ?? triage)}
            <X strokeWidth={2.4} />
          </button>
        )}
        <div className="ib-sort" ref={sortRef}>
          <button className={`ib-sort-btn ${menu ? 'is-on' : ''}`} onClick={() => setMenu((v) => !v)} aria-haspopup="listbox" aria-expanded={menu}>
            <ArrowDownWideNarrow strokeWidth={1.8} />
            {t('Sort by:')} <b>{t(active.label)}</b>
          </button>
          {menu && (
            <ul className="ib-sort-menu" role="listbox">
              {SORTS.map((s) => (
                <li key={s.id}>
                  <button
                    role="option"
                    aria-selected={s.id === sort}
                    className={`ib-sort-opt ${s.id === sort ? 'is-on' : ''}`}
                    onClick={() => {
                      onSort(s.id);
                      setMenu(false);
                    }}
                  >
                    <span className="ib-sort-tick">{s.id === sort && <Check strokeWidth={3} />}</span>
                    {t(s.label)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>
      <div className="ib-rows" ref={listRef}>
        {threads.length === 0 && <p className="ib-empty">{t('Nothing matches these filters.')}</p>}
        {threads.map((th) => {
          const bucket = dateBucket(th.ts, now);
          const showBucket = grouped && bucket !== lastBucket;
          lastBucket = bucket;
          const isSel = th.key === selected;
          return (
            <Fragment key={th.key}>
              {showBucket && <Mono className="ib-bucket">{t(BUCKET_LABEL[bucket])}</Mono>}
              <button className={`ib-row ${isSel ? 'is-sel' : ''} ${th.unread ? 'is-unread' : ''}`} data-key={th.key} onClick={() => onSelect(th.key)}>
                <Avatar name={th.sender} source={th.source} src={th.avatarUrl} />
                <span className="ib-row-main">
                  <span className="ib-row-top">
                    <span className="ib-row-who">{th.sender}</span>
                    <span className="ib-row-ctx">{th.context}</span>
                    <Mono className="ib-row-time">{th.source === 'calendar' ? new Date(th.ts).toLocaleDateString(localeTag(), { weekday: 'short' }) : relativeTime(th.ts, now)}</Mono>
                  </span>
                  <span className="ib-row-mid">
                    <SourceBadge source={th.source} unread={th.unread > 0} selected={isSel} />
                    <span className="ib-row-prev">{th.preview}</span>
                  </span>
                  <span className="ib-row-bot">
                    {th.source === 'calendar' && th.event ? (
                      <Mono className="ib-row-when">
                        {th.event.allDay ? t('All day') : `${clock(th.ts)}${th.event.end ? ` – ${clock(th.event.end)}` : ''}`}
                      </Mono>
                    ) : null}
                    {th.unread > 0 && <Mono className="ib-row-unread">{t('{n} unread', { n: th.unread })}</Mono>}
                    {th.event?.joinUrl && (
                      <span className="ib-row-join">
                        <Video strokeWidth={1.8} /> {t('video')}
                      </span>
                    )}
                    {th.priority && <Mono className="ib-row-pri">P{th.priority}</Mono>}
                  </span>
                </span>
              </button>
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
