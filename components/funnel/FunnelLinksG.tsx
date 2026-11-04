'use client';

/**
 * F6 Trakyo link studio under the GladOS style (pages/feature-additions.md):
 * a GCard "Links" below the stepped funnel with a GTable of saved links and
 * their clicks, and a [New link] GSheet. Creating publishes a public short
 * link, so the POST needs GLADOS_WRITES=1 on the instance and a confirm
 * ("Create link in Trakyo?"). Reads stream in from GET /api/trakyo/links so
 * the funnel render never waits on Trakyo.
 */

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Plus } from 'lucide-react';
import {
  GButton, GCard, GDialog, GEmpty, GErrorLine, GField, GInput, GSampleBadge, GSectionHeader, GSelect, GSheet, GSkeleton, GTable, type GColumn,
} from '@/components/g';
import {
  CONFIRM_TITLE, EMPTY_LINK_FORM, WRITES_OFF_REASON, hostPath, linkFormError, linkRequestBody, totalClicks, type LinkForm, type LinkRow, type LinksWorkspace,
} from './links-model';
import { localeTag, t } from '@/lib/i18n';

const num = (n: number) => n.toLocaleString(localeTag());

const COLUMNS: GColumn<LinkRow>[] = [
  {
    key: 'short',
    label: t('Short link'),
    render: (l) => (
      <a href={l.shortLink} target="_blank" rel="noreferrer" className="fn-g-link">
        {hostPath(l.shortLink)} <ExternalLink size={11} strokeWidth={1.75} aria-hidden />
      </a>
    ),
    sortValue: (l) => l.shortLink,
  },
  { key: 'dest', label: t('Destination'), render: (l) => <span className="fn-g-cap" title={l.url}>{hostPath(l.url)}</span>, sortValue: (l) => l.url },
  { key: 'content', label: t('Content id'), render: (l) => <span className="fn-g-mono">{l.contentItemId ?? '—'}</span> },
  { key: 'clicks', label: t('Clicks'), numeric: true, render: (l) => num(l.clicks), sortValue: (l) => l.clicks },
];

export function FunnelLinksG({ configured, setupHref }: { configured: boolean; setupHref: string }) {
  const [ws, setWs] = useState<LinksWorkspace | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LinkForm>(EMPTY_LINK_FORM);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: keyof LinkForm; message: string } | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/trakyo/links', { cache: 'no-store' });
      if (!res.ok) throw new Error(t('Trakyo links answered {status}', { status: res.status }));
      setWs((await res.json()) as LinksWorkspace);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t('Could not read Trakyo links.'));
    }
  }, []);

  useEffect(() => {
    if (configured) void load();
  }, [configured, load]);

  const set = (k: keyof LinkForm) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setError(null);
  };

  const review = () => {
    const problem = linkFormError(form);
    if (problem) return setError(problem);
    setConfirming(true);
  };

  const create = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/trakyo/links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(linkRequestBody(form)) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; field?: string; link?: LinkRow };
      if (!res.ok) {
        setConfirming(false);
        setError({ field: data.field as keyof LinkForm | undefined, message: data.error ?? t('Trakyo answered {status}.', { status: res.status }) });
        return;
      }
      setCreated(data.link?.shortLink ?? null);
      setConfirming(false);
      setOpen(false);
      setForm(EMPTY_LINK_FORM);
      void load();
    } finally {
      setBusy(false);
    }
  };

  const writesOff = ws !== null && !ws.writes;
  const header = (caption: string) => (
    <GSectionHeader
      id="fn-g-links"
      size={22}
      title={<span className="fn-g-panel-title">{t('Links')}{ws?.sample && <GSampleBadge fixture="app/api/trakyo/links (Filming)" />}</span>}
      caption={caption}
      action={
        configured && ws && ws.state !== 'error' ? (
          <GButton size="sm" onClick={() => setOpen(true)} disabled={writesOff} disabledReason={writesOff ? WRITES_OFF_REASON : undefined} title={t('Create a tracked short link in Trakyo')}>
            <Plus size={13} strokeWidth={1.75} aria-hidden /> {t('New link')}
          </GButton>
        ) : undefined
      }
    />
  );

  if (!configured) {
    return (
      <GCard p={24} className="fn-g-links" aria-labelledby="fn-g-links">
        {header(t('Tracked short links and their clicks'))}
        <GEmpty kind="unconfigured" title={t('Tracked links need Trakyo.')} body={t('Create a short link per post or campaign and see which one gets the clicks.')} setupHref={setupHref} setupHint={t('Set TRAKYO_API_KEY')} />
      </GCard>
    );
  }

  return (
    <GCard p={24} className="fn-g-links" aria-labelledby="fn-g-links">
      {header(ws ? t('{n} links · {clicks} clicks', { n: `${num(ws.links.length)}${ws.hasMore ? '+' : ''}`, clicks: num(totalClicks(ws.links)) }) : t('Reading Trakyo'))}
      {loadError ? (
        <GErrorLine onRetry={() => void load()}>{loadError}</GErrorLine>
      ) : !ws ? (
        <GSkeleton height={160} shape="nested" />
      ) : ws.state === 'error' ? (
        <GErrorLine onRetry={() => void load()}>{ws.messages[0] ?? t('Trakyo could not be read.')}</GErrorLine>
      ) : (
        <>
          {ws.messages.map((m) => <p key={m} className="fn-g-cap">{m}</p>)}
          {created && <p className="fn-g-cap" role="status">{t('Created {link}', { link: hostPath(created) })}</p>}
          <div className="fn-g-scroll" data-matrix-scroll=""><GTable
            columns={COLUMNS}
            rows={ws.links}
            rowKey={(l) => l.key}
            caption={t('Trakyo links and clicks')}
            sort={{ key: 'clicks', dir: 'desc' }}
            sticky={false}
            empty={t('No links yet. New link creates a tracked short link for a post or campaign.')}
           
          /></div>
        </>
      )}

      <GSheet
        open={open}
        onClose={() => { setOpen(false); setError(null); }}
        title={t('New link')}
        caption={t('A tracked short link in Trakyo. It is public as soon as it is created.')}
        width={560}
        footer={
          <>
            <GButton onClick={() => setOpen(false)}>{t('Cancel')}</GButton>
            <GButton variant="ink" onClick={review} disabled={writesOff} disabledReason={writesOff ? WRITES_OFF_REASON : undefined}>{t('Create link')}</GButton>
          </>
        }
      >
        <div className="fn-g-form">
          <GField label={t('Destination URL')} error={error?.field === 'url' ? error.message : undefined}>
            <GInput value={form.url} onChange={set('url')} placeholder="https://example.com/offer" invalid={error?.field === 'url'} inputMode="url" />
          </GField>
          <GField label={t('Source')} hint={t('Where the link is posted, for example Instagram')} error={error?.field === 'source' ? error.message : undefined}>
            <GInput value={form.source} onChange={set('source')} placeholder="Instagram" invalid={error?.field === 'source'} />
          </GField>
          <GField label={t('Campaign')} hint={t('The post or campaign this link belongs to')} error={error?.field === 'campaign' ? error.message : undefined}>
            <GInput value={form.campaign} onChange={set('campaign')} placeholder={t('October reel: 3 offers')} invalid={error?.field === 'campaign'} />
          </GField>
          <GField label={t('Content id')} hint={t('Optional. An existing Trakyo content item (ci_…) instead of source and campaign')} error={error?.field === 'contentId' ? error.message : undefined}>
            <GInput value={form.contentId} onChange={set('contentId')} placeholder="ci_…" invalid={error?.field === 'contentId'} />
          </GField>
          {ws && ws.domains.length > 0 && (
            <GField label={t('Domain')}>
              <GSelect value={form.domain} onChange={set('domain')} options={[{ value: '', label: t('Trakyo default') }, ...ws.domains.map((d) => ({ value: d.id, label: d.hostname }))]} />
            </GField>
          )}
          {error && !error.field && <GErrorLine align="left">{error.message}</GErrorLine>}
        </div>
      </GSheet>

      <GDialog open={confirming} onClose={() => setConfirming(false)} title={CONFIRM_TITLE} confirmLabel={t('Create link')} onConfirm={() => void create()} busy={busy}>
        <p>
          {form.contentId.trim()
            ? t('Trakyo publishes a short link to {url} under {id}.', { url: hostPath(form.url), id: form.contentId.trim() })
            : t('Trakyo publishes a short link to {url}, filed under {source} · {campaign}.', { url: hostPath(form.url), source: form.source.trim(), campaign: form.campaign.trim() })}
        </p>
      </GDialog>
    </GCard>
  );
}
