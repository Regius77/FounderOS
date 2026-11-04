'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Inbox } from 'lucide-react';
import { GAsk, GButton, GCard, GHeroCard, GList, GPage, GRow, GSectionHeader, GSegmented, GSheet, GTag } from '@/components/g';
import { openWizard } from '@/lib/wizard-dock';
import type { AgentDirectory } from '@/lib/agent-directory';
import type { Broadcast } from '@/lib/schemas';
import { AgentFace } from '@/components/agents/AgentFace';
import { AgentSheetHost } from '@/components/agents/AgentSheet';
import { openAgentSheet } from '@/components/agents/agent-param';
import { t } from '@/lib/i18n';

/**
 * /org under the GladOS style (glados-ui SPEC S04 §4.7, X5). Same hierarchy
 * and venture lens as the Classic page; kit presentation: the venture
 * switcher is a segmented control (F-O1), the life-area legend, the spark
 * tiles and the per-department tool chips are cut (F-O2, F-O4, AC04.30), the
 * Wizard is the one hero and its broadcast goes through the Wizard dock
 * (F0.1, F-O3), every agent row opens the AgentSheet (AC04.29), and the
 * department columns wrap instead of overflowing (F-O5, AC04.28).
 */
export type OrgAgentRow = { id: string; name: string; role: string; status: string; instance: string; depth: number; ventureColors: string[] };
export type OrgColumn = { id: string; name: string; area: string | null; leads: OrgAgentRow[]; workers: OrgAgentRow[] };
export type OrgVenture = { id: string; label: string; color: string; kind: string; detail: string; focus: string[]; brainTag: string };

const tone = (s: string) => (s === 'active' ? 'ok' : s === 'planned' ? 'outline' : 'idle');
const STATUS_LABEL: Record<string, string> = { active: t('active'), idle: t('idle'), training: t('training'), planned: t('planned') };

function Row({ a, dir, dim, lead }: { a: OrgAgentRow; dir: AgentDirectory; dim: boolean; lead: boolean }) {
  return (
      <GRow
        className={`wg-org-row wg-org-d${Math.min(3, a.depth)}${dim ? ' is-dim' : ''}`}
        onClick={() => openAgentSheet(a.id)}
        leading={<AgentFace src={dir.avatars[a.id]} name={a.name} size={lead ? 28 : 22} />}
        title={
          <span className="wg-org-name">
            <span className="wg-dot" data-tone={tone(a.status)} aria-label={STATUS_LABEL[a.status] ?? a.status} />
            {a.name}
            {a.ventureColors.map((c, i) => (
              // venture colours are data (ventures.json), shown only as 6px dots (S04 §5.4)
              <span key={i} className="wg-org-vdot" style={{ background: c }} aria-hidden />
            ))}
          </span>
        }
        meta={lead ? a.role : undefined}
        trailing={lead ? <GTag size="xs">{a.instance}</GTag> : undefined}
        hint={`${a.role} · ${t('open profile')}`}
      />
  );
}

export function OrgG({
  dir,
  columns,
  ventures,
  venture,
  ventureAgents,
  operatorName,
  routedCount,
  lastBroadcast,
}: {
  dir: AgentDirectory;
  columns: OrgColumn[];
  ventures: OrgVenture[];
  venture: OrgVenture | null;
  ventureAgents: string[] | null;
  operatorName: string;
  routedCount: number;
  lastBroadcast: Broadcast | null;
}) {
  const router = useRouter();
  const [ask, setAsk] = useState('');
  const [replies, setReplies] = useState(false);
  const lens = ventureAgents ? new Set(ventureAgents) : null;
  const dim = (id: string) => (lens ? !lens.has(id) : false);
  const names = Object.fromEntries(dir.agents.map((a) => [a.id, a.name]));

  return (
    <GPage className="wg-page">
      <GSectionHeader
        size="page"
        title={t('Org')}
        caption={t('Who works for whom, and on which venture')}
        action={
          ventures.length > 0 ? (
            <GSegmented
              label={t('Venture')}
              value={venture?.id ?? 'all'}
              onChange={(v) => router.push(v === 'all' ? '/org' : `/org?venture=${encodeURIComponent(v)}`)}
              options={[{ value: 'all', label: t('All ventures') }, ...ventures.map((v) => ({ value: v.id, label: v.label }))]}
            />
          ) : undefined
        }
      />

      {venture && (
        <GCard className="wg-org-focus">
          <span className="wg-org-focus-head">
            <span className="wg-org-vdot" style={{ background: venture.color }} aria-hidden />
            {venture.label} · {t('executive focus')}
          </span>
          <ul className="wg-org-focus-list">
            {venture.focus.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <span className="wg-cap">
            {venture.kind} · {venture.detail} · {t('Optimal Engine tag #{tag}', { tag: venture.brainTag })} ·{' '}
            {lens && lens.size > 0 ? t('{n} agents on this venture', { n: lens.size }) : t('No agents serve {venture} yet', { venture: venture.label })}
          </span>
        </GCard>
      )}

      <div className="wg-org-top">
        <GTag className="wg-org-op">{operatorName === 'Operator' ? t('Operator') : `${t('Operator')} · ${operatorName}`}</GTag>
        <div className="wg-org-head">
          <GCard href="/brain" className="wg-org-sys" aria-label={t('Optimal Engine, the knowledge store')}>
            <Brain size={18} strokeWidth={1.6} aria-hidden />
            <span className="wg-org-sys-title">Optimal Engine</span>
            <span className="wg-cap">{t('Knowledge store')}</span>
          </GCard>
          <div className="wg-org-wizard">
            <GHeroCard
              variant="a"
              size="sm"
              caption="Wizard"
              value={routedCount}
              label={t('The Wizard routes work to {n} agents', { n: routedCount })}
              status={t('routes work to {n} agents', { n: routedCount })}
              title={t('The super agent. Opens the Wizard dock.')}
              onClick={() => openWizard({ source: 'org-hero' })}
            />
            <GAsk
              value={ask}
              onValueChange={setAsk}
              label={t('Ask the Wizard')}
              placeholder={t('Ask the Wizard')}
              onSubmit={(text) => {
                openWizard({ text, source: 'org-ask' });
                setAsk('');
              }}
            />
            {lastBroadcast && (
              <GButton size="sm" onClick={() => setReplies(true)} title={t('Last broadcast: {message}', { message: lastBroadcast.message })}>
                {t('Last broadcast · {ok}/{total} replied', { ok: lastBroadcast.replies.filter((r) => r.ok).length, total: lastBroadcast.replies.length })}
              </GButton>
            )}
          </div>
          <GCard href="/inbox" className="wg-org-sys" aria-label={t('Comms feed, the unified inbox')}>
            <Inbox size={18} strokeWidth={1.6} aria-hidden />
            <span className="wg-org-sys-title">{t('Comms feed')}</span>
            <span className="wg-cap">Email, WhatsApp, Slack</span>
          </GCard>
        </div>
      </div>

      <GSectionHeader size={22} title={t('Departments')} caption={t('Every department reports to the Wizard')} />
      <div className="wg-org-cols">
        {columns.map((col) => (
          <GCard key={col.id} p={16} as="section" className="wg-org-col" aria-label={col.name}>
            <div className="wg-org-col-head">
              <span className="wg-org-col-name">{col.name}</span>
              {col.area && !col.name.toLowerCase().startsWith(col.area.toLowerCase().slice(0, 5)) && <GTag size="xs">{t(col.area)}</GTag>}
            </div>
            {col.leads.length === 0 && col.workers.length === 0 ? (
              <p className="wg-cap">{t('Agents land here as this department goes live.')}</p>
            ) : (
              <>
                {col.leads.length > 0 && (
                  <GList label={t('{name} leads', { name: col.name })}>
                    {col.leads.map((a) => (
                      <Row key={a.id} a={a} dir={dir} dim={dim(a.id)} lead />
                    ))}
                  </GList>
                )}
                {col.workers.length > 0 && (
                  <GList label={t('{name} crew', { name: col.name })}>
                    {col.workers.map((a) => (
                      <Row key={a.id} a={a} dir={dir} dim={dim(a.id)} lead={false} />
                    ))}
                  </GList>
                )}
              </>
            )}
          </GCard>
        ))}
      </div>

      <GSheet open={replies} onClose={() => setReplies(false)} width={560} title={t('Last broadcast')} caption={lastBroadcast ? `“${lastBroadcast.message}”` : undefined}>
        {lastBroadcast && (
          <GList divided label={t('Replies')}>
            {lastBroadcast.replies.map((r) => (
              <GRow
                key={r.id}
                leading={<span className="wg-dot" data-tone={r.ok ? 'ok' : 'err'} aria-label={r.ok ? t('Replied') : t('Failed')} />}
                title={names[r.agentId] ?? r.agentId}
                meta={r.reply}
                onClick={() => {
                  setReplies(false);
                  openAgentSheet(r.agentId);
                }}
              />
            ))}
          </GList>
        )}
      </GSheet>
      <AgentSheetHost dir={dir} />
    </GPage>
  );
}
