'use client';

import { GButton, GCard, GTickStrip } from '@/components/g';
import { relativeTime } from '@/lib/wizard/helpers';
import type { Agent, AgentRun } from '@/lib/schemas';
import { AgentFace } from './AgentFace';
import { agentStatusLabel } from '@/founderos/lib/labels';
import { t, localeTag } from '@/lib/i18n';

/**
 * Compact roster card (glados-ui SPEC S04 F-A4, X1 composite "AgentCard"):
 * avatar, name, role, one status, the last run and a 12-run strip, plus a
 * "Set up" button when the agent needs wiring. Everything else lives in the
 * AgentSheet. The card face is one button that opens the sheet; Set up is a
 * sibling link so controls never nest.
 */
export function AgentCard({ agent, avatar, runs, setup, onOpen }: { agent: Agent; avatar: string | undefined; runs: AgentRun[]; setup: boolean; onOpen: () => void }) {
  const last = runs[0];
  const recent = runs.slice(0, 12).reverse();
  const active = agent.status === 'active';
  return (
    <div className="wg-agent" data-status={agent.status}>
      <GCard p={16} onClick={onOpen} aria-label={t('Open {name} profile', { name: agent.name })} className="wg-agent-open">
        <span className="wg-agent-top">
          <AgentFace src={avatar} name={agent.name} size={36} />
          <span className="wg-agent-id">
            <span className="wg-agent-name">{agent.name}</span>
            <span className="wg-agent-role">{agent.role}</span>
          </span>
        </span>
        <span className="wg-agent-status">
          <span className="wg-dot" data-tone={active ? 'ok' : 'idle'} aria-hidden />
          {agentStatusLabel(agent.status)}
        </span>
        <span className="wg-agent-run" title={last?.summary}>
          {last ? (last.ok ? t('Last run ok · {when}', { when: relativeTime(last.startedAt) }) : t('Last run failed · {when}', { when: relativeTime(last.startedAt) })) : t('No runs recorded')}
        </span>
        {recent.length > 0 && (
          <GTickStrip
            kind="runs"
            label={t('{name}: last {n} runs, {ok} ok', { name: agent.name, n: recent.length, ok: recent.filter((r) => r.ok).length })}
            states={recent.map((r) => (r.ok ? 'ok' : 'failed'))}
            titles={recent.map((r) => `${r.ok ? t('ok') : t('failed')} · ${new Date(r.startedAt).toLocaleDateString(localeTag())} · ${r.summary}`)}
            className="wg-agent-ticks"
          />
        )}
      </GCard>
      {setup && (
        <GButton variant="sm" href={`/agents/setup/${agent.id}`} className="wg-agent-setup">
          {t('Set up')}
        </GButton>
      )}
    </div>
  );
}
