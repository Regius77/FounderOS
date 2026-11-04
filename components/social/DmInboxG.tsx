'use client';

/**
 * The Instagram DM inbox under the GladOS style (glados-ui SPEC S03 F3 H2,
 * F6): a GSheet with the thread list and the conversation. Same state as
 * Classic (useDmInbox); replies go out through ManyChat, ⌘ or Ctrl + Enter
 * sends, a failed send shows inline and appends nothing.
 */

import { Send } from 'lucide-react';
import { GButton, GEmpty, GErrorLine, GList, GRow, GSheet, GTag, GTextarea } from '@/components/g';
import type { DmThread } from '@/lib/social';
import { initials, relativeTime, useDmInbox } from './use-dm-inbox';
import { t } from '@/lib/i18n';

export function DmInboxSheetG({ open, threads, nowMs, onClose }: { open: boolean; threads: DmThread[]; nowMs: number; onClose: () => void }) {
  return (
    <GSheet open={open} onClose={onClose} title={t('Instagram DMs')} caption={t('Reply here. Replies send through ManyChat.')} width={1040}>
      <DmInboxG threads={threads} nowMs={nowMs} />
    </GSheet>
  );
}

function DmInboxG({ threads: initial, nowMs }: { threads: DmThread[]; nowMs: number }) {
  const { threads, active, setSelected, draft, setDraft, sending, error, isLive, send } = useDmInbox(initial);
  return (
    <div className="soc-g-inbox">
      <div className="soc-g-inbox-status">
        <GTag tone={isLive ? 'ok' : 'neutral'} dot>{isLive ? t('Live · ManyChat') : t('Seeded · goes live via the ManyChat webhook')}</GTag>
        <span className="soc-g-cap">{t('{n} conversations', { n: threads.length })}</span>
      </div>
      {threads.length === 0 ? (
        <GEmpty title={t('No DMs yet')} body={t('They appear here as ManyChat posts them to the webhook.')} />
      ) : (
        <div className="soc-g-inbox-grid">
          <div className="soc-g-threads">
            <GList label={t('Conversations')}>
              {threads.map((th) => (
                <GRow
                  key={th.subscriberId}
                  selected={th.subscriberId === active?.subscriberId}
                  onClick={() => setSelected(th.subscriberId)}
                  leading={<span className="soc-g-avatar" aria-hidden>{initials(th.name)}</span>}
                  title={th.name}
                  meta={`${th.last.direction === 'out' ? t('You: ') : ''}${th.last.text}`}
                  trailing={
                    <span className="soc-g-thread-trail">
                      <span className="soc-g-cap">{relativeTime(th.last.ts, nowMs)}</span>
                      {th.unreplied && <GTag tone="warn" size="xs" title={t('The last message is inbound')}>{t('Reply')}</GTag>}
                    </span>
                  }
                />
              ))}
            </GList>
          </div>
          {active && (
            <div className="soc-g-convo">
              <div className="soc-g-convo-head">
                <span className="soc-g-convo-name">{active.name}</span>
                {active.handle && <span className="soc-g-cap">@{active.handle.replace(/^@/, "")}</span>}
                {active.unreplied && <GTag tone="warn" dot>{t('Needs reply')}</GTag>}
              </div>
              <div className="soc-g-msgs">
                {active.messages.map((m) => (
                  <div key={m.id} className="soc-g-msg" data-dir={m.direction}>
                    <div className="soc-g-bubble">{m.text}</div>
                    <span className="soc-g-cap">{m.tag ? `${m.tag} · ` : ''}{relativeTime(m.ts, nowMs)}</span>
                  </div>
                ))}
              </div>
              <div className="soc-g-reply">
                {error && <GErrorLine align="left">{error}</GErrorLine>}
                <div className="soc-g-reply-row">
                  <GTextarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    rows={1}
                    maxLines={5}
                    aria-label={t('Reply to {name}', { name: active.name })}
                    placeholder={t('Reply to {name} (⌘ Enter sends)', { name: active.name })}
                  />
                  <GButton variant="ink" onClick={() => void send()} busy={sending} disabled={!draft.trim()} disabledReason={t('Write a reply first')}>
                    <Send size={14} strokeWidth={1.75} aria-hidden /> {t('Send')}
                  </GButton>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
