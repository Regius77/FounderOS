'use client';

/**
 * /lead-magnets under the GladOS style (founderos-ui pages/lead-magnets.md §6).
 * No hero: the page is a table. Pages shipped (12 weeks) and Where leads land
 * on top, then the filterable table. Captures say "Not tracked" with the
 * reason and a Trakyo Set up link when unkeyed, never 0 (LM-3).
 */
import { useState } from 'react';
import { Copy, ExternalLink, MoreHorizontal, Plus } from 'lucide-react';
import {
  GBarChart, GButton, GCard, GChip, GDateTime, GDialog, GDonut, GEmpty, GErrorLine, GField, GInput, GList, GMenu, GPage, GRow, GSampleBadge,
  GSectionHeader, GSegmented, GSelect, GSheet, GTable, GTag, GTextarea, useToast, type GColumn, type GTagTone,
} from '@/components/g';
import { LM_STATUSES, LM_STATUS_LABEL, type LeadMagnetRow, type LeadMagnetsPage } from '@/lib/lead-magnets';
import type { LeadMagnetStatus } from '@/lib/schemas';
import { EMPTY_FORM, PLACEHOLDERS, copyText, formFrom, useLeadMagnets, validateForm, type MagnetForm, type SaveResult } from './use-lead-magnets';
import { t, tc } from '@/lib/i18n';

export const LM_TONE: Record<LeadMagnetStatus, GTagTone> = { live: 'ok', draft: 'neutral', paused: 'warn', archived: 'outline' };
const STATUS_OPTIONS = LM_STATUSES.map((s) => ({ value: s, label: t(LM_STATUS_LABEL[s]) }));

export function LeadMagnetsG({ page }: { page: LeadMagnetsPage }) {
  const lm = useLeadMagnets();
  const { toast } = useToast();
  const [editing, setEditing] = useState<LeadMagnetRow | 'new' | null>(null);
  const [deleting, setDeleting] = useState<LeadMagnetRow | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const filming = page.mode === 'filming';
  const writeBlocked = filming ? t('Filming mode: read only') : null;
  const rowBlocked = (r: LeadMagnetRow) => writeBlocked ?? (r.sample ? t('Sample data: register a real page to edit') : null);
  const { volume, destinations, captures } = page.view;

  const copy = async (r: LeadMagnetRow) => {
    toast((await copyText(r.liveUrl)) ? { text: t('Link copied'), tone: 'ok' } : { text: t('The browser blocked the clipboard'), tone: 'err' });
  };
  const changeStatus = async (r: LeadMagnetRow, s: LeadMagnetStatus) => {
    setRowError(null);
    const res = await lm.setStatus(r.id, s);
    if (!res.ok) setRowError(res.errors._form ?? t('Could not change the status.'));
  };
  const doDelete = async () => {
    if (!deleting) return;
    const res = await lm.remove(deleting.id);
    setDeleting(null);
    if (!res.ok) setRowError(res.errors._form ?? t('Could not delete the record.'));
  };

  const capturesCell = (
    <span className="lm-g-captures" title={t(page.capturesReason)}>
      {t(page.capturesNote)}
    </span>
  );

  const menu = (r: LeadMagnetRow) => {
    const blocked = rowBlocked(r);
    return (
      <GMenu
        label={t('Actions for {name}', { name: r.name })}
        items={[
          { id: 'open', label: t('Open link'), onSelect: () => window.open(r.liveUrl, '_blank', 'noopener,noreferrer'), icon: <ExternalLink size={13} aria-hidden /> },
          { id: 'copy', label: t('Copy link'), onSelect: () => void copy(r), icon: <Copy size={13} aria-hidden /> },
          { id: 'edit', label: t('Edit'), onSelect: () => setEditing(r), disabled: Boolean(blocked), disabledReason: blocked ?? undefined },
          { id: 'delete', label: t('Delete'), danger: true, onSelect: () => setDeleting(r), disabled: Boolean(blocked), disabledReason: blocked ?? undefined },
        ]}
        trigger={(p) => (
          <GButton {...p} variant="icon" size="sm" aria-label={t('Actions for {name}', { name: r.name })} title={t('Actions')}>
            <MoreHorizontal size={15} strokeWidth={1.75} aria-hidden />
          </GButton>
        )}
      />
    );
  };

  const columns: GColumn<LeadMagnetRow>[] = [
    { key: 'name', label: t('Name'), sortValue: (r) => r.name.toLowerCase(), render: (r) => <span className="lm-g-name">{r.name}</span> },
    { key: 'offer', label: t('What they get'), render: (r) => <span className="lm-g-offer" data-col="offer" title={r.offer}>{r.offer || '—'}</span> },
    {
      key: 'link',
      label: t('Link'),
      render: (r) => (
        <span className="lm-g-link">
          <span className="lm-g-host" title={r.liveUrl}>{r.linkLabel}</span>
          <GButton variant="icon" size="compact" href={r.liveUrl} external aria-label={t('Open {name} in a new tab', { name: r.name })} title={t('Open link')}>
            <ExternalLink size={13} strokeWidth={1.75} aria-hidden />
          </GButton>
          <GButton variant="icon" size="compact" aria-label={t('Copy link to {name}', { name: r.name })} title={t('Copy link')} onClick={() => void copy(r)}>
            <Copy size={13} strokeWidth={1.75} aria-hidden />
          </GButton>
        </span>
      ),
    },
    { key: 'lands', label: t('Lands'), sortValue: (r) => r.destination, render: (r) => <GTag tone="outline" size="xs">{t(r.destinationLabel)}</GTag> },
    { key: 'campaign', label: t('Campaign'), render: (r) => <span className="lm-g-campaign" data-col="campaign">{r.campaign || '—'}</span> },
    { key: 'captures', label: t('Captures'), render: () => capturesCell },
    {
      key: 'status',
      label: t('Status'),
      sortValue: (r) => LM_STATUSES.indexOf(r.status),
      render: (r) =>
        rowBlocked(r) ? (
          <GTag tone={LM_TONE[r.status]} dot size="xs">{t(r.statusLabel)}</GTag>
        ) : (
          <GSelect size="compact" aria-label={t('Status of {name}', { name: r.name })} value={r.status} options={STATUS_OPTIONS} className="lm-g-status" onChange={(e) => void changeStatus(r, e.target.value as LeadMagnetStatus)} />
        ),
    },
    { key: 'live', label: t('Went live'), align: 'right', sortValue: (r) => r.wentLiveAt ?? '', render: (r) => <span className="lm-g-cap">{r.wentLiveLabel ?? '—'}</span> },
    { key: 'menu', label: <span className="sr-only">{t('Actions')}</span>, align: 'right', render: (r) => menu(r) },
  ];

  const emailN = destinations ? Math.round(destinations.email * volume.live) : 0;
  const bookingN = volume.live - emailN;
  const subtitle = page.total === 1 ? t('{n} page · {live} live', { n: page.total, live: volume.live }) : t('{n} pages · {live} live', { n: page.total, live: volume.live });

  return (
    <GPage className="lm-g">
      <GSectionHeader
        size="page"
        title={t(page.title)}
        caption={subtitle}
        action={
          <div className="lm-g-head-actions">
            {page.sample && <GSampleBadge fixture={filming ? t('Filming mode fixture, four invented pages') : t('Preview on a blank install, four invented pages')} />}
            <GButton variant="ink" onClick={() => setEditing('new')} disabled={Boolean(writeBlocked)} disabledReason={writeBlocked ?? undefined}>
              <Plus size={14} strokeWidth={1.75} aria-hidden /> {t('Register a page')}
            </GButton>
          </div>
        }
      />

      <div className="lm-g-top">
        <GCard p={24} className="lm-g-shipped" aria-labelledby="lm-g-shipped">
          <GSectionHeader id="lm-g-shipped" size={22} title={t('Pages shipped')} action={<span className="lm-g-cap">{t('12 weeks')}</span>} />
          <GBarChart
            variant="series"
            bars={page.weeks.labels.map((l, i) => ({ id: String(i), label: page.weeks.axisLabels[i], value: page.weeks.counts[i], tip: { title: l, lines: [t('{n} went live', { n: page.weeks.counts[i] })] } }))}
            height={180}
            highlight={null}
            state={page.weeks.counts.some((n) => n > 0) ? 'ready' : 'empty'}
            emptyText={t('Pages with a went-live date fill this in, week by week.')}
            label={t('Lead magnet pages that went live per week, last 12 weeks')}
          />
        </GCard>
        <GCard p={24} className="lm-g-lands" aria-labelledby="lm-g-lands">
          <GSectionHeader id="lm-g-lands" size={22} title={t('Where leads land')} action={<span className="lm-g-cap">{t('Live pages')}</span>} />
          {destinations ? (
            <GDonut
              size={150}
              stroke={14}
              slices={[
                { id: 'email', label: t('Email list'), value: emailN, color: 'accent' },
                { id: 'booking', label: t('Booking'), value: bookingN, color: 'series-3' },
              ]}
              centreLabel={volume.live === 1 ? t('live page') : t('live pages')}
              label={t('Where leads land: {email} email, {booking} booking', { email: emailN, booking: bookingN })}
            />
          ) : (
            <GEmpty inline title={t('Nothing live yet.')} body={t('Set a page to Live to see where its leads go.')} />
          )}
        </GCard>
      </div>

      <GCard p={24} className="lm-g-table-card" aria-labelledby="lm-g-all">
        <div className="lm-g-table-head">
          <GSectionHeader id="lm-g-all" size={22} title={t('All pages')} />
          <div className="lm-g-chips" role="group" aria-label={t('Filter by status')}>
            <GChip size="compact" pressed={!page.filter} onPressedChange={() => lm.setFilter(null)} count={page.total}>{t('All')}</GChip>
            {LM_STATUSES.map((s) => (
              <GChip key={s} size="compact" pressed={page.filter === s} onPressedChange={(on) => lm.setFilter(on ? s : null)} count={volume[s]}>
                {t(LM_STATUS_LABEL[s])}
              </GChip>
            ))}
          </div>
        </div>
        {rowError && <GErrorLine align="left">{rowError}</GErrorLine>}
        {page.total > 0 && (
          <div className="lm-g-track" title={t(page.capturesReason)}>
            <GTag tone="outline" size="xs">{t('Captures not tracked')}</GTag>
            <span>{captures.setupHref ? t('Connect Trakyo to count leads per page.') : t(page.capturesReason)}</span>
            {captures.setupHref && <GButton size="sm" href={captures.setupHref} title={t('set TRAKYO_API_KEY')}>{t('Set up')}</GButton>}
          </div>
        )}
        {page.total === 0 ? (
          <GEmpty title={t('No lead magnets yet.')} body={t('Register the first page you send people to.')} action={writeBlocked ? undefined : { label: t('Register a page'), onClick: () => setEditing('new') }} />
        ) : page.rows.length === 0 ? (
          <GEmpty title={t('No {status} pages.', { status: page.filter ? t(LM_STATUS_LABEL[page.filter]).toLowerCase() : '' })} action={{ label: t('Clear filter'), onClick: () => lm.setFilter(null) }} />
        ) : (
          <>
            <div className="lm-g-table">
              <GTable columns={columns} rows={page.rows} rowKey={(r) => r.id} caption={t('Lead magnets')} sticky={false} rowDim={(r) => r.status === 'archived'} />
            </div>
            <div className="lm-g-list">
              <GList divided label={t('Lead magnets')}>
                {page.rows.map((r) => (
                  <GRow
                    key={r.id}
                    title={<span className="lm-g-row-title"><span className="lm-g-name">{r.name}</span><GTag tone={LM_TONE[r.status]} dot size="xs">{t(r.statusLabel)}</GTag></span>}
                    meta={`${r.linkLabel} · ${t(r.destinationLabel)}`}
                    trailing={<span className="lm-g-cap" title={t(page.capturesReason)}>{t(page.capturesNote)}</span>}
                    onClick={rowBlocked(r) ? () => void copy(r) : () => setEditing(r)}
                    hint={rowBlocked(r) ? t('Copy link') : t('Edit')}
                  />
                ))}
              </GList>
            </div>
          </>
        )}
      </GCard>

      {editing && (
        <MagnetSheet
          initial={editing === 'new' ? null : editing}
          busy={lm.busy === 'create' || (editing !== 'new' && lm.busy === `edit:${editing.id}`)}
          onClose={() => setEditing(null)}
          onSave={(f) => (editing === 'new' ? lm.create(f) : lm.update(editing.id, f))}
        />
      )}
      <GDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        tone="danger"
        title={deleting ? t('Delete {name}?', { name: deleting.name }) : t('Delete?')}
        confirmLabel={t('Delete')}
        onConfirm={() => void doDelete()}
        busy={deleting ? lm.busy === `delete:${deleting.id}` : false}
      >
        <p className="lm-g-dialog-copy">{t('This removes the record, not the page.')}</p>
      </GDialog>
    </GPage>
  );
}

function MagnetSheet({ initial, busy, onClose, onSave }: { initial: LeadMagnetRow | null; busy: boolean; onClose: () => void; onSave: (f: MagnetForm) => Promise<SaveResult> }) {
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

  return (
    <GSheet
      open
      onClose={onClose}
      title={initial ? t('Edit {name}', { name: initial.name }) : t('Register a page')}
      caption={t('A record of the page, where it lives and where its leads go. Nothing is published from here.')}
      width={540}
      footer={
        <div className="lm-g-sheet-foot">
          <GButton onClick={onClose}>{t('Cancel')}</GButton>
          <GButton variant="ink" onClick={() => void submit()} busy={busy}>{initial ? t('Save') : tc('button', 'Register')}</GButton>
        </div>
      }
    >
      <div className="lm-g-form">
        <GField label={t('Name')} htmlFor="lm-g-name" error={errors.name}>
          <GInput id="lm-g-name" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder={PLACEHOLDERS.name} maxLength={120} invalid={Boolean(errors.name)} />
        </GField>
        <GField label={t('What they get')} htmlFor="lm-g-offer" error={errors.offer}>
          <GInput id="lm-g-offer" value={f.offer} onChange={(e) => set('offer', e.target.value)} placeholder={PLACEHOLDERS.offer} maxLength={500} />
        </GField>
        <GField label={t('Live URL')} htmlFor="lm-g-url" error={errors.liveUrl}>
          <GInput id="lm-g-url" type="url" inputMode="url" value={f.liveUrl} onChange={(e) => set('liveUrl', e.target.value)} placeholder={PLACEHOLDERS.liveUrl} invalid={Boolean(errors.liveUrl)} />
        </GField>
        <GField label={t('Where leads land')}>
          <GSegmented label={t('Where leads land')} value={f.destination} onChange={(v) => set('destination', v)} options={[{ value: 'email', label: t('Email list') }, { value: 'booking', label: t('Booking') }]} />
        </GField>
        <GField label={t('Campaign it was built for')} htmlFor="lm-g-campaign" error={errors.campaign}>
          <GInput id="lm-g-campaign" value={f.campaign} onChange={(e) => set('campaign', e.target.value)} placeholder={PLACEHOLDERS.campaign} maxLength={200} />
        </GField>
        <div className="lm-g-form-row">
          <GField label={t('Status')} htmlFor="lm-g-status">
            <GSelect id="lm-g-status" value={f.status} onChange={(e) => set('status', e.target.value as LeadMagnetStatus)} options={STATUS_OPTIONS} />
          </GField>
          <GField label={t('Went live')} htmlFor="lm-g-live" error={errors.wentLiveAt}>
            <GDateTime id="lm-g-live" kind="date" value={f.wentLiveAt} onChange={(e) => set('wentLiveAt', e.target.value)} />
          </GField>
        </div>
        <GField label={t('Notes')} htmlFor="lm-g-notes">
          <GTextarea id="lm-g-notes" value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={3} maxLines={8} maxLength={4000} />
        </GField>
        {errors._form && <GErrorLine align="left">{errors._form}</GErrorLine>}
      </div>
    </GSheet>
  );
}
