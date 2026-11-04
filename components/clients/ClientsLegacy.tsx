'use client';

/**
 * /clients under the Bennett Legacy style (pages/clients.md §8): FounderOS's
 * ClientsView. Hero 2fr/1fr (Request Activity step line, Request Volume
 * meters), then Request Rhythm dot matrix, the Roster and the busiest-day
 * insight, then the inline draft-first request and the work board. Same view
 * model (lib/clients-view.ts) and actions (use-clients.ts) as the other trees;
 * Legacy kit and --l-* tokens only. No fee, term or revenue anywhere (CL-4).
 */
import { useMemo, useState } from 'react';
import { CalendarDays, Plus, UserPlus } from 'lucide-react';
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
  type BadgeTone,
  type Meter,
} from '@/components/legacy';
import { launchBlockedReason, writeBlockedReason, type ClientRosterRow, type ClientWorkRow, type ClientsView } from '@/lib/clients-view';
import type { ClientWorkStatus } from '@/lib/schemas';
import { BRIEF_PLACEHOLDER, LAUNCH_DIALOG_BODY, LAUNCH_DIALOG_TITLE, useClients } from './use-clients';
import type { ClientsSetup } from './ClientsG';
import { localeTag, t, tc } from '@/lib/i18n';

const TONE: Record<ClientWorkStatus, BadgeTone> = { draft: 'default', queued: 'default', running: 'accent', done: 'ok', failed: 'err' };
const nRequests = (n: number) => (n === 1 ? t('{n} request', { n }) : t('{n} requests', { n }));
const nClients = (n: number) => (n === 1 ? t('{n} client', { n }) : t('{n} clients', { n }));
const frac = (n: number, of: number) => (of > 0 ? n / of : 0);

type Actions = ReturnType<typeof useClients>;

export function ClientsLegacy({ view, setup }: { view: ClientsView; setup: ClientsSetup }) {
  const c = useClients();
  const [modal, setModal] = useState<'confirm' | null>(null);
  const [openWork, setOpenWork] = useState<string | null>(null);
  const [openClient, setOpenClient] = useState<string | null>(null);
  const [launchId, setLaunchId] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const readOnly = writeBlockedReason(view);
  const newRequestBlocked = readOnly ?? (view.sample ? t('Sample data: add a client to write a real request') : view.roster.length === 0 ? t('Confirm or add a client first') : null);
  const rows = useMemo(() => (view.selected ? view.work.filter((w) => w.clientId === view.selected) : view.work), [view.work, view.selected]);
  const selectedName = view.roster.find((r) => r.clientId === view.selected)?.name ?? null;
  const work = view.work.find((w) => w.id === openWork) ?? null;
  const client = view.roster.find((r) => r.clientId === openClient) ?? null;
  const launchRow = view.work.find((w) => w.id === launchId) ?? null;
  const v = view.volume;
  const busiest = view.busiestDay ? (view.rhythm.find((r) => r.day === view.busiestDay)?.count ?? 0) : 0;

  const doLaunch = async () => {
    if (!launchRow) return;
    const r = await c.launch(launchRow.id);
    setLaunchId(null);
    if (!r.ok) {
      setLaunchError(r.error);
      setOpenWork(launchRow.id);
    }
  };

  const meters: Meter[] = [
    { label: `${t('Done this month')} (${v.doneThisMonth}/${v.thisMonth})`, frac: frac(v.doneThisMonth, v.thisMonth), display: t('{done} of {total}', { done: v.doneThisMonth, total: v.thisMonth }), hue: 'var(--l-ok)' },
    { label: `${t('Failed this month')} (${v.failedThisMonth}/${v.thisMonth})`, frac: frac(v.failedThisMonth, v.thisMonth), display: t('{done} of {total}', { done: v.failedThisMonth, total: v.thisMonth }), hue: 'var(--l-err)' },
    { label: `${tc('request', 'Open')} (${v.open}/${v.total})`, frac: frac(v.open, v.total), display: t('{done} of {total}', { done: v.open, total: v.total }) },
  ];

  return (
    <div data-l="ClientsLegacy" className="l-page">
      <SlabTitle
        eyebrow={view.subtitle}
        title={view.title}
        meta={`${view.roster.length === 1 ? t('{n} confirmed client', { n: view.roster.length }) : t('{n} confirmed clients', { n: view.roster.length })} · ${t('{requests} on record', { requests: nRequests(v.total) })} · ${t('drafts never reach the client')}`}
        right={
          <>
            {view.sample && (
              <span title={view.mode === 'filming' ? t('Filming mode fixture, three invented clients') : t('Preview on a blank install, three invented clients')}>
                <LSampleChip />
              </span>
            )}
            {view.roster.length > 0 && <Chip tone="ok">{t('{n} confirmed', { n: view.roster.length })}</Chip>}
            <Chip tone={view.supersetState === 'connected' ? 'ok' : 'warn'}>{view.supersetState === 'connected' ? t('Superset ready') : t('Superset off')}</Chip>
          </>
        }
      />

      <div className="l-stack">
        <div className="l-row l-row-hero">
          <SlabCard title={t('Request Activity')} sub={t('last 14 days')} i={1}>
            <div className="l-card-body pb-2">
              <BigStat value={view.activity.total14} size={30} chips={[{ tone: 'accent', text: t('{n} finished', { n: view.activity.finished.reduce((a, b) => a + b, 0) }) }]} caption={t('requests made, day by day')} />
            </div>
            <StepLine
              series={view.activity.labels.map((label, i) => ({ label, count: view.activity.created[i] }))}
              unit={t(' requested')}
              empty={view.work.length === 0 ? t('Requests appear here as you save drafts.') : t('No requests in the last 14 days.')}
            />
          </SlabCard>
          <SlabCard title={t('Request Volume')} sub={t('this month')} i={2} className="flex flex-col">
            <div className="l-card-body flex flex-1 flex-col">
              <BigStat value={v.open} unit={tc('request', 'open')} chips={v.failedThisMonth ? [{ tone: 'err', text: t('{n} failed', { n: v.failedThisMonth }) }] : []} caption={v.thisMonth === 1 ? t('{n} request this month', { n: v.thisMonth }) : t('{n} requests this month', { n: v.thisMonth })} />
              <MeterStack meters={meters} foot={`${t('{n} on record', { n: v.total })} · ${t('drafts first')}`} />
            </div>
          </SlabCard>
        </div>

        <div className="l-row l-row-three">
          <SlabCard title={t('Request Rhythm')} sub={t('by weekday, all time')} i={3}>
            <div className="l-card-body l-cl-rhythm">
              {view.work.length === 0 ? (
                <p className="l-body-text">{t('The weekday pattern shows once requests exist.')}</p>
              ) : (
                <>
                  <BigStat display={view.busiestDay ?? '-'} size={30} caption={t('busiest day')} />
                  <DotMatrix cols={view.rhythm.map((r) => ({ label: r.day, count: r.count }))} />
                </>
              )}
            </div>
          </SlabCard>
          <SlabCard
            title={t('Roster')}
            sub={view.roster.length ? nClients(view.roster.length) : t('confirmed clients only')}
            i={4}
            action={
              <Pressable onClick={() => setModal('confirm')} disabled={Boolean(readOnly)} title={readOnly ?? undefined}>
                <UserPlus size={12} strokeWidth={1.7} aria-hidden /> {view.attioState === 'connected' ? t('Confirm') : t('Add')}
              </Pressable>
            }
          >
            {view.attioState === 'not_configured' && <LUnconfigured what="Attio" href={setup.attio} hint={t('set ATTIO_API_KEY')} />}
            {view.attioState === 'error' && <p className="l-err-text l-pad-x pt-3">{t('Attio did not answer. Confirmed clients still show.')}</p>}
            {view.roster.length > 0 ? (
              <ul className="l-rows l-rows-ruled mt-3">
                {view.roster.map((r) => (
                  <li key={r.clientId}>
                    <Pressable tone="row" className="l-cl-roster" onClick={() => setOpenClient(r.clientId)} aria-current={view.selected === r.clientId || undefined}>
                      <span className="min-w-0">
                        <span className="l-sym">{r.name}</span>
                        <span className="l-sub-line">{rosterMeta(r)}</span>
                      </span>
                      <Badge tone={r.retainer ? 'accent' : 'default'}>{r.retainer ? t('Retainer') : t('Project')}</Badge>
                    </Pressable>
                  </li>
                ))}
              </ul>
            ) : (
              <LEmpty>{view.attioState === 'connected' ? t('No confirmed clients. Confirm a client from your Attio deals.') : t('No clients yet. Add one by hand to start a request.')}</LEmpty>
            )}
          </SlabCard>
          <InsightCard
            badge={view.busiestDay ? `${t('Busiest day')} · ${view.busiestDay}` : t('Busiest day')}
            icon={<CalendarDays size={13} strokeWidth={1.7} aria-hidden />}
            value={view.work.length ? busiest : null}
            display={view.work.length ? undefined : '-'}
            headline={view.work.length ? (busiest === 1 ? t('request lands on {day} more than any other day.', { day: view.busiestDay ?? '' }) : t('requests land on {day} more than any other day.', { day: view.busiestDay ?? '' })) : t('No requests yet.')}
            body={view.work.length ? t('{requests} open now across {clients}.', { requests: nRequests(v.open), clients: nClients(view.roster.length) }) : t('Save a draft request for a confirmed client and the rhythm starts here.')}
            frac={frac(busiest, v.total)}
            i={5}
          />
        </div>

        <NewRequest view={view} c={c} setup={setup} blocked={newRequestBlocked} onLaunch={(id) => setLaunchId(id)} />

        <SlabCard
          title={t('Work requests')}
          sub={selectedName ? t('{name} only', { name: selectedName }) : nRequests(view.work.length)}
          i={7}
          action={
            selectedName ? (
              <Pressable onClick={() => c.selectClient(null)} title={t("Show every client's requests")}>
                {t('Clear filter')}
              </Pressable>
            ) : undefined
          }
        >
          {launchError && !work && <p className="l-err-text l-pad-x pt-3">{launchError}</p>}
          {rows.length === 0 ? (
            <LEmpty>{selectedName ? t('No requests for {name} yet.', { name: selectedName }) : t('No work requests yet.')} {t('Write a brief for a confirmed client and save it as a draft.')}</LEmpty>
          ) : (
            <ul className="l-rows l-rows-ruled mt-3">
              {rows.map((w) => (
                <li key={w.id}>
                  <Pressable tone="row" className="l-cl-work" onClick={() => setOpenWork(w.id)} title={w.brief}>
                    <span className="l-sym l-cl-who">{w.clientName}</span>
                    <span className="l-cl-brief">{w.briefLine}</span>
                    <Badge tone={TONE[w.status]}>{w.statusLabel}</Badge>
                    <span className="l-when">{w.age}</span>
                  </Pressable>
                </li>
              ))}
            </ul>
          )}
        </SlabCard>
      </div>

      {modal === 'confirm' && <ConfirmDialog view={view} c={c} setup={setup} onClose={() => setModal(null)} />}
      {work && (
        <WorkDialog
          view={view}
          w={work}
          c={c}
          setup={setup}
          error={launchError}
          onClose={() => {
            setOpenWork(null);
            setLaunchError(null);
          }}
          onLaunch={() => setLaunchId(work.id)}
        />
      )}
      {client && <ClientDialog view={view} r={client} c={c} onClose={() => setOpenClient(null)} />}
      <LDialog
        open={Boolean(launchRow)}
        onClose={() => setLaunchId(null)}
        title={LAUNCH_DIALOG_TITLE}
        width={440}
        footer={
          <>
            <Pressable onClick={() => setLaunchId(null)}>{t('Cancel')}</Pressable>
            <Pressable tone="primary" onClick={() => void doLaunch()} disabled={launchRow ? c.busy === `launch:${launchRow.id}` : false}>
              {t('Start draft')}
            </Pressable>
          </>
        }
      >
        <p className="l-prose">{LAUNCH_DIALOG_BODY}</p>
        {launchRow && (
          <p className="l-caption">
            {launchRow.clientName} · {launchRow.briefLine}
          </p>
        )}
      </LDialog>
    </div>
  );
}

function rosterMeta(r: ClientRosterRow): string {
  const parts = [r.company && r.company !== r.name ? r.company : null, r.slackChannel ? `#${r.slackChannel.replace(/^#/, '')}` : null, r.lastRequestAge ? t('last request {age} ago', { age: r.lastRequestAge }) : t('no requests yet')];
  return parts.filter(Boolean).join(' · ');
}

/** FO's inline request: the mono brief box with Save draft request and Start draft in Superset. */
function NewRequest({ view, c, setup, blocked, onLaunch }: { view: ClientsView; c: Actions; setup: ClientsSetup; blocked: string | null; onLaunch: (id: string) => void }) {
  const [clientId, setClientId] = useState(view.selected ?? view.roster[0]?.clientId ?? '');
  const [brief, setBrief] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const launchBlocked = launchBlockedReason(view);
  const empty = !brief.trim();
  const save = async (thenLaunch: boolean) => {
    setError(null);
    setSaved(false);
    const r = await c.saveDraft(clientId, brief.trim());
    if (!r.ok) return setError(r.error);
    setBrief('');
    setSaved(true);
    if (thenLaunch && r.id) onLaunch(r.id);
  };
  return (
    <SlabCard title={t('New request')} sub={t('saved as a draft · nothing starts until you launch it · nothing is sent to the client')} i={6}>
      <div className="l-card-body l-cl-new">
        <div className="l-cl-new-side">
          <label className="l-form-label" htmlFor="l-cl-client">
            {t('Client')}
          </label>
          <select id="l-cl-client" className="l-select" value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={Boolean(blocked)} title={blocked ?? undefined}>
            {view.roster.length === 0 && <option value="">{t('No confirmed client')}</option>}
            {view.roster.map((r) => (
              <option key={r.clientId} value={r.clientId}>
                {r.name}
              </option>
            ))}
          </select>
          {view.supersetState !== 'connected' && view.mode === 'live' && (
            <div className="mt-3">
              <Chip tone="warn">{t('Superset not configured')}</Chip>
              <p className="l-caption">{t('Drafts save without it.')}</p>
              <Pressable href={setup.superset} title={view.supersetDetail}>
                {t('Set up')} <span aria-hidden>›</span>
              </Pressable>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <label className="l-form-label" htmlFor="l-cl-brief">
            {t('Brief')}
          </label>
          <textarea id="l-cl-brief" className="l-textarea" value={brief} onChange={(e) => setBrief(e.target.value)} placeholder={BRIEF_PLACEHOLDER} disabled={Boolean(blocked)} title={blocked ?? undefined} />
          <div className="l-cl-new-actions">
            {blocked && <span className="l-caption mt-0">{blocked}</span>}
            {error && <span className="l-err-text">{error}</span>}
            {saved && !error && <span className="l-caption mt-0">{t('Draft saved.')}</span>}
            <Pressable onClick={() => void save(false)} disabled={Boolean(blocked) || empty || !clientId || c.busy === 'draft'} title={blocked ?? (empty ? t('Write a brief first') : undefined)}>
              <Plus size={12} strokeWidth={1.7} aria-hidden /> {t('Save draft request')}
            </Pressable>
            <Pressable tone="primary" onClick={() => void save(true)} disabled={Boolean(blocked) || empty || Boolean(launchBlocked)} title={blocked ?? (empty ? t('Write a brief first') : (launchBlocked ?? undefined))}>
              {t('Start draft in Superset')}
            </Pressable>
          </div>
        </div>
      </div>
    </SlabCard>
  );
}

function ConfirmDialog({ view, c, setup, onClose }: { view: ClientsView; c: Actions; setup: ClientsSetup; onClose: () => void }) {
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
    <LDialog title={view.attioState === 'connected' ? t('Confirm a client') : t('Add client')} sub={t('A payer is not a client until you confirm them here.')} onClose={onClose}>
      {view.attioState === 'connected' && (
        <div className="mb-5">
          <div className="l-form-label">{t('Attio deals')}</div>
          {view.candidates.length === 0 ? (
            <p className="l-body-text">{t('Every Attio deal is already confirmed.')}</p>
          ) : (
            <ul className="l-rows l-rows-ruled">
              {view.candidates.map((d) => (
                <li key={d.clientId} className="l-cl-cand">
                  <span className="min-w-0">
                    <span className="l-sym">{d.name}</span>
                    <span className="l-sub-line">{d.status || t('No stage')}</span>
                  </span>
                  <Pressable
                    disabled={c.busy === `confirm:${d.clientId}`}
                    onClick={async () => {
                      const r = await c.confirmAttio(d.clientId, d.name);
                      if (!r.ok) setError(r.error);
                    }}
                  >
                    {t('Confirm')}
                  </Pressable>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {view.attioState === 'not_configured' && <LUnconfigured what="Attio" href={setup.attio} hint={t('set ATTIO_API_KEY')} />}
      <div className="l-form-label">{t('Add by hand')}</div>
      <input className="l-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Client or contact name')} aria-label={t('Name')} maxLength={200} />
      <input className="l-input mt-2" value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t('Company (optional)')} aria-label={t('Company')} maxLength={200} />
      <div className="mt-3 flex justify-end">
        <Pressable tone="primary" onClick={() => void add()} disabled={!name.trim() || c.busy === 'add'}>
          {t('Add client')}
        </Pressable>
      </div>
      {error && <p className="l-err-text mt-3">{error}</p>}
    </LDialog>
  );
}

function WorkDialog({ view, w, c, setup, error, onClose, onLaunch }: { view: ClientsView; w: ClientWorkRow; c: Actions; setup: ClientsSetup; error: string | null; onClose: () => void; onLaunch: () => void }) {
  const blocked = launchBlockedReason(view, w);
  const local = writeBlockedReason(view) ?? (w.sample ? t('Sample data: nothing is saved') : null);
  return (
    <LDialog
      title={w.clientName}
      sub={<Badge tone={TONE[w.status]}>{w.statusLabel}</Badge>}
      onClose={onClose}
      footer={
        <>
          <Pressable onClick={() => void c.setStatus(w.id, 'failed')} disabled={Boolean(local) || w.status === 'failed'} title={local ?? undefined}>
            {t('Mark failed')}
          </Pressable>
          <Pressable onClick={() => void c.setStatus(w.id, 'done')} disabled={Boolean(local) || w.status === 'done'} title={local ?? undefined}>
            {t('Mark done')}
          </Pressable>
          <Pressable tone="primary" onClick={onLaunch} disabled={Boolean(blocked)} title={blocked ?? undefined}>
            {w.status === 'failed' ? t('Retry in Superset') : t('Start draft in Superset')}
          </Pressable>
        </>
      }
    >
      <p className="l-quote">{w.brief}</p>
      <dl className="l-kv mt-4">
        <div>
          <dt>{t('Requested')}</dt>
          <dd>{new Date(w.createdAt).toLocaleString(localeTag())}</dd>
        </div>
        {w.finishedAt && (
          <div>
            <dt>{w.status === 'failed' ? t('Failed') : t('Finished')}</dt>
            <dd>{new Date(w.finishedAt).toLocaleString(localeTag())}</dd>
          </div>
        )}
        {w.supersetWorkspace && (
          <div>
            <dt>{t('Superset workspace')}</dt>
            <dd>{w.supersetWorkspace}</dd>
          </div>
        )}
      </dl>
      {w.detail && <p className={w.status === 'failed' ? 'l-err-text mt-3' : 'l-caption'}>{w.detail}</p>}
      {error && <p className="l-err-text mt-3">{error}</p>}
      {view.supersetState !== 'connected' && view.mode === 'live' && <LUnconfigured what="Superset" href={setup.superset} hint={view.supersetDetail} />}
    </LDialog>
  );
}

function ClientDialog({ view, r, c, onClose }: { view: ClientsView; r: ClientRosterRow; c: Actions; onClose: () => void }) {
  const [retainer, setRetainer] = useState(r.retainer);
  const [slack, setSlack] = useState(r.slackChannel ?? '');
  const [project, setProject] = useState(r.supersetProject ?? '');
  const [arm, setArm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const local = writeBlockedReason(view) ?? (view.sample ? t('Sample data: nothing is saved') : null);
  const dirty = retainer !== r.retainer || slack !== (r.slackChannel ?? '') || project !== (r.supersetProject ?? '');
  return (
    <LDialog
      title={r.name}
      sub={`${r.source === 'attio' ? t('Attio deal') : t('Added by hand')} · ${t('confirmed {date}', { date: new Date(r.confirmedAt).toLocaleDateString(localeTag()) })}`}
      onClose={onClose}
      footer={
        <>
          {arm ? (
            <Pressable
              disabled={c.busy === `unconfirm:${r.clientId}`}
              onClick={async () => {
                const res = await c.unconfirm(r.clientId);
                if (res.ok) onClose();
                else setError(res.error);
              }}
            >
              {t('Unconfirm {name}: they leave the roster', { name: r.name })}
            </Pressable>
          ) : (
            <Pressable onClick={() => setArm(true)} disabled={Boolean(local)} title={local ?? undefined}>
              {t('Unconfirm')}
            </Pressable>
          )}
          <Pressable
            tone="primary"
            disabled={Boolean(local) || !dirty || c.busy === `edit:${r.clientId}`}
            title={local ?? undefined}
            onClick={async () => {
              setError(null);
              const res = await c.editClient({ clientId: r.clientId, name: r.name, retainer, slackChannel: slack.trim(), supersetProject: project.trim() });
              if (!res.ok) setError(res.error);
            }}
          >
            {t('Save')}
          </Pressable>
        </>
      }
    >
      <Pressable
        onClick={() => {
          c.selectClient(r.clientId);
          onClose();
        }}
      >
        {t("Show this client's requests")}
      </Pressable>
      <label className="l-cl-check">
        <input type="checkbox" checked={retainer} onChange={(e) => setRetainer(e.target.checked)} disabled={Boolean(local)} /> {t('On retainer')}
      </label>
      <label className="l-form-label" htmlFor="l-cl-slack">
        {t('Slack channel')}
      </label>
      <input id="l-cl-slack" className="l-input" value={slack} onChange={(e) => setSlack(e.target.value)} placeholder={t('client-name or C0123ABCD')} disabled={Boolean(local)} />
      {r.slackHref && (
        <a className="l-link mt-1 inline-block" href={r.slackHref} target="_blank" rel="noreferrer">
          {t('Open Slack channel')}
        </a>
      )}
      <label className="l-form-label" htmlFor="l-cl-project">
        {t('Superset project')}
      </label>
      <input id="l-cl-project" className="l-input" value={project} onChange={(e) => setProject(e.target.value)} placeholder={t('Project id (empty uses SUPERSET_PROJECT_ID)')} disabled={Boolean(local)} />
      {error && <p className="l-err-text mt-3">{error}</p>}
    </LDialog>
  );
}
