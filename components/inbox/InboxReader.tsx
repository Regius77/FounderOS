'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ArrowRight, Archive, Clock, ExternalLink, MapPin, Video } from 'lucide-react';
import { clock, messagesFor, relativeTime, whatsappNumber, type InboxThread, type ThreadMessage } from '@/lib/inbox';
import { Avatar, Mono, SourcePill, TriagePill, sourceLabel } from './bits';
import { MediaBlock } from './Media';
import { SetupLink } from '@/components/SetupLink';
import { setupHrefFor } from '@/lib/integrations-catalog';
import { t, localeTag, tc } from '@/lib/i18n';

export type ReaderHandle = { focusReply: () => void };

/**
 * Real history for the open chat, fetched on demand. The page renders every
 * thread at once, so loading history for all of them would read the whole
 * message table on each request — only the thread being read is pulled, and
 * the feed's one-line preview stands in until it arrives.
 */
export function useHistory(jid: string | undefined): { messages: ThreadMessage[] | null; loading: boolean } {
  const [messages, setMessages] = useState<ThreadMessage[] | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!jid) {
      setMessages(null);
      return;
    }
    let dead = false;
    setLoading(true);
    setMessages(null);
    fetch(`/api/whatsapp/thread?jid=${encodeURIComponent(jid)}&limit=80`)
      .then((r) => r.json())
      .then((b) => {
        if (!dead && b?.ok && Array.isArray(b.messages)) setMessages(b.messages as ThreadMessage[]);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!dead) setLoading(false);
      });
    return () => {
      dead = true;
    };
  }, [jid]);
  return { messages, loading };
}

const QUICK: { label: string; text: string }[] = [
  { label: t('/draft reply'), text: t('Thanks for this. ') },
  { label: t('/confirm time'), text: t('Confirmed on my end. ') },
  { label: t('/ask for details'), text: t('Can you send over the details so I can review? ') },
  { label: t('/next steps'), text: t('Next step on our side: ') },
];

/** Right column: the whole exchange and the reply bar. The derived-triage
    explainer that used to sit above the messages was removed — the queue a
    thread is in is not worth a panel of its own. */
export const InboxReader = forwardRef<
  ReaderHandle,
  {
    thread: InboxThread | null;
    /** A WhatsApp Business number is connected, so sending is possible at all. */
    whatsappSendReady: boolean;
    bodies: Record<string, ThreadMessage[]>;
    nowISO: string;
    done: boolean;
    onDone: () => void;
    onSnooze: () => void;
  }
>(function InboxReader({ thread, bodies, nowISO, whatsappSendReady, done, onDone, onSnooze }, ref) {
  const now = new Date(nowISO);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  useImperativeHandle(ref, () => ({ focusReply: () => inputRef.current?.focus() }), []);
  // A draft belongs to one thread — never carry it into the next one.
  const threadKey = thread?.key ?? null;
  useEffect(() => {
    setDraft('');
    setStatus(null);
  }, [threadKey]);
  // Called before the empty-state return so the hook order never changes.
  const { messages: history, loading: historyLoading } = useHistory(thread?.jid);

  if (!thread) {
    return (
      <section className="ib-col ib-reader ib-reader-empty">
        <div>
          <p className="ib-empty-title">{t('Pick a thread')}</p>
          <p className="ib-empty-sub">
            <kbd>j</kbd> <kbd>k</kbd> {t('move')} · <kbd>r</kbd> {t('reply')} · <kbd>e</kbd> {tc('button', 'done')} · <kbd>/</kbd> {t('search')}
          </p>
        </div>
      </section>
    );
  }

  const th = thread;
  const messages = messagesFor(th, bodies);
  // Real history wins the moment it lands; the preview holds the space until then.
  const shown = history && history.length ? history : messages;

  async function send() {
    const text = draft.trim();
    if (!text) return;
    setStatus(null);
    if (th.source === 'slack' && th.context) {
      const res = await fetch('/api/comms/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'slack', channel: th.context.replace(/^#/, ''), text }),
      }).catch(() => null);
      const body = res ? await res.json().catch(() => ({})) : {};
      setStatus(body.detail ?? (res?.ok ? t('sent') : tc('send', 'failed')));
      if (res?.ok) setDraft('');
      return;
    }
    if (th.source === 'email') {
      if (!th.replyTo) return setStatus(t('no reply address on this message'));
      const res = await fetch('/api/comms/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'email', account: th.account, to: th.replyTo, subject: `Re: ${th.preview}`, text }),
      }).catch(() => null);
      const body = res ? await res.json().catch(() => ({})) : {};
      if (res?.ok && body.ok) {
        setStatus(t('sent'));
        setDraft('');
        return;
      }
      window.location.href = `mailto:${th.replyTo}?subject=${encodeURIComponent(`Re: ${th.preview}`)}&body=${encodeURIComponent(text)}`;
      setStatus(body.error ? t('SMTP unavailable, opened a draft in Mail') : t('opened a draft in Mail'));
      return;
    }
    if (th.source === 'whatsapp') {
      const res = await fetch('/api/comms/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'whatsapp', jid: th.jid, text }),
      }).catch(() => null);
      const body = res ? await res.json().catch(() => ({})) : {};
      if (res?.ok && body.ok) {
        setStatus(t('sent'));
        setDraft('');
        return;
      }
      setStatus(body.error ? String(body.error) : t('could not send'));
      return;
    }
  }

  // Why WhatsApp cannot be replied to, if it cannot. Reading comes from the
  // read-only desktop store, so sending is a separate connection entirely —
  // an unconfigured install is pointed at setup rather than told to go and
  // paste the message into WhatsApp itself.
  const waBlock =
    th.source !== 'whatsapp'
      ? null
      : !whatsappSendReady
        ? {
            title: t('Sending is not set up yet'),
            body: t('This console reads WhatsApp from the desktop app on this Mac, which cannot send. Connect a WhatsApp Business number to reply from here.'),
          }
        : !whatsappNumber(th.jid)
          ? {
              title: t('This chat cannot be replied to from here'),
              body: t('The Business API can only message a phone number. This is a group or a linked id, so it has none.'),
            }
          : null;
  const canReply = th.source !== 'calendar' && !waBlock;

  return (
    <section className="ib-col ib-reader">
      <header className="ib-reader-h">
        <Avatar name={th.sender} source={th.source} size={40} src={th.avatarUrl} />
        <div className="ib-reader-who">
          <div className="ib-reader-name">
            {th.sender}
            <SourcePill source={th.source} />
            <TriagePill triage={done ? 'done' : th.triage} />
          </div>
          <div className="ib-reader-sub">
            {th.context}
            {th.replyTo && (
              <>
                {' · '}
                <Mono>{th.replyTo}</Mono>
              </>
            )}
            {th.account && (
              <>
                {t(' · via ')}
                <Mono>{th.account}</Mono>
              </>
            )}
          </div>
        </div>
        <div className="ib-reader-actions">
          {canReply && (
            <button className="ib-btn" onClick={onSnooze} title={t('Hide for 24 hours (saved on this browser)')}>
              <Clock strokeWidth={1.8} /> {t('Snooze')}
            </button>
          )}
          <button className={`ib-btn ${done ? 'is-on' : ''}`} onClick={onDone} title={t('Mark done (e)')}>
            <Archive strokeWidth={1.8} /> {done ? tc('button', 'Done') : t('Mark done')}
          </button>
          {th.event?.joinUrl && (
            <a className="ib-btn ib-btn-dark" href={th.event.joinUrl} target="_blank" rel="noreferrer">
              <Video strokeWidth={1.8} /> {t('Join')}
            </a>
          )}
        </div>
      </header>

      <div className="ib-reader-body">
        {th.source === 'calendar' && th.event ? (
          <div className="ib-event">
            <div className="ib-event-row">
              <Mono className="ib-label">{t('When')}</Mono>
              <span>
                {new Date(th.ts).toLocaleDateString(localeTag(), { weekday: 'long', month: 'short', day: 'numeric' })}
                {' · '}
                <Mono>
                  {th.event.allDay ? t('All day') : `${clock(th.ts)}${th.event.end ? ` – ${clock(th.event.end)}` : ''}`}
                </Mono>
              </span>
            </div>
            <div className="ib-event-row">
              <Mono className="ib-label">{t('Calendar')}</Mono>
              <span>
                <span className="ib-cal-swatch" style={{ background: th.event.color }} />
                {th.context}
              </span>
            </div>
            {th.event.location && (
              <div className="ib-event-row">
                <Mono className="ib-label">{t('Where')}</Mono>
                <span>
                  <MapPin strokeWidth={1.8} className="ib-inline-ic" />
                  {th.event.location}
                </span>
              </div>
            )}
            {th.event.joinUrl && (
              <div className="ib-event-row">
                <Mono className="ib-label">{t('Link')}</Mono>
                <a href={th.event.joinUrl} target="_blank" rel="noreferrer" className="ib-link">
                  {th.event.joinUrl} <ExternalLink strokeWidth={1.8} className="ib-inline-ic" />
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="ib-thread">
            {historyLoading && <p className="ib-thread-note">{t('Loading this conversation…')}</p>}
            {shown.map((m, i) => (
              <div key={i} className={`ib-msg ${m.from === 'me' ? 'is-me' : ''}`}>
                {m.from === 'them' && <Avatar name={th.sender} source={th.source} size={28} src={th.avatarUrl} />}
                <div className="ib-msg-body">
                  <Mono className="ib-msg-meta">
                    {m.from === 'me' ? t('You') : m.author || th.sender} · {clock(m.ts)} · {relativeTime(m.ts, now)}
                  </Mono>
                  {m.media && <MediaBlock media={m.media} />}
                  {m.text && <div className="ib-bubble">{m.text}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {waBlock && (
        <footer className="ib-reply ib-reply-blocked">
          <div className="ib-setup-note">
            <p className="ib-setup-title">{waBlock.title}</p>
            <p className="ib-setup-body">{waBlock.body}</p>
          </div>
          <SetupLink href={setupHrefFor('whatsapp')} label={t('Set up WhatsApp')} />
        </footer>
      )}

      {canReply && (
        <footer className="ib-reply">
          <div className="ib-quick">
            {QUICK.map((q) => (
              <button
                key={q.label}
                className="ib-quick-chip"
                onClick={() => {
                  setDraft((d) => (d ? d : q.text));
                  inputRef.current?.focus();
                }}
              >
                <Mono>{q.label}</Mono>
              </button>
            ))}
          </div>
          <div className="ib-ask">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              placeholder={t('Reply to {name} on {source}', { name: th.sender, source: sourceLabel(th.source) })}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <button className="ib-send" onClick={() => void send()} title={t('Send (⌘↵)')} aria-label={t('Send')}>
              <ArrowRight strokeWidth={2} />
            </button>
          </div>
          <div className="ib-reply-foot">
            <Mono>{t('⌘↵ to send')}</Mono>
            {status && <Mono className="ib-status">{status}</Mono>}
          </div>
        </footer>
      )}
    </section>
  );
});
