'use client';

/**
 * /lead-magnets under the Bennett Legacy style (pages/lead-magnets.md §8): the
 * FounderOS Content Engine slab (shots/founderos-v1/content-lead-magnets-1440.png)
 * without its "← Content" link (there is no /content). Pages Shipped step line
 * beside Magnet Volume, then Captures, Where Leads Land and the one insight,
 * then the Notion-style table. Same page model (lib/lead-magnets.ts) and
 * actions (use-lead-magnets.ts) as the other trees; Legacy kit and --l-* only.
 * Captures are never a number we do not have (LM-3).
 */
import { useMemo, useState } from 'react';
import { Copy, ExternalLink, Plus, Rocket } from 'lucide-react';
import {
  Badge,
  BigStat,
  Chip,
  DotMatrix,
  InsightCard,
  LDialog,
  LEmpty,
  LSampleChip,
  LUnconfigured,
  MeterStack,
  Pressable,
  SlabCard,
  SlabTitle,
  StepLine,
  ToggleChip,
  type BadgeTone,
  type Meter,
} from '@/components/legacy';
import { useToast } from '@/components/ui/Toast';
import { LM_STATUSES, LM_STATUS_LABEL, type LeadMagnetRow, type LeadMagnetsPage } from '@/lib/lead-magnets';
import type { LeadMagnetStatus } from '@/lib/schemas';
import { EMPTY_FORM, PLACEHOLDERS, copyText, formFrom, useLeadMagnets, validateForm, type MagnetForm, type SaveResult } from './use-lead-magnets';
import { t, tc } from '@/lib/i18n';

const TONE: Record<LeadMagnetStatus, BadgeTone> = { live: 'ok', draft: 'default', paused: 'warn', archived: 'default' };
const frac = (n: number, of: number) => (of > 0 ? n / of : 0);

export function LeadMagnetsLegacy({ page }: { page: LeadMagnetsPage }) {
  const lm = useLeadMagnets();
  const { toast } = useToast();
  const [editing, setEditing] = useState<LeadMagnetRow | 'new' | null>(null);
  const [deleting, setDeleting] = useState<LeadMagnetRow | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const filming = page.mode === 'filming';
  const writeBlocked = filming ? t('Filming mode: read only') : null;
  const rowBlocked = (r: LeadMagnetRow) => writeBlocked ?? (r.sample ? t('Sample data: register a real page to edit') : null);
  const { volume, destinations, captures } = page.view;
  const emailN = destinations ? Math.round(destinations.email * volume.live) : 0;
  const bookingN = volume.live - emailN;

  // FO draws pages on record, week by week: the running total of went-live pages
  const cumulative = useMemo(() => {
    let n = 0;
    return page.weeks.counts.map((c, i) => ({ label: page.weeks.labels[i].replace('Week of ', ''), count: (n += c) }));
  }, [page.weeks]);
  const shipped12 = page.weeks.counts.reduce((a, b) => a + b, 0);
  const campaigns = new Set(page.rows.map((r) => r.campaign).filter(Boolean)).size;
  const campaignsLabel = campaigns === 1 ? t('{n} campaign', { n: campaigns }) : t('{n} campaigns', { n: campaigns });
  const subtitle = page.total === 1 ? t('{n} page · {live} live', { n: page.total, live: volume.live }) : t('{n} pages · {live} live', { n: page.total, live: volume.live });

  const copy = async (r: LeadMagnetRow) => {
    toast((await copyText(r.liveUrl)) ? { text: t('Link copied'), tone: 'ok' } : { text: t('The browser blocked the clipboard'), tone: 'err' });
  };

  const volumeMeters: Meter[] = [
    { label: t('Live ({n}/{total})', { n: volume.live, total: page.total }), frac: frac(volume.live, page.total), display: t('{n} of {total}', { n: volume.live, total: page.total }), hue: 'var(--l-ok)' },
    { label: t('Draft ({n}/{total})', { n: volume.draft, total: page.total }), frac: frac(volume.draft, page.total), display: t('{n} of {total}', { n: volume.draft, total: page.total }) },
    { label: t('Paused ({n}/{total})', { n: volume.paused, total: page.total }), frac: frac(volume.paused, page.total), display: t('{n} of {total}', { n: volume.paused, total: page.total }), hue: 'var(--l-warn)' },
    { label: t('Archived ({n}/{total})', { n: volume.archived, total: page.total }), frac: frac(volume.archived, page.total), display: t('{n} of {total}', { n: volume.archived, total: page.total }) },
  ];

  return (
    <div data-l="LeadMagnetsLegacy" className="l-page">
      <SlabTitle
        eyebrow={t('Content engine')}
        title={t('Lead Magnets')}
        meta={`${subtitle} · ${t('{n} paused', { n: volume.paused })} · ${campaignsLabel}`}
        right={
          <>
            {page.sample && (
              <span title={filming ? t('Filming mode fixture, four invented pages') : t('Preview on a blank install, four invented pages')}>
                <LSampleChip />
              </span>
            )}
            {volume.live > 0 && <Chip tone="ok">{t('{n} live', { n: volume.live })}</Chip>}
            <Pressable tone="pill" onClick={() => setEditing('new')} disabled={Boolean(writeBlocked)} title={writeBlocked ?? undefined}>
              <Plus size={14} strokeWidth={1.7} aria-hidden /> {t('Register a page')}
            </Pressable>
          </>
        }
      />

      <div className="l-stack">
        <div className="l-row l-row-hero">
          <SlabCard title={t('Pages Shipped')} sub={t('last 12 weeks')} i={1}>
            <div className="l-card-body pb-2">
              <BigStat value={shipped12} size={30} chips={[{ tone: 'accent', text: t('{n} on record', { n: page.total }) }]} caption={t('landing pages gone live, week by week')} />
            </div>
            <StepLine series={cumulative} unit={cumulative.at(-1)?.count === 1 ? t(' page') : t(' pages')} empty={t('Pages with a went-live date fill this in, week by week.')} />
          </SlabCard>
          <SlabCard title={t('Magnet Volume')} sub={t('by status')} i={2} className="flex flex-col">
            <div className="l-card-body flex flex-1 flex-col">
              <BigStat value={volume.live} unit={t('live')} chips={volume.paused ? [{ tone: 'err', text: t('{n} paused', { n: volume.paused }) }] : []} caption={page.total === 1 ? t('of {n} landing page on record', { n: page.total }) : t('of {n} landing pages on record', { n: page.total })} />
              <MeterStack meters={volumeMeters} dense empty={t('No pages yet.')} foot={`${campaignsLabel} · ${t('{n} live', { n: emailN + bookingN })}`} />
            </div>
          </SlabCard>
        </div>

        <div className="l-row l-row-three">
          <SlabCard title={t('Captures')} sub={t('leads per page')} i={3}>
            <div className="l-card-body">
              <BigStat display={t(page.capturesNote)} size={30} caption={t(page.capturesReason)} />
            </div>
            {captures.setupHref && <LUnconfigured what="Trakyo" href={captures.setupHref} hint={t('set TRAKYO_API_KEY')} />}
          </SlabCard>
          <SlabCard title={t('Where Leads Land')} sub={t('live pages')} i={4}>
            <div className="l-card-body l-cl-rhythm">
              {destinations ? (
                <>
                  <BigStat display={emailN >= bookingN ? t('Email list') : t('Booking')} size={30} caption={t('top destination · {n} live', { n: volume.live })} />
                  <DotMatrix
                    cols={[
                      { label: t('Email'), count: emailN },
                      { label: t('Booking'), count: bookingN },
                    ]}
                  />
                </>
              ) : (
                <p className="l-body-text">{t('Nothing live yet. Set a page to Live to see where its leads go.')}</p>
              )}
            </div>
          </SlabCard>
          <InsightCard
            badge={t('Live share')}
            icon={<Rocket size={13} strokeWidth={1.7} aria-hidden />}
            value={page.total ? volume.live : null}
            display={page.total ? undefined : '-'}
            headline={page.total ? (page.total === 1 ? t('of {n} page is live right now.', { n: page.total }) : t('of {n} pages are live right now.', { n: page.total })) : t('No pages on record yet.')}
            body={page.total ? t('{draft} draft · {paused} paused · {archived} archived.', { draft: volume.draft, paused: volume.paused, archived: volume.archived }) : t('Register the first page you send people to.')}
            frac={frac(volume.live, page.total)}
            i={5}
          />
        </div>

        <SlabCard
          title={t('All pages')}
          sub={page.filter ? `${page.rows.length} ${t(LM_STATUS_LABEL[page.filter]).toLowerCase()}` : t('{n} on record', { n: page.total })}
          i={6}
          action={
            <div className="l-chip-row" role="group" aria-label={t('Filter by status')}>
              <ToggleChip on={!page.filter} onClick={() => lm.setFilter(null)}>
                {t('All {n}', { n: page.total })}
              </ToggleChip>
              {LM_STATUSES.map((s) => (
                <ToggleChip key={s} on={page.filter === s} onClick={() => lm.setFilter(page.filter === s ? null : s)}>
                  {t(LM_STATUS_LABEL[s])} {volume[s]}
                </ToggleChip>
              ))}
            </div>
          }
        >
          {rowError && <p className="l-err-text l-pad-x pt-3">{rowError}</p>}
          {page.total === 0 ? (
            <LEmpty>
              <span className="block w-full">{t('No lead magnets yet.')}</span>
              <span className="block w-full">{t('Register the first page you send people to.')}</span>
              {!writeBlocked && (
                <Pressable tone="primary" onClick={() => setEditing('new')}>
                  {t('Register a page')}
                </Pressable>
              )}
            </LEmpty>
          ) : page.rows.length === 0 ? (
            <LEmpty>
              <span className="block w-full">{t('No {status} pages.', { status: page.filter ? t(LM_STATUS_LABEL[page.filter]).toLowerCase() : '' })}</span>
              <Pressable onClick={() => lm.setFilter(null)}>{t('Clear filter')}</Pressable>
            </LEmpty>
          ) : (
            <div data-l="Table" className="l-lm-table mt-3" role="table" aria-label={t('Lead magnet pages')}>
              <div className="l-lm-tr l-lm-th" role="row">
                {[t('Name'), t('What they get'), t('Link'), t('Lands'), t('Campaign'), t('Captures'), t('Status'), t('Went live'), ''].map((h, i) => (
                  <span key={i} role="columnheader">
                    {h}
                  </span>
                ))}
              </div>
              {page.rows.map((r) => {
                const blocked = rowBlocked(r);
                return (
                  <div key={r.id} className="l-lm-tr" role="row" data-dim={r.status === 'archived' || undefined}>
                    <span role="cell" className="l-sym" data-label={t('Name')}>
                      {r.name}
                    </span>
                    <span role="cell" className="l-lm-offer" data-label={t('What they get')} title={r.offer}>
                      {r.offer || t('none')}
                    </span>
                    <span role="cell" className="l-lm-link" data-label={t('Link')}>
                      <a href={r.liveUrl} target="_blank" rel="noreferrer" title={r.liveUrl} className="l-link">
                        {r.linkLabel}
                      </a>
                      <button type="button" data-l="Pressable" data-lens="c" className="l-pressable is-dark l-btn-icon l-btn-icon-xs" aria-label={t('Copy link to {name}', { name: r.name })} title={t('Copy link')} onClick={() => void copy(r)}>
                        <Copy size={11} strokeWidth={1.7} aria-hidden />
                      </button>
                    </span>
                    <span role="cell" data-label={t('Lands')}>
                      <Badge>{t(r.destinationLabel)}</Badge>
                    </span>
                    <span role="cell" className="l-lm-dim" data-label={t('Campaign')}>
                      {r.campaign || t('none')}
                    </span>
                    <span role="cell" className="l-lm-dim" data-label={t('Captures')} title={t(page.capturesReason)}>
                      {t(page.capturesNote)}
                    </span>
                    <span role="cell" data-label={t('Status')}>
                      {blocked ? (
                        <Badge tone={TONE[r.status]}>{t(r.statusLabel)}</Badge>
                      ) : (
                        <select
                          className="l-select l-lm-status"
                          data-tone={TONE[r.status]}
                          aria-label={t('Status of {name}', { name: r.name })}
                          value={r.status}
                          onChange={async (e) => {
                            setRowError(null);
                            const res = await lm.setStatus(r.id, e.target.value as LeadMagnetStatus);
                            if (!res.ok) setRowError(res.errors._form ?? t('Could not change the status.'));
                          }}
                        >
                          {LM_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {t(LM_STATUS_LABEL[s])}
                            </option>
                          ))}
                        </select>
                      )}
                    </span>
                    <span role="cell" className="l-lm-dim" data-label={t('Went live')}>
                      {r.wentLiveLabel ?? t('not yet')}
                    </span>
                    <span role="cell" className="l-lm-actions">
                      <a data-l="Pressable" data-lens="c" className="l-pressable is-dark l-btn-icon l-btn-icon-xs" href={r.liveUrl} target="_blank" rel="noreferrer" aria-label={t('Open {name}', { name: r.name })} title={t('Open link')}>
                        <ExternalLink size={11} strokeWidth={1.7} aria-hidden />
                      </a>
                      <Pressable onClick={() => setEditing(r)} disabled={Boolean(blocked)} title={blocked ?? undefined}>
                        {t('Edit')}
                      </Pressable>
                      <Pressable onClick={() => setDeleting(r)} disabled={Boolean(blocked)} title={blocked ?? undefined}>
                        {t('Delete')}
                      </Pressable>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </SlabCard>
      </div>

      {editing && (
        <MagnetDialog
          initial={editing === 'new' ? null : editing}
          busy={lm.busy === 'create' || (editing !== 'new' && lm.busy === `edit:${editing.id}`)}
          onClose={() => setEditing(null)}
          onSave={(f) => (editing === 'new' ? lm.create(f) : lm.update(editing.id, f))}
        />
      )}
      <LDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={deleting ? t('Delete {name}?', { name: deleting.name }) : t('Delete?')}
        width={420}
        footer={
          <>
            <Pressable onClick={() => setDeleting(null)}>{t('Cancel')}</Pressable>
            <Pressable
              tone="primary"
              disabled={deleting ? lm.busy === `delete:${deleting.id}` : false}
              onClick={async () => {
                if (!deleting) return;
                const res = await lm.remove(deleting.id);
                setDeleting(null);
                if (!res.ok) setRowError(res.errors._form ?? t('Could not delete the record.'));
              }}
            >
              {t('Delete')}
            </Pressable>
          </>
        }
      >
        <p className="l-prose">{t('This removes the record, not the page.')}</p>
      </LDialog>
    </div>
  );
}

function MagnetDialog({ initial, busy, onClose, onSave }: { initial: LeadMagnetRow | null; busy: boolean; onClose: () => void; onSave: (f: MagnetForm) => Promise<SaveResult> }) {
  const [f, setF] = useState<MagnetForm>(initial ? formFrom(initial) : EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof MagnetForm, string>> & { _form?: string }>({});
  const set = <K extends keyof MagnetForm>(k: K, v: MagnetForm[K]) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => {
    const local = validateForm(f);
    if (Object.keys(local).length) return setErrors(local);
    const res = await onSave(f);
    if (res.ok) onClose();
    else setErrors(res.errors);
  };
  const err = (k: keyof MagnetForm) => errors[k] && <p className="l-err-text mt-1">{errors[k]}</p>;
  return (
    <LDialog
      title={initial ? t('Edit {name}', { name: initial.name }) : t('Register a page')}
      sub={t('A record of the page, where it lives and where its leads go. Nothing is published from here.')}
      onClose={onClose}
      width={580}
      footer={
        <>
          <Pressable onClick={onClose}>{t('Cancel')}</Pressable>
          <Pressable tone="primary" onClick={() => void submit()} disabled={busy}>
            {initial ? t('Save') : tc('button', 'Register')}
          </Pressable>
        </>
      }
    >
      <label className="l-form-label" htmlFor="l-lm-name">
        {t('Name')}
      </label>
      <input id="l-lm-name" className="l-input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder={PLACEHOLDERS.name} maxLength={120} aria-invalid={Boolean(errors.name)} />
      {err('name')}
      <label className="l-form-label" htmlFor="l-lm-offer">
        {t('What they get')}
      </label>
      <input id="l-lm-offer" className="l-input" value={f.offer} onChange={(e) => set('offer', e.target.value)} placeholder={PLACEHOLDERS.offer} maxLength={500} />
      <label className="l-form-label" htmlFor="l-lm-url">
        {t('Live URL')}
      </label>
      <input id="l-lm-url" type="url" inputMode="url" className="l-input" value={f.liveUrl} onChange={(e) => set('liveUrl', e.target.value)} placeholder={PLACEHOLDERS.liveUrl} aria-invalid={Boolean(errors.liveUrl)} />
      {err('liveUrl')}
      <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
        <div>
          <label className="l-form-label" htmlFor="l-lm-dest">
            {t('Where leads land')}
          </label>
          <select id="l-lm-dest" className="l-select" value={f.destination} onChange={(e) => set('destination', e.target.value as MagnetForm['destination'])}>
            <option value="email">{t('Email list')}</option>
            <option value="booking">{t('Booking')}</option>
          </select>
        </div>
        <div>
          <label className="l-form-label" htmlFor="l-lm-campaign">
            {t('Campaign it was built for')}
          </label>
          <input id="l-lm-campaign" className="l-input" value={f.campaign} onChange={(e) => set('campaign', e.target.value)} placeholder={PLACEHOLDERS.campaign} maxLength={200} />
        </div>
        <div>
          <label className="l-form-label" htmlFor="l-lm-status">
            {t('Status')}
          </label>
          <select id="l-lm-status" className="l-select" value={f.status} onChange={(e) => set('status', e.target.value as LeadMagnetStatus)}>
            {LM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(LM_STATUS_LABEL[s])}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="l-form-label" htmlFor="l-lm-live">
            {t('Went live')}
          </label>
          <input id="l-lm-live" type="date" className="l-input" value={f.wentLiveAt} onChange={(e) => set('wentLiveAt', e.target.value)} />
        </div>
      </div>
      <label className="l-form-label" htmlFor="l-lm-notes">
        {t('Notes')}
      </label>
      <textarea id="l-lm-notes" className="l-textarea" value={f.notes} onChange={(e) => set('notes', e.target.value)} maxLength={4000} />
      {errors._form && <p className="l-err-text mt-3">{errors._form}</p>}
    </LDialog>
  );
}
