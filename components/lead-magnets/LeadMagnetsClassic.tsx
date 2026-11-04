'use client';

/**
 * /lead-magnets under the Classic style (founderos-ui pages/lead-magnets.md
 * §7): PageHeader + Register, Pages shipped bars + Where leads land share,
 * then a bordered Notion-style table with an inline status select, row
 * actions and a modal form. `os-*` tokens only.
 */
import { useState } from 'react';
import { Copy, ExternalLink, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SetupLink } from '@/components/SetupLink';
import { useToast } from '@/components/ui/Toast';
import { CBars, CCard, CMeter, CModal, CPill, CSampleBadge, type PillTone } from '@/components/fo-classic/kit';
import { LM_STATUSES, LM_STATUS_LABEL, type LeadMagnetRow, type LeadMagnetsPage } from '@/lib/lead-magnets';
import type { LeadMagnetStatus } from '@/lib/schemas';
import { EMPTY_FORM, PLACEHOLDERS, copyText, formFrom, useLeadMagnets, validateForm, type MagnetForm, type SaveResult } from './use-lead-magnets';
import { t } from '@/lib/i18n';

const TONE: Record<LeadMagnetStatus, PillTone> = { live: 'ok', draft: 'default', paused: 'warn', archived: 'default' };

export function LeadMagnetsClassic({ page }: { page: LeadMagnetsPage }) {
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
  const subtitle = page.total === 1 ? t('{n} page · {live} live', { n: page.total, live: volume.live }) : t('{n} pages · {live} live', { n: page.total, live: volume.live });

  const copy = async (r: LeadMagnetRow) => {
    toast((await copyText(r.liveUrl)) ? { text: t('Link copied'), tone: 'ok' } : { text: t('The browser blocked the clipboard'), tone: 'err' });
  };

  return (
    <div className="lm-c">
      <PageHeader
        title={t(page.title)}
        eyebrow={subtitle}
        right={
          <>
            {page.sample && <CSampleBadge title={filming ? t('Filming mode fixture, four invented pages') : t('Preview on a blank install, four invented pages')} />}
            <button type="button" className="c-btn c-btn-primary" onClick={() => setEditing('new')} disabled={Boolean(writeBlocked)} title={writeBlocked ?? undefined}>
              <Plus size={14} strokeWidth={1.75} aria-hidden /> {t('Register a page')}
            </button>
          </>
        }
      />

      <div className="fo-c-grid">
        <CCard title={t('Pages shipped')} id="lm-c-shipped" right={<span>{t('Last 12 weeks')}</span>} className="fo-c-span-8">
          <CBars
            bars={page.weeks.counts.map((n, i) => ({ id: String(i), label: page.weeks.axisLabels[i], value: n, title: t('{week}: {n} went live', { week: page.weeks.labels[i], n }) }))}
            height={110}
            label={t('Lead magnet pages that went live per week, last 12 weeks')}
            empty={page.weeks.counts.some((n) => n > 0) ? undefined : t('Pages with a went-live date fill this in, week by week.')}
          />
        </CCard>
        <CCard title={t('Where leads land')} id="lm-c-lands" right={<span>{t('Live pages')}</span>} className="fo-c-span-4">
          {destinations ? (
            <div className="flex flex-col gap-3.5">
              <CMeter label={t('Email list')} value={emailN} of={volume.live} tone="accent" />
              <CMeter label={t('Booking')} value={volume.live - emailN} of={volume.live} tone="muted" />
              <p className="text-[12px] text-os-dim">{t('{live} live · {paused} paused · {draft} draft', { live: volume.live, paused: volume.paused, draft: volume.draft })}</p>
            </div>
          ) : (
            <p className="text-[13px] text-os-muted">{t('Nothing live yet. Set a page to Live to see where its leads go.')}</p>
          )}
        </CCard>

        <CCard
          title={t('All pages')}
          id="lm-c-all"
          className="fo-c-span-12"
          right={
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('Filter by status')}>
              <button type="button" className="fo-c-filter" aria-pressed={!page.filter} onClick={() => lm.setFilter(null)}>{t('All')} <span className="font-mono">{page.total}</span></button>
              {LM_STATUSES.map((s) => (
                <button key={s} type="button" className="fo-c-filter" aria-pressed={page.filter === s} onClick={() => lm.setFilter(page.filter === s ? null : s)}>
                  {t(LM_STATUS_LABEL[s])} <span className="font-mono">{volume[s]}</span>
                </button>
              ))}
            </div>
          }
        >
          {rowError && <p className="mb-3 text-[12.5px] text-os-err">{rowError}</p>}
          {captures.setupHref && page.total > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px] text-os-muted">
              <CPill tone="warn">{t('Captures not tracked')}</CPill> {t('Connect Trakyo to count leads per page.')} <SetupLink href={captures.setupHref} hint={t('set TRAKYO_API_KEY')} />
            </div>
          )}
          {page.total === 0 ? (
            <div className="py-6 text-center">
              <p className="text-[13.5px] text-os-text">{t('No lead magnets yet.')}</p>
              <p className="mt-1 text-[12.5px] text-os-muted">{t('Register the first page you send people to.')}</p>
              {!writeBlocked && <button type="button" className="c-btn c-btn-primary mt-4" onClick={() => setEditing('new')}>{t('Register a page')}</button>}
            </div>
          ) : page.rows.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-[13.5px] text-os-text">{t('No {status} pages.', { status: page.filter ? t(LM_STATUS_LABEL[page.filter]).toLowerCase() : '' })}</p>
              <button type="button" className="c-btn mt-3" onClick={() => lm.setFilter(null)}>{t('Clear filter')}</button>
            </div>
          ) : (
            <table className="fo-c-table" data-wide="">
              <thead>
                <tr>
                  <th>{t('Name')}</th><th>{t('What they get')}</th><th>{t('Link')}</th><th>{t('Lands')}</th><th className="fo-c-hide-md">{t('Campaign')}</th><th>{t('Captures')}</th><th>{t('Status')}</th><th className="text-right">{t('Went live')}</th><th><span className="sr-only">{t('Actions')}</span></th>
                </tr>
              </thead>
              <tbody>
                {page.rows.map((r) => {
                  const blocked = rowBlocked(r);
                  return (
                    <tr key={r.id} data-dim={r.status === 'archived' || undefined}>
                      <td data-label={t('Name')} className="font-medium text-os-text">{r.name}</td>
                      <td data-label={t('What they get')} className="fo-c-brief" title={r.offer}>{r.offer || '—'}</td>
                      <td data-label={t('Link')}>
                        <span className="inline-flex items-center gap-1.5">
                          <a href={r.liveUrl} target="_blank" rel="noreferrer" className="font-mono text-[12px] text-os-accent hover:underline" title={r.liveUrl}>{r.linkLabel}</a>
                          <button type="button" className="fo-c-icon-btn" aria-label={t('Copy link to {name}', { name: r.name })} title={t('Copy link')} onClick={() => void copy(r)}><Copy size={13} strokeWidth={1.75} aria-hidden /></button>
                        </span>
                      </td>
                      <td data-label={t('Lands')}><CPill>{t(r.destinationLabel)}</CPill></td>
                      <td data-label={t('Campaign')} className="fo-c-hide-md text-os-muted">{r.campaign || '—'}</td>
                      <td data-label={t('Captures')} className="text-os-muted" title={t(page.capturesReason)}>{t(page.capturesNote)}</td>
                      <td data-label={t('Status')}>
                        {blocked ? (
                          <CPill tone={TONE[r.status]}>{t(r.statusLabel)}</CPill>
                        ) : (
                          <select className="fo-c-status" data-tone={TONE[r.status]} aria-label={t('Status of {name}', { name: r.name })} value={r.status}
                            onChange={async (e) => { setRowError(null); const res = await lm.setStatus(r.id, e.target.value as LeadMagnetStatus); if (!res.ok) setRowError(res.errors._form ?? t('Could not change the status.')); }}>
                            {LM_STATUSES.map((s) => <option key={s} value={s}>{t(LM_STATUS_LABEL[s])}</option>)}
                          </select>
                        )}
                      </td>
                      <td data-label={t('Went live')} className="text-right font-mono text-os-muted">{r.wentLiveLabel ?? '—'}</td>
                      <td className="fo-c-menu-cell whitespace-nowrap">
                        <a className="fo-c-icon-btn" href={r.liveUrl} target="_blank" rel="noreferrer" aria-label={t('Open {name}', { name: r.name })} title={t('Open link')}><ExternalLink size={13} strokeWidth={1.75} aria-hidden /></a>
                        <button type="button" className="fo-c-text-btn" onClick={() => setEditing(r)} disabled={Boolean(blocked)} title={blocked ?? undefined}>{t('Edit')}</button>
                        <button type="button" className="fo-c-text-btn" data-danger="" onClick={() => setDeleting(r)} disabled={Boolean(blocked)} title={blocked ?? undefined}>{t('Delete')}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CCard>
      </div>

      {editing && (
        <MagnetModal
          initial={editing === 'new' ? null : editing}
          busy={lm.busy === 'create' || (editing !== 'new' && lm.busy === `edit:${editing.id}`)}
          onClose={() => setEditing(null)}
          onSave={(f) => (editing === 'new' ? lm.create(f) : lm.update(editing.id, f))}
        />
      )}
      <CModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={deleting ? t('Delete {name}?', { name: deleting.name }) : t('Delete?')}
        width={420}
        footer={
          <>
            <button type="button" className="c-btn" data-dialog-close="" onClick={() => setDeleting(null)}>{t('Cancel')}</button>
            <button type="button" className="c-btn fo-c-danger" disabled={deleting ? lm.busy === `delete:${deleting.id}` : false}
              onClick={async () => { if (!deleting) return; const res = await lm.remove(deleting.id); setDeleting(null); if (!res.ok) setRowError(res.errors._form ?? t('Could not delete the record.')); }}>
              {t('Delete')}
            </button>
          </>
        }
      >
        <p className="text-[13px] text-os-text">{t('This removes the record, not the page.')}</p>
      </CModal>
    </div>
  );
}

function MagnetModal({ initial, busy, onClose, onSave }: { initial: LeadMagnetRow | null; busy: boolean; onClose: () => void; onSave: (f: MagnetForm) => Promise<SaveResult> }) {
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
  const err = (k: keyof MagnetForm) => errors[k] && <p className="mt-1 text-[12px] text-os-err">{errors[k]}</p>;
  return (
    <CModal
      open
      onClose={onClose}
      title={initial ? t('Edit {name}', { name: initial.name }) : t('Register a page')}
      width={560}
      footer={
        <>
          <button type="button" className="c-btn" onClick={onClose}>{t('Cancel')}</button>
          <button type="button" className="c-btn c-btn-primary" onClick={() => void submit()} disabled={busy}>{initial ? t('Save') : t('Register')}</button>
        </>
      }
    >
      <p className="mb-4 text-[12.5px] text-os-muted">{t('A record of the page, where it lives and where its leads go. Nothing is published from here.')}</p>
      <label className="fo-c-label" htmlFor="lm-c-name">{t('Name')}</label>
      <input id="lm-c-name" className="fo-c-input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder={PLACEHOLDERS.name} maxLength={120} aria-invalid={Boolean(errors.name)} />
      {err('name')}
      <label className="fo-c-label mt-3" htmlFor="lm-c-offer">{t('What they get')}</label>
      <input id="lm-c-offer" className="fo-c-input" value={f.offer} onChange={(e) => set('offer', e.target.value)} placeholder={PLACEHOLDERS.offer} maxLength={500} />
      <label className="fo-c-label mt-3" htmlFor="lm-c-url">{t('Live URL')}</label>
      <input id="lm-c-url" type="url" inputMode="url" className="fo-c-input font-mono" value={f.liveUrl} onChange={(e) => set('liveUrl', e.target.value)} placeholder={PLACEHOLDERS.liveUrl} aria-invalid={Boolean(errors.liveUrl)} />
      {err('liveUrl')}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="fo-c-label" htmlFor="lm-c-dest">{t('Where leads land')}</label>
          <select id="lm-c-dest" className="fo-c-input" value={f.destination} onChange={(e) => set('destination', e.target.value as MagnetForm['destination'])}>
            <option value="email">{t('Email list')}</option>
            <option value="booking">{t('Booking')}</option>
          </select>
        </div>
        <div>
          <label className="fo-c-label" htmlFor="lm-c-campaign">{t('Campaign it was built for')}</label>
          <input id="lm-c-campaign" className="fo-c-input" value={f.campaign} onChange={(e) => set('campaign', e.target.value)} placeholder={PLACEHOLDERS.campaign} maxLength={200} />
        </div>
        <div>
          <label className="fo-c-label" htmlFor="lm-c-status">{t('Status')}</label>
          <select id="lm-c-status" className="fo-c-input" value={f.status} onChange={(e) => set('status', e.target.value as LeadMagnetStatus)}>
            {LM_STATUSES.map((s) => <option key={s} value={s}>{t(LM_STATUS_LABEL[s])}</option>)}
          </select>
        </div>
        <div>
          <label className="fo-c-label" htmlFor="lm-c-live">{t('Went live')}</label>
          <input id="lm-c-live" type="date" className="fo-c-input font-mono" value={f.wentLiveAt} onChange={(e) => set('wentLiveAt', e.target.value)} />
        </div>
      </div>
      <label className="fo-c-label mt-3" htmlFor="lm-c-notes">{t('Notes')}</label>
      <textarea id="lm-c-notes" className="fo-c-input min-h-[72px] py-2" value={f.notes} onChange={(e) => set('notes', e.target.value)} maxLength={4000} />
      {errors._form && <p className="mt-3 text-[12.5px] text-os-err">{errors._form}</p>}
    </CModal>
  );
}
