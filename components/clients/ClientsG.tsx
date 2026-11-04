'use client';

/**
 * /clients under the GladOS style (founderos-ui pages/clients.md §6). Every
 * figure comes from the server-built ClientsView (lib/clients-view.ts); this
 * tree only lays it out with kit primitives and wires the actions in
 * use-clients.ts. Launching is draft first: a confirm dialog, then the gated
 * route (GLADOS_WRITES + confirm). Nothing is ever sent to a client.
 */
import { useMemo, useState } from 'react';
import { MoreHorizontal, Plus, UserPlus } from 'lucide-react';
import {
  GAreaChart, GBarChart, GButton, GCard, GDialog, GDotCloud, GDrawer, GEmpty, GErrorLine, GField, GHeroCard, GInput, GKeyValue, GList,
  GMenu, GPage, GRow, GSampleBadge, GSectionHeader, GSelect, GSheet, GTable, GTag, GTextarea, GToggle, type GColumn, type GTagTone,
} from '@/components/g';
import { launchBlockedReason, writeBlockedReason, type ClientRosterRow, type ClientWorkRow, type ClientsView } from '@/lib/clients-view';
import type { ClientWorkStatus } from '@/lib/schemas';
import { BRIEF_PLACEHOLDER, LAUNCH_DIALOG_BODY, LAUNCH_DIALOG_TITLE, useClients } from './use-clients';
import { localeTag, t, tc } from '@/lib/i18n';

export type ClientsSetup = { attio: string; superset: string };

export const STATUS_TONE: Record<ClientWorkStatus, GTagTone> = { draft: 'neutral', queued: 'outline', running: 'accent', done: 'ok', failed: 'err' };

export function ClientsG({ view, setup }: { view: ClientsView; setup: ClientsSetup }) {
  const c = useClients();
  const [sheet, setSheet] = useState<'request' | 'confirm' | null>(null);
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

  const doLaunch = async () => {
    if (!launchRow) return;
    setLaunchError(null);
    const r = await c.launch(launchRow.id);
    if (r.ok) setLaunchId(null);
    else {
      setLaunchId(null);
      setLaunchError(r.error);
      setOpenWork(launchRow.id);
    }
  };

  const menuFor = (w: ClientWorkRow) => {
    const blocked = launchBlockedReason(view, w);
    const local = readOnly ?? (w.sample ? t('Sample data: nothing is saved') : null);
    return (
      <GMenu
        label={t('Actions for {name}', { name: w.clientName })}
        items={[
          { id: 'open', label: t('Open brief'), onSelect: () => setOpenWork(w.id) },
          { id: 'launch', label: t('Start draft in Superset'), onSelect: () => setLaunchId(w.id), disabled: Boolean(blocked), disabledReason: blocked ?? undefined },
          { id: 'done', label: t('Mark done'), onSelect: () => void c.setStatus(w.id, 'done'), disabled: Boolean(local) || w.status === 'done', disabledReason: local ?? t('Already done') },
          { id: 'failed', label: t('Mark failed'), danger: true, onSelect: () => void c.setStatus(w.id, 'failed'), disabled: Boolean(local) || w.status === 'failed', disabledReason: local ?? t('Already failed') },
        ]}
        trigger={(p) => (
          <GButton {...p} variant="icon" size="sm" aria-label={t('Actions for {name}', { name: w.clientName })} title={t('Actions')}>
            <MoreHorizontal size={15} strokeWidth={1.75} aria-hidden />
          </GButton>
        )}
      />
    );
  };

  const columns: GColumn<ClientWorkRow>[] = [
    { key: 'client', label: t('Client'), sortValue: (w) => w.clientName, render: (w) => <span className="cl-g-strong">{w.clientName}</span> },
    { key: 'brief', label: t('Brief'), render: (w) => <span className="cl-g-brief" title={w.brief}>{w.briefLine}</span> },
    { key: 'status', label: t('Status'), sortValue: (w) => w.status, render: (w) => <GTag tone={STATUS_TONE[w.status]} dot>{w.statusLabel}</GTag> },
    { key: 'age', label: t('Age'), align: 'right', sortValue: (w) => -Date.parse(w.createdAt), render: (w) => <span className="cl-g-cap" title={new Date(w.createdAt).toLocaleString(localeTag())}>{w.age}</span> },
    { key: 'menu', label: <span className="sr-only">{t('Actions')}</span>, align: 'right', render: (w) => menuFor(w) },
  ];

  return (
    <GPage className="cl-g">
      <GSectionHeader
        size="page"
        title={view.title}
        caption={view.subtitle}
        action={
          <div className="cl-g-head-actions">
            {view.sample && <GSampleBadge fixture={view.mode === 'filming' ? t('Filming mode fixture, three invented clients') : t('Preview on a blank install, three invented clients')} />}
            <GButton variant="ink" onClick={() => setSheet('request')} disabled={Boolean(newRequestBlocked)} disabledReason={newRequestBlocked ?? undefined}>
              <Plus size={14} strokeWidth={1.75} aria-hidden /> {t('New request')}
            </GButton>
          </div>
        }
      />

      <div className="cl-g-top">
        <GHeroCard
          variant="b"
          className="cl-g-hero"
          caption={t('Open requests')}
          value={String(view.volume.open)}
          label={t('{n} open requests', { n: view.volume.open })}
          title={t('Drafts, queued and running requests across every confirmed client')}
          status={`${view.volume.thisMonth === 1 ? t('{n} request this month', { n: view.volume.thisMonth }) : t('{n} requests this month', { n: view.volume.thisMonth })} · ${tc('request', '{n} done', { n: view.volume.doneThisMonth })}`}
          strip={
            view.volume.thisMonth > 0 ? (
              <GDotCloud total={view.volume.thisMonth} lit={view.volume.doneThisMonth} onHero label={`${t('{n} requests this month', { n: view.volume.thisMonth })} · ${tc('request', '{n} done', { n: view.volume.doneThisMonth })}`} />
            ) : undefined
          }
        />
        <GCard p={24} className="cl-g-activity" aria-labelledby="cl-g-activity">
          <GSectionHeader id="cl-g-activity" size={22} title={t('Request activity')} action={<span className="cl-g-cap">{t('Last 14 days')}</span>} />
          <div className="cl-g-stats">
            <Figure value={view.activity.total14} label={t('Requested')} />
            <Figure value={view.volume.doneThisMonth} label={t('Done this month')} />
            <Figure value={view.volume.failedThisMonth} label={t('Failed this month')} tone={view.volume.failedThisMonth > 0 ? 'err' : undefined} />
          </div>
          <GAreaChart
            labels={view.activity.labels}
            axisLabels={view.activity.axisLabels}
            series={[
              { id: 'created', label: t('Requested'), values: view.activity.created, color: 'accent' },
              { id: 'finished', label: t('Finished'), values: view.activity.finished, color: 'series-3' },
            ]}
            variant="step"
            height={112}
            yAxis={false}
            state={view.work.length === 0 ? 'empty' : 'ready'}
            emptyText={t('Requests appear here as you save drafts.')}
            label={t('Requests made and finished per day, last 14 days, from client work')}
          />
        </GCard>
      </div>

      <div className="cl-g-main">
        <GCard p={24} className="cl-g-roster" aria-labelledby="cl-g-roster">
          <GSectionHeader
            id="cl-g-roster"
            size={22}
            title={t('Roster')}
            action={view.roster.length > 0 ? <span className="cl-g-cap">{view.roster.length === 1 ? t('{n} client', { n: view.roster.length }) : t('{n} clients', { n: view.roster.length })}</span> : undefined}
          />
          {view.attioState === 'not_configured' && view.roster.length === 0 && (
            <GEmpty kind="unconfigured" title={t('Attio not configured')} body={t('Add clients by hand, or connect Attio to confirm them from your deals.')} setupHref={setup.attio} setupHint={t('set ATTIO_API_KEY')} />
          )}
          {view.attioState === 'error' && <GErrorLine align="left">{t('Attio did not answer. Confirmed clients still show; the deal picker is empty until it does.')}</GErrorLine>}
          {view.roster.length > 0 ? (
            <GList divided label={t('Confirmed clients')}>
              {view.roster.map((r) => (
                <GRow
                  key={r.clientId}
                  title={r.name}
                  meta={rosterMeta(r)}
                  selected={view.selected === r.clientId}
                  trailing={r.retainer ? <GTag tone="accent" size="xs">{t('Retainer')}</GTag> : <GTag tone="outline" size="xs">{t('Project')}</GTag>}
                  onClick={() => setOpenClient(r.clientId)}
                />
              ))}
            </GList>
          ) : view.attioState === 'connected' ? (
            <GEmpty title={t('No confirmed clients.')} body={t('Confirm a client from your Attio deals.')} />
          ) : null}
          <div className="cl-g-roster-foot">
            {view.attioState === 'not_configured' && view.roster.length > 0 && (
              <span className="cl-g-attio" title={t('Hand-added clients only. Connect Attio to confirm clients from your deals.')}>
                <GTag tone="outline" size="xs">{t('Attio not configured')}</GTag>
                <GButton size="sm" href={setup.attio} title={t('set ATTIO_API_KEY')}>{t('Set up')}</GButton>
              </span>
            )}
            <GButton onClick={() => setSheet('confirm')} disabled={Boolean(readOnly)} disabledReason={readOnly ?? undefined}>
              <UserPlus size={14} strokeWidth={1.75} aria-hidden /> {view.attioState === 'connected' ? t('Confirm a client') : t('Add client')}
            </GButton>
          </div>
        </GCard>

        <div className="cl-g-side">
          <GCard p={24} className="cl-g-work" aria-labelledby="cl-g-work">
            <GSectionHeader
              id="cl-g-work"
              size={22}
              title={t('Work requests')}
              action={
                selectedName ? (
                  <GButton size="sm" onClick={() => c.selectClient(null)} title={t("Show every client's requests")}>
                    {selectedName} · {t('Clear')}
                  </GButton>
                ) : (
                  <span className="cl-g-cap">{view.work.length === 1 ? t('{n} request', { n: view.work.length }) : t('{n} requests', { n: view.work.length })}</span>
                )
              }
            />
            {launchError && !work && <GErrorLine align="left">{launchError}</GErrorLine>}
            {rows.length === 0 ? (
              <GEmpty
                title={selectedName ? t('No requests for {name} yet.', { name: selectedName }) : t('No work requests yet.')}
                body={t('Write a brief for a confirmed client and save it as a draft. Nothing starts until you launch it.')}
              />
            ) : (
              <>
                <div className="cl-g-table">
                  <GTable columns={columns} rows={rows} rowKey={(w) => w.id} caption={t('Work requests')} onRowClick={(w) => setOpenWork(w.id)} rowLabel={(w) => `${w.clientName}: ${w.briefLine}`} sticky={false} />
                </div>
                <div className="cl-g-list">
                  <GList divided label={t('Work requests')}>
                    {rows.map((w) => (
                      <GRow
                        key={w.id}
                        title={<span className="cl-g-row-title"><span className="cl-g-strong">{w.clientName}</span><GTag tone={STATUS_TONE[w.status]} dot size="xs">{w.statusLabel}</GTag></span>}
                        meta={w.briefLine}
                        trailing={<span className="cl-g-cap">{w.age}</span>}
                        onClick={() => setOpenWork(w.id)}
                      />
                    ))}
                  </GList>
                </div>
              </>
            )}
          </GCard>

          <GCard p={24} className="cl-g-rhythm" aria-labelledby="cl-g-rhythm">
            <GSectionHeader
              id="cl-g-rhythm"
              size={22}
              title={t('Request rhythm')}
              action={<span className="cl-g-cap">{view.busiestDay ? `${t('Busiest day')} · ${view.busiestDay}` : t('By weekday')}</span>}
            />
            <GBarChart
              variant="series"
              bars={view.rhythm.map((r) => ({ id: r.day, label: r.day, value: r.count }))}
              highlight={view.busiestDay}
              height={96}
              state={view.work.length === 0 ? 'empty' : 'ready'}
              emptyText={t('The weekday pattern shows once requests exist.')}
              label={t('Requests by weekday, all time, from client work')}
            />
          </GCard>
        </div>
      </div>

      {sheet === 'request' && <RequestSheet view={view} c={c} onClose={() => setSheet(null)} onLaunch={(id) => { setSheet(null); setLaunchId(id); }} setup={setup} />}
      {sheet === 'confirm' && <ConfirmSheet view={view} c={c} onClose={() => setSheet(null)} setup={setup} />}
      {work && (
        <WorkDrawer
          view={view}
          w={work}
          c={c}
          error={launchError}
          onClose={() => { setOpenWork(null); setLaunchError(null); }}
          onLaunch={() => setLaunchId(work.id)}
          setup={setup}
        />
      )}
      {client && <ClientDrawer view={view} r={client} c={c} onClose={() => setOpenClient(null)} />}
      <GDialog
        open={Boolean(launchRow)}
        onClose={() => setLaunchId(null)}
        title={LAUNCH_DIALOG_TITLE}
        confirmLabel={t('Start draft')}
        onConfirm={() => void doLaunch()}
        busy={launchRow ? c.busy === `launch:${launchRow.id}` : false}
      >
        <p className="cl-g-dialog-copy">{LAUNCH_DIALOG_BODY}</p>
        {launchRow && <p className="cl-g-cap">{launchRow.clientName} · {launchRow.briefLine}</p>}
      </GDialog>
    </GPage>
  );
}

function rosterMeta(r: ClientRosterRow): string {
  const parts = [r.company && r.company !== r.name ? r.company : null, r.openRequests ? tc('request', '{n} open', { n: r.openRequests }) : null, r.lastRequestAge ? t('last request {age} ago', { age: r.lastRequestAge }) : t('no requests yet')];
  return parts.filter(Boolean).join(' · ');
}

function Figure({ value, label, tone }: { value: number; label: string; tone?: 'err' }) {
  return (
    <div className="cl-g-figure">
      <span className="cl-g-figure-num" data-tone={tone}>{value}</span>
      <span className="cl-g-cap">{label}</span>
    </div>
  );
}

type Actions = ReturnType<typeof useClients>;

function RequestSheet({ view, c, onClose, onLaunch, setup }: { view: ClientsView; c: Actions; onClose: () => void; onLaunch: (id: string) => void; setup: ClientsSetup }) {
  const [clientId, setClientId] = useState(view.selected ?? view.roster[0]?.clientId ?? '');
  const [brief, setBrief] = useState('');
  const [error, setError] = useState<string | null>(null);
  const launchBlocked = launchBlockedReason(view);
  const empty = brief.trim().length === 0;

  const save = async (thenLaunch: boolean) => {
    setError(null);
    const r = await c.saveDraft(clientId, brief.trim());
    if (!r.ok) return setError(r.error);
    if (thenLaunch && r.id) onLaunch(r.id);
    else onClose();
  };

  return (
    <GSheet
      open
      onClose={onClose}
      title={t('New request')}
      caption={t('Saved as a draft. Nothing starts until you launch it, and nothing is sent to the client.')}
      width={520}
      footer={
        <div className="cl-g-sheet-foot">
          <GButton onClick={() => void save(true)} disabled={empty || Boolean(launchBlocked)} disabledReason={empty ? t('Write a brief first') : launchBlocked ?? undefined}>
            {t('Start in Superset')}
          </GButton>
          <GButton variant="ink" onClick={() => void save(false)} busy={c.busy === 'draft'} disabled={empty || !clientId} disabledReason={t('Pick a client and write a brief')}>
            {t('Save draft')}
          </GButton>
        </div>
      }
    >
      <div className="cl-g-form">
        <GField label={t('Client')} htmlFor="cl-g-client">
          <GSelect id="cl-g-client" value={clientId} onChange={(e) => setClientId(e.target.value)} options={view.roster.map((r) => ({ value: r.clientId, label: r.name }))} />
        </GField>
        <GField label={t('Brief')} htmlFor="cl-g-brief" hint={t('One brief per request. The agent drafts from exactly this text.')}>
          <GTextarea id="cl-g-brief" value={brief} onChange={(e) => setBrief(e.target.value)} placeholder={BRIEF_PLACEHOLDER} rows={6} maxLines={12} />
        </GField>
        {view.supersetState !== 'connected' && (
          <GEmpty inline kind="unconfigured" title={t('Superset not configured')} body={t('Drafts save without it; launching needs it.')} setupHref={setup.superset} setupHint={view.supersetDetail} />
        )}
        {error && <GErrorLine align="left">{error}</GErrorLine>}
      </div>
    </GSheet>
  );
}

function ConfirmSheet({ view, c, onClose, setup }: { view: ClientsView; c: Actions; onClose: () => void; setup: ClientsSetup }) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    setError(null);
    const r = await c.addManual(name.trim(), company.trim());
    if (r.ok) onClose();
    else setError(r.error);
  };
  const confirm = async (id: string, n: string) => {
    setError(null);
    const r = await c.confirmAttio(id, n);
    if (!r.ok) setError(r.error);
  };

  return (
    <GSheet open onClose={onClose} title={view.attioState === 'connected' ? t('Confirm a client') : t('Add client')} caption={t('A payer is not a client until you confirm them here.')} width={520}>
      <div className="cl-g-form">
        {view.attioState === 'connected' && (
          <section aria-labelledby="cl-g-deals" className="cl-g-form-sec">
            <h3 id="cl-g-deals" className="cl-g-sub">{t('Attio deals')}</h3>
            {view.candidates.length === 0 ? (
              <GEmpty inline title={t('Every Attio deal is already confirmed.')} body={t('New deals appear here within a minute of Attio having them.')} />
            ) : (
              <GList divided label={t('Attio deals not yet confirmed')}>
                {view.candidates.map((d) => (
                  <GRow
                    key={d.clientId}
                    title={d.name}
                    meta={d.status || t('No stage')}
                    trailing={<GButton size="sm" busy={c.busy === `confirm:${d.clientId}`} onClick={() => void confirm(d.clientId, d.name)}>{t('Confirm')}</GButton>}
                  />
                ))}
              </GList>
            )}
          </section>
        )}
        {view.attioState === 'not_configured' && (
          <GEmpty inline kind="unconfigured" title={t('Attio not configured')} body={t('Connect Attio to confirm clients from your deals.')} setupHref={setup.attio} setupHint={t('set ATTIO_API_KEY')} />
        )}
        <section aria-labelledby="cl-g-manual" className="cl-g-form-sec">
          <h3 id="cl-g-manual" className="cl-g-sub">{t('Add by hand')}</h3>
          <GField label={t('Name')} htmlFor="cl-g-name">
            <GInput id="cl-g-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Client or contact name')} maxLength={200} />
          </GField>
          <GField label={t('Company')} htmlFor="cl-g-company">
            <GInput id="cl-g-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t('Optional')} maxLength={200} />
          </GField>
          <div className="cl-g-sheet-foot">
            <GButton variant="ink" onClick={() => void add()} busy={c.busy === 'add'} disabled={!name.trim()} disabledReason={t('Name the client first')}>
              {t('Add client')}
            </GButton>
          </div>
        </section>
        {error && <GErrorLine align="left">{error}</GErrorLine>}
      </div>
    </GSheet>
  );
}

function WorkDrawer({ view, w, c, error, onClose, onLaunch, setup }: { view: ClientsView; w: ClientWorkRow; c: Actions; error: string | null; onClose: () => void; onLaunch: () => void; setup: ClientsSetup }) {
  const blocked = launchBlockedReason(view, w);
  const local = writeBlockedReason(view) ?? (w.sample ? t('Sample data: nothing is saved') : null);
  return (
    <GDrawer
      open
      onClose={onClose}
      title={w.clientName}
      width={480}
      footer={
        <div className="cl-g-sheet-foot">
          <GButton onClick={() => void c.setStatus(w.id, 'failed')} disabled={Boolean(local) || w.status === 'failed'} disabledReason={local ?? t('Already failed')}>{t('Mark failed')}</GButton>
          <GButton onClick={() => void c.setStatus(w.id, 'done')} disabled={Boolean(local) || w.status === 'done'} disabledReason={local ?? t('Already done')}>{t('Mark done')}</GButton>
          <GButton variant="ink" onClick={onLaunch} disabled={Boolean(blocked)} disabledReason={blocked ?? undefined}>
            {w.status === 'failed' ? t('Retry in Superset') : t('Start draft in Superset')}
          </GButton>
        </div>
      }
    >
      <div className="cl-g-drawer">
        <GTag tone={STATUS_TONE[w.status]} dot>{w.statusLabel}</GTag>
        <p className="cl-g-brief-full">{w.brief}</p>
        <GKeyValue
          items={[
            { label: t('Requested'), value: new Date(w.createdAt).toLocaleString(localeTag()) },
            ...(w.finishedAt ? [{ label: w.status === 'failed' ? t('Failed') : t('Finished'), value: new Date(w.finishedAt).toLocaleString(localeTag()) }] : []),
            ...(w.supersetWorkspace ? [{ label: t('Superset workspace'), value: <span data-copy="">{w.supersetWorkspace}</span> }] : []),
          ]}
        />
        {w.detail && (w.status === 'failed' ? <GErrorLine align="left">{w.detail}</GErrorLine> : <p className="cl-g-cap">{w.detail}</p>)}
        {error && <GErrorLine align="left">{error}</GErrorLine>}
        {view.supersetState !== 'connected' && view.mode === 'live' && (
          <GEmpty inline kind="unconfigured" title={t('Superset not configured')} body={t('Launching needs it.')} setupHref={setup.superset} setupHint={view.supersetDetail} />
        )}
      </div>
    </GDrawer>
  );
}

function ClientDrawer({ view, r, c, onClose }: { view: ClientsView; r: ClientRosterRow; c: Actions; onClose: () => void }) {
  const [retainer, setRetainer] = useState(r.retainer);
  const [slack, setSlack] = useState(r.slackChannel ?? '');
  const [project, setProject] = useState(r.supersetProject ?? '');
  const [confirmOff, setConfirmOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const local = writeBlockedReason(view) ?? (view.sample ? t('Sample data: nothing is saved') : null);
  const dirty = retainer !== r.retainer || slack !== (r.slackChannel ?? '') || project !== (r.supersetProject ?? '');

  const save = async () => {
    setError(null);
    const res = await c.editClient({ clientId: r.clientId, name: r.name, retainer, slackChannel: slack.trim(), supersetProject: project.trim() });
    if (!res.ok) setError(res.error);
  };
  const unconfirm = async () => {
    const res = await c.unconfirm(r.clientId);
    setConfirmOff(false);
    if (res.ok) onClose();
    else setError(res.error);
  };

  return (
    <GDrawer
      open
      onClose={onClose}
      title={r.name}
      width={440}
      footer={
        <div className="cl-g-sheet-foot">
          <GButton variant="danger" onClick={() => setConfirmOff(true)} disabled={Boolean(local)} disabledReason={local ?? undefined}>{t('Unconfirm')}</GButton>
          <GButton variant="ink" onClick={() => void save()} busy={c.busy === `edit:${r.clientId}`} disabled={Boolean(local) || !dirty} disabledReason={local ?? t('No changes')}>{t('Save')}</GButton>
        </div>
      }
    >
      <div className="cl-g-form">
        <GKeyValue
          items={[
            { label: t('Source'), value: r.source === 'attio' ? t('Attio deal') : t('Added by hand') },
            { label: t('Confirmed'), value: new Date(r.confirmedAt).toLocaleDateString(localeTag()) },
            { label: t('Requests'), value: r.openRequests ? tc('request', '{n} open', { n: r.openRequests }) : t('None open') },
          ]}
        />
        <GButton size="sm" onClick={() => { c.selectClient(r.clientId); onClose(); }}>{t("Show this client's requests")}</GButton>
        <GToggle checked={retainer} onCheckedChange={setRetainer} disabled={Boolean(local)} disabledReason={local ?? undefined}>{t('On retainer')}</GToggle>
        <GField label={t('Slack channel')} htmlFor="cl-g-slack" hint={r.slackHref ? undefined : t('A channel id (C0123…) makes it a link.')}>
          <GInput id="cl-g-slack" value={slack} onChange={(e) => setSlack(e.target.value)} placeholder={t('client-name or C0123ABCD')} disabled={Boolean(local)} />
        </GField>
        {r.slackHref && (
          <GButton size="sm" href={r.slackHref} external>{t('Open Slack channel')}</GButton>
        )}
        <GField label={t('Superset project')} htmlFor="cl-g-project" hint={t('Drafts for this client start in this project. Empty uses SUPERSET_PROJECT_ID.')}>
          <GInput id="cl-g-project" value={project} onChange={(e) => setProject(e.target.value)} placeholder={t('Project id')} disabled={Boolean(local)} />
        </GField>
        {error && <GErrorLine align="left">{error}</GErrorLine>}
      </div>
      <GDialog
        open={confirmOff}
        onClose={() => setConfirmOff(false)}
        tone="danger"
        title={t('Unconfirm {name}?', { name: r.name })}
        confirmLabel={t('Unconfirm')}
        onConfirm={() => void unconfirm()}
        busy={c.busy === `unconfirm:${r.clientId}`}
      >
        <p className="cl-g-dialog-copy">{t('They leave the roster. Their requests stay on record.')}</p>
      </GDialog>
    </GDrawer>
  );
}
