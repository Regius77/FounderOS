'use client';

/**
 * /clients under the Classic style (founderos-ui pages/clients.md §7):
 * PageHeader, Request activity (8) + Request volume (4), Roster (4) + Work
 * requests (8), Request rhythm (12). Same view model and actions as the
 * GladOS tree; `os-*` tokens only.
 */
import { useMemo, useState } from 'react';
import { MoreHorizontal, Plus, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SetupLink } from '@/components/SetupLink';
import { CBars, CCard, CLineChart, CMeter, CModal, CPill, CSampleBadge, type PillTone } from '@/components/fo-classic/kit';
import { launchBlockedReason, writeBlockedReason, type ClientRosterRow, type ClientWorkRow, type ClientsView } from '@/lib/clients-view';
import type { ClientWorkStatus } from '@/lib/schemas';
import { BRIEF_PLACEHOLDER, LAUNCH_DIALOG_BODY, LAUNCH_DIALOG_TITLE, useClients } from './use-clients';
import type { ClientsSetup } from './ClientsG';
import { localeTag, t, tc } from '@/lib/i18n';

const TONE: Record<ClientWorkStatus, PillTone> = { draft: 'default', queued: 'default', running: 'accent', done: 'ok', failed: 'err' };

type Actions = ReturnType<typeof useClients>;

export function ClientsClassic({ view, setup }: { view: ClientsView; setup: ClientsSetup }) {
  const c = useClients();
  const [modal, setModal] = useState<'request' | 'confirm' | null>(null);
  const [openWork, setOpenWork] = useState<string | null>(null);
  const [openClient, setOpenClient] = useState<string | null>(null);
  const [launchId, setLaunchId] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const readOnly = writeBlockedReason(view);
  const newRequestBlocked = readOnly ?? (view.sample ? t('Sample data: add a client to write a real request') : view.roster.length === 0 ? t('Confirm or add a client first') : null);
  const rows = useMemo(() => (view.selected ? view.work.filter((w) => w.clientId === view.selected) : view.work), [view.work, view.selected]);
  const selectedName = view.roster.find((r) => r.clientId === view.selected)?.name ?? null;
  const work = view.work.find((w) => w.id === openWork) ?? null;
  const client = view.roster.find((r) => r.clientId === openClient) ?? null;
  const launchRow = view.work.find((w) => w.id === launchId) ?? null;

  const doLaunch = async () => {
    if (!launchRow) return;
    const r = await c.launch(launchRow.id);
    setLaunchId(null);
    if (!r.ok) {
      setLaunchError(r.error);
      setOpenWork(launchRow.id);
    }
  };

  return (
    <div className="cl-c">
      <PageHeader
        title={view.title}
        eyebrow={view.subtitle}
        right={
          <>
            {view.sample && <CSampleBadge title={view.mode === 'filming' ? t('Filming mode fixture, three invented clients') : t('Preview on a blank install, three invented clients')} />}
            <button type="button" className="c-btn c-btn-primary" onClick={() => setModal('request')} disabled={Boolean(newRequestBlocked)} title={newRequestBlocked ?? undefined}>
              <Plus size={14} strokeWidth={1.75} aria-hidden /> {t('New request')}
            </button>
          </>
        }
      />

      <div className="fo-c-grid">
        <CCard title={t('Request activity')} id="cl-c-activity" right={<span>{t('Last 14 days · {n} requested', { n: view.activity.total14 })}</span>} className="fo-c-span-8">
          <CLineChart
            labels={view.activity.labels}
            series={[
              { id: 'created', label: t('Requested'), values: view.activity.created, tone: 'accent' },
              { id: 'finished', label: t('Finished'), values: view.activity.finished, tone: 'muted' },
            ]}
            label={t('Requests made and finished per day, last 14 days')}
            empty={view.work.length === 0 ? t('Requests appear here as you save drafts.') : undefined}
          />
        </CCard>

        <CCard title={t('Request volume')} id="cl-c-volume" className="fo-c-span-4">
          <div className="mb-4 flex items-baseline gap-2">
            <span className="text-[34px] font-light leading-none tracking-[-0.02em] text-os-text">{view.volume.open}</span>
            <span className="text-[13px] text-os-muted">{tc('request', 'open')}</span>
          </div>
          <div className="flex flex-col gap-3.5">
            <CMeter label={t('Done this month')} value={view.volume.doneThisMonth} of={view.volume.thisMonth} tone="ok" />
            <CMeter label={t('Failed this month')} value={view.volume.failedThisMonth} of={view.volume.thisMonth} tone="err" />
            <CMeter label={tc('request', 'Open')} value={view.volume.open} of={view.volume.total} tone="accent" />
          </div>
          <p className="mt-4 text-[12px] text-os-dim">{view.volume.thisMonth === 1 ? t('{n} request this month', { n: view.volume.thisMonth }) : t('{n} requests this month', { n: view.volume.thisMonth })} · {t('{n} on record', { n: view.volume.total })}</p>
        </CCard>

        <CCard title={t('Roster')} id="cl-c-roster" right={view.roster.length ? <span>{view.roster.length === 1 ? t('{n} client', { n: view.roster.length }) : t('{n} clients', { n: view.roster.length })}</span> : undefined} className="fo-c-span-4">
          {view.attioState === 'not_configured' && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px] text-os-muted">
              <CPill tone="warn">{t('Attio not configured')}</CPill>
              <SetupLink href={setup.attio} hint={t('set ATTIO_API_KEY')} />
            </div>
          )}
          {view.attioState === 'error' && <p className="mb-3 text-[12.5px] text-os-err">{t('Attio did not answer. Confirmed clients still show.')}</p>}
          {view.roster.length > 0 ? (
            <ul className="divide-y divide-[var(--hairline)]">
              {view.roster.map((r) => (
                <li key={r.clientId}>
                  <button type="button" onClick={() => setOpenClient(r.clientId)} className="fo-c-row" data-selected={view.selected === r.clientId || undefined}>
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] text-os-text">{r.name}</span>
                      <span className="block truncate text-[12px] text-os-muted">{rosterMeta(r)}</span>
                    </span>
                    <CPill tone={r.retainer ? 'accent' : 'default'}>{r.retainer ? t('Retainer') : t('Project')}</CPill>
                  </button>
                </li>
              ))}
            </ul>
          ) : view.attioState === 'connected' ? (
            <p className="text-[13px] text-os-muted">{t('No confirmed clients. Confirm a client from your Attio deals.')}</p>
          ) : (
            <p className="text-[13px] text-os-muted">{t('No clients yet. Add one by hand to start a request.')}</p>
          )}
          <button type="button" className="c-btn mt-4" onClick={() => setModal('confirm')} disabled={Boolean(readOnly)} title={readOnly ?? undefined}>
            <UserPlus size={14} strokeWidth={1.75} aria-hidden /> {view.attioState === 'connected' ? t('Confirm a client') : t('Add client')}
          </button>
        </CCard>

        <CCard
          title={t('Work requests')}
          id="cl-c-work"
          className="fo-c-span-8"
          right={selectedName ? (
            <button type="button" className="c-chip" onClick={() => c.selectClient(null)} title={t("Show every client's requests")}>{selectedName} · {t('Clear')}</button>
          ) : <span>{view.work.length === 1 ? t('{n} request', { n: view.work.length }) : t('{n} requests', { n: view.work.length })}</span>}
        >
          {launchError && !work && <p className="mb-3 text-[12.5px] text-os-err">{launchError}</p>}
          {rows.length === 0 ? (
            <p className="text-[13px] text-os-muted">{selectedName ? t('No requests for {name} yet.', { name: selectedName }) : t('No work requests yet.')} {t('Write a brief for a confirmed client and save it as a draft.')}</p>
          ) : (
            <table className="fo-c-table">
              <thead>
                <tr><th>{t('Client')}</th><th>{t('Brief')}</th><th>{t('Status')}</th><th className="text-right">{t('Age')}</th><th><span className="sr-only">{t('Actions')}</span></th></tr>
              </thead>
              <tbody>
                {rows.map((w) => (
                  <tr key={w.id} onClick={(e) => { if (!(e.target as HTMLElement).closest('button')) setOpenWork(w.id); }}>
                    <td data-label={t('Client')}><button type="button" className="fo-c-link" onClick={() => setOpenWork(w.id)}>{w.clientName}</button></td>
                    <td data-label={t('Brief')} className="fo-c-brief" title={w.brief}>{w.briefLine}</td>
                    <td data-label={t('Status')}><CPill tone={TONE[w.status]}>{w.statusLabel}</CPill></td>
                    <td data-label={t('Age')} className="text-right font-mono text-os-muted">{w.age}</td>
                    <td className="fo-c-menu-cell">
                      <RowMenu w={w} view={view} c={c} open={menu === w.id} onOpen={(o) => setMenu(o ? w.id : null)} onLaunch={() => setLaunchId(w.id)} onOpenBrief={() => setOpenWork(w.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CCard>

        <CCard title={t('Request rhythm')} id="cl-c-rhythm" right={<span>{view.busiestDay ? `${t('Busiest day')} · ${view.busiestDay}` : t('By weekday')}</span>} className="fo-c-span-12">
          <CBars
            bars={view.rhythm.map((r) => ({ id: r.day, label: r.day, value: r.count }))}
            highlight={view.busiestDay}
            label={t('Requests by weekday, all time')}
            empty={view.work.length === 0 ? t('The weekday pattern shows once requests exist.') : undefined}
          />
        </CCard>
      </div>

      {modal === 'request' && <RequestModal view={view} c={c} setup={setup} onClose={() => setModal(null)} onLaunch={(id) => { setModal(null); setLaunchId(id); }} />}
      {modal === 'confirm' && <ConfirmModal view={view} c={c} setup={setup} onClose={() => setModal(null)} />}
      {work && <WorkModal view={view} w={work} c={c} setup={setup} error={launchError} onClose={() => { setOpenWork(null); setLaunchError(null); }} onLaunch={() => setLaunchId(work.id)} />}
      {client && <ClientModal view={view} r={client} c={c} onClose={() => setOpenClient(null)} />}
      <CModal
        open={Boolean(launchRow)}
        onClose={() => setLaunchId(null)}
        title={LAUNCH_DIALOG_TITLE}
        width={440}
        footer={
          <>
            <button type="button" className="c-btn" data-dialog-close="" onClick={() => setLaunchId(null)}>{t('Cancel')}</button>
            <button type="button" className="c-btn c-btn-primary" onClick={() => void doLaunch()} disabled={launchRow ? c.busy === `launch:${launchRow.id}` : false}>{t('Start draft')}</button>
          </>
        }
      >
        <p className="text-[13px] text-os-text">{LAUNCH_DIALOG_BODY}</p>
        {launchRow && <p className="mt-2 text-[12px] text-os-muted">{launchRow.clientName} · {launchRow.briefLine}</p>}
      </CModal>
    </div>
  );
}

function rosterMeta(r: ClientRosterRow): string {
  const parts = [r.company && r.company !== r.name ? r.company : null, r.slackChannel ? `#${r.slackChannel.replace(/^#/, '')}` : null, r.lastRequestAge ? t('last request {age} ago', { age: r.lastRequestAge }) : t('no requests yet')];
  return parts.filter(Boolean).join(' · ');
}

function RowMenu({ w, view, c, open, onOpen, onLaunch, onOpenBrief }: { w: ClientWorkRow; view: ClientsView; c: Actions; open: boolean; onOpen: (o: boolean) => void; onLaunch: () => void; onOpenBrief: () => void }) {
  const blocked = launchBlockedReason(view, w);
  const local = writeBlockedReason(view) ?? (w.sample ? t('Sample data: nothing is saved') : null);
  const item = (label: string, fn: () => void, reason: string | null, danger = false) => (
    <button type="button" role="menuitem" className="fo-c-menu-item" data-danger={danger || undefined} disabled={Boolean(reason)} title={reason ?? undefined} onClick={() => { onOpen(false); fn(); }}>
      {label}
    </button>
  );
  return (
    <div className="relative inline-block" onKeyDown={(e) => { if (e.key === 'Escape') onOpen(false); }}>
      <button type="button" className="fo-c-icon-btn" aria-haspopup="menu" aria-expanded={open} aria-label={t('Actions for {name}', { name: w.clientName })} onClick={() => onOpen(!open)}>
        <MoreHorizontal size={15} strokeWidth={1.75} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="fo-c-menu c-pop">
          {item(t('Open brief'), onOpenBrief, null)}
          {item(t('Start draft in Superset'), onLaunch, blocked)}
          {item(t('Mark done'), () => void c.setStatus(w.id, 'done'), local ?? (w.status === 'done' ? t('Already done') : null))}
          {item(t('Mark failed'), () => void c.setStatus(w.id, 'failed'), local ?? (w.status === 'failed' ? t('Already failed') : null), true)}
        </div>
      )}
    </div>
  );
}

const field = 'fo-c-input';

function RequestModal({ view, c, setup, onClose, onLaunch }: { view: ClientsView; c: Actions; setup: ClientsSetup; onClose: () => void; onLaunch: (id: string) => void }) {
  const [clientId, setClientId] = useState(view.selected ?? view.roster[0]?.clientId ?? '');
  const [brief, setBrief] = useState('');
  const [error, setError] = useState<string | null>(null);
  const launchBlocked = launchBlockedReason(view);
  const empty = !brief.trim();
  const save = async (thenLaunch: boolean) => {
    setError(null);
    const r = await c.saveDraft(clientId, brief.trim());
    if (!r.ok) return setError(r.error);
    if (thenLaunch && r.id) onLaunch(r.id);
    else onClose();
  };
  return (
    <CModal
      open
      onClose={onClose}
      title={t('New request')}
      footer={
        <>
          <button type="button" className="c-btn" onClick={() => void save(true)} disabled={empty || Boolean(launchBlocked)} title={empty ? t('Write a brief first') : launchBlocked ?? undefined}>{t('Start in Superset')}</button>
          <button type="button" className="c-btn c-btn-primary" onClick={() => void save(false)} disabled={empty || !clientId || c.busy === 'draft'}>{t('Save draft request')}</button>
        </>
      }
    >
      <p className="mb-4 text-[12.5px] text-os-muted">{t('Saved as a draft. Nothing starts until you launch it, and nothing is sent to the client.')}</p>
      <label className="fo-c-label" htmlFor="cl-c-client">{t('Client')}</label>
      <select id="cl-c-client" className={field} value={clientId} onChange={(e) => setClientId(e.target.value)}>
        {view.roster.map((r) => <option key={r.clientId} value={r.clientId}>{r.name}</option>)}
      </select>
      <label className="fo-c-label mt-3" htmlFor="cl-c-brief">{t('Brief')}</label>
      <textarea id="cl-c-brief" className={`${field} min-h-[140px] py-2`} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder={BRIEF_PLACEHOLDER} />
      {view.supersetState !== 'connected' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-os-muted">
          <CPill tone="warn">{t('Superset not configured')}</CPill> {t('Drafts save without it.')} <SetupLink href={setup.superset} hint={view.supersetDetail} />
        </div>
      )}
      {error && <p className="mt-3 text-[12.5px] text-os-err">{error}</p>}
    </CModal>
  );
}

function ConfirmModal({ view, c, setup, onClose }: { view: ClientsView; c: Actions; setup: ClientsSetup; onClose: () => void }) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState<string | null>(null);
  const add = async () => {
    setError(null);
    const r = await c.addManual(name.trim(), company.trim());
    if (r.ok) onClose();
    else setError(r.error);
  };
  return (
    <CModal open onClose={onClose} title={view.attioState === 'connected' ? t('Confirm a client') : t('Add client')}>
      <p className="mb-4 text-[12.5px] text-os-muted">{t('A payer is not a client until you confirm them here.')}</p>
      {view.attioState === 'connected' && (
        <div className="mb-5">
          <div className="fo-c-label">{t('Attio deals')}</div>
          {view.candidates.length === 0 ? (
            <p className="text-[13px] text-os-muted">{t('Every Attio deal is already confirmed.')}</p>
          ) : (
            <ul className="max-h-[220px] divide-y divide-[var(--hairline)] overflow-y-auto rounded-sm-t border border-os-border">
              {view.candidates.map((d) => (
                <li key={d.clientId} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0"><span className="block truncate text-[13px]">{d.name}</span><span className="block text-[11.5px] text-os-dim">{d.status || t('No stage')}</span></span>
                  <button type="button" className="c-btn h-[28px]" disabled={c.busy === `confirm:${d.clientId}`} onClick={async () => { const r = await c.confirmAttio(d.clientId, d.name); if (!r.ok) setError(r.error); }}>{t('Confirm')}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {view.attioState === 'not_configured' && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[12.5px] text-os-muted">
          <CPill tone="warn">{t('Attio not configured')}</CPill> <SetupLink href={setup.attio} hint={t('set ATTIO_API_KEY')} />
        </div>
      )}
      <div className="fo-c-label">{t('Add by hand')}</div>
      <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Client or contact name')} aria-label={t('Name')} maxLength={200} />
      <input className={`${field} mt-2`} value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t('Company (optional)')} aria-label={t('Company')} maxLength={200} />
      <div className="mt-3 flex justify-end">
        <button type="button" className="c-btn c-btn-primary" onClick={() => void add()} disabled={!name.trim() || c.busy === 'add'}>{t('Add client')}</button>
      </div>
      {error && <p className="mt-3 text-[12.5px] text-os-err">{error}</p>}
    </CModal>
  );
}

function WorkModal({ view, w, c, setup, error, onClose, onLaunch }: { view: ClientsView; w: ClientWorkRow; c: Actions; setup: ClientsSetup; error: string | null; onClose: () => void; onLaunch: () => void }) {
  const blocked = launchBlockedReason(view, w);
  const local = writeBlockedReason(view) ?? (w.sample ? t('Sample data: nothing is saved') : null);
  return (
    <CModal
      open
      onClose={onClose}
      title={w.clientName}
      footer={
        <>
          <button type="button" className="c-btn" onClick={() => void c.setStatus(w.id, 'failed')} disabled={Boolean(local) || w.status === 'failed'} title={local ?? undefined}>{t('Mark failed')}</button>
          <button type="button" className="c-btn" onClick={() => void c.setStatus(w.id, 'done')} disabled={Boolean(local) || w.status === 'done'} title={local ?? undefined}>{t('Mark done')}</button>
          <button type="button" className="c-btn c-btn-primary" onClick={onLaunch} disabled={Boolean(blocked)} title={blocked ?? undefined}>{w.status === 'failed' ? t('Retry in Superset') : t('Start draft in Superset')}</button>
        </>
      }
    >
      <CPill tone={TONE[w.status]}>{w.statusLabel}</CPill>
      <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-[1.55] text-os-text">{w.brief}</p>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12.5px]">
        <dt className="text-os-muted">{t('Requested')}</dt><dd className="font-mono">{new Date(w.createdAt).toLocaleString(localeTag())}</dd>
        {w.finishedAt && (<><dt className="text-os-muted">{w.status === 'failed' ? t('Failed') : t('Finished')}</dt><dd className="font-mono">{new Date(w.finishedAt).toLocaleString(localeTag())}</dd></>)}
        {w.supersetWorkspace && (<><dt className="text-os-muted">{t('Superset workspace')}</dt><dd className="font-mono">{w.supersetWorkspace}</dd></>)}
      </dl>
      {w.detail && <p className={`mt-3 text-[12.5px] ${w.status === 'failed' ? 'text-os-err' : 'text-os-muted'}`}>{w.detail}</p>}
      {error && <p className="mt-3 text-[12.5px] text-os-err">{error}</p>}
      {view.supersetState !== 'connected' && view.mode === 'live' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-os-muted"><CPill tone="warn">{t('Superset not configured')}</CPill> <SetupLink href={setup.superset} hint={view.supersetDetail} /></div>
      )}
    </CModal>
  );
}

function ClientModal({ view, r, c, onClose }: { view: ClientsView; r: ClientRosterRow; c: Actions; onClose: () => void }) {
  const [retainer, setRetainer] = useState(r.retainer);
  const [slack, setSlack] = useState(r.slackChannel ?? '');
  const [project, setProject] = useState(r.supersetProject ?? '');
  const [arm, setArm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const local = writeBlockedReason(view) ?? (view.sample ? t('Sample data: nothing is saved') : null);
  const dirty = retainer !== r.retainer || slack !== (r.slackChannel ?? '') || project !== (r.supersetProject ?? '');
  return (
    <CModal
      open
      onClose={onClose}
      title={r.name}
      footer={
        <>
          {arm ? (
            <button type="button" className="c-btn fo-c-danger" disabled={c.busy === `unconfirm:${r.clientId}`} onClick={async () => { const res = await c.unconfirm(r.clientId); if (res.ok) onClose(); else setError(res.error); }}>{t('Unconfirm {name}: they leave the roster', { name: r.name })}</button>
          ) : (
            <button type="button" className="c-btn" onClick={() => setArm(true)} disabled={Boolean(local)} title={local ?? undefined}>{t('Unconfirm')}</button>
          )}
          <button type="button" className="c-btn c-btn-primary" disabled={Boolean(local) || !dirty || c.busy === `edit:${r.clientId}`} title={local ?? undefined}
            onClick={async () => { setError(null); const res = await c.editClient({ clientId: r.clientId, name: r.name, retainer, slackChannel: slack.trim(), supersetProject: project.trim() }); if (!res.ok) setError(res.error); }}>
            {t('Save')}
          </button>
        </>
      }
    >
      <p className="mb-3 text-[12.5px] text-os-muted">{r.source === 'attio' ? t('Attio deal') : t('Added by hand')} · {t('confirmed {date}', { date: new Date(r.confirmedAt).toLocaleDateString(localeTag()) })}</p>
      <button type="button" className="c-chip mb-4" onClick={() => { c.selectClient(r.clientId); onClose(); }}>{t("Show this client's requests")}</button>
      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" checked={retainer} onChange={(e) => setRetainer(e.target.checked)} disabled={Boolean(local)} /> {t('On retainer')}
      </label>
      <label className="fo-c-label mt-3" htmlFor="cl-c-slack">{t('Slack channel')}</label>
      <input id="cl-c-slack" className={field} value={slack} onChange={(e) => setSlack(e.target.value)} placeholder={t('client-name or C0123ABCD')} disabled={Boolean(local)} />
      {r.slackHref && <a className="mt-1 inline-block text-[12.5px] text-os-accent" href={r.slackHref} target="_blank" rel="noreferrer">{t('Open Slack channel')}</a>}
      <label className="fo-c-label mt-3" htmlFor="cl-c-project">{t('Superset project')}</label>
      <input id="cl-c-project" className={field} value={project} onChange={(e) => setProject(e.target.value)} placeholder={t('Project id (empty uses SUPERSET_PROJECT_ID)')} disabled={Boolean(local)} />
      {error && <p className="mt-3 text-[12.5px] text-os-err">{error}</p>}
    </CModal>
  );
}
