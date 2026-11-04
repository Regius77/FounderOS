'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { ConductorEmblem } from '@/components/ConductorEmblem';
import { t } from '@/lib/i18n';

/**
 * Wizard chat for the /agents page. Unlike the broadcast ConductorCard on
 * /org, this routes: a bare message goes to the best-fit agent; prefix with
 * `@agent-id` (or `@Name`) to force one. Posts to
 * POST /api/agents/conductor/chat and shows which agent answered.
 */
type Turn = { id: string; role: 'user' | 'assistant'; content: string; routedTo?: string };

export function ConductorChat({ agentNames }: { agentNames: Record<string, string> }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    setTurns((prev) => [...prev, { id: `u-${prev.length}-${text.length}`, role: 'user', content: text }]);
    setInput('');
    try {
      const res = await fetch('/api/agents/conductor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error(t('conductor failed ({status})', { status: res.status }));
      const body = (await res.json()) as { routedTo: string; reply: string };
      setTurns((prev) => [...prev, { id: `a-${prev.length}`, role: 'assistant', content: body.reply, routedTo: body.routedTo }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-lg-t border border-os-border-strong bg-os-surface p-6">
      <div className="flex items-center gap-3.5">
        <ConductorEmblem size={38} thinking={sending} />
        <div className="min-w-0">
          <div className="text-[14.5px] font-medium">Wizard</div>
          <div className="text-[12.5px] text-os-dim">
            {t('routes to the best-fit agent — or prefix')} <span className="font-mono text-[11.5px] text-os-muted">@agent-id</span> {t('to pick one')}
          </div>
        </div>
      </div>

      {turns.length > 0 && (
        <div className="mt-4 max-h-60 space-y-2.5 overflow-y-auto pr-1">
          {turns.map((turn) =>
            turn.role === 'user' ? (
              <div key={turn.id} className="text-right">
                <span className="inline-block max-w-[85%] break-words rounded-md bg-os-surface2 px-2.5 py-1 text-[13px] text-os-text">
                  {turn.content}
                </span>
              </div>
            ) : (
              <div key={turn.id} className="text-left">
                {turn.routedTo && (
                  <div className="mb-0.5 text-[11.5px] text-os-muted">
                    → {agentNames[turn.routedTo] ?? turn.routedTo}
                  </div>
                )}
                <span className="inline-block max-w-[85%] break-words rounded-md bg-os-raised px-2.5 py-1 text-[13px] text-os-muted">
                  {turn.content}
                </span>
              </div>
            ),
          )}
        </div>
      )}

      <div className="mt-4 flex gap-2.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={t('Talk to Wizard — it routes you to the right agent')}
          disabled={sending}
          className="min-w-0 flex-1 rounded-sm-t border border-os-border bg-os-surface2 px-3 py-2.5 text-[13px] text-os-text placeholder:text-os-dim focus:border-os-border-strong focus:outline-none"
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="flex shrink-0 items-center gap-2.5 rounded-sm-t border border-os-border-strong bg-os-surface2 px-3 py-2.5 text-[13px] text-os-text transition-colors hover:bg-os-surface3 disabled:opacity-40"
        >
          {sending ? <span className="text-[12.5px]">{t('routing…')}</span> : <Send className="h-3 w-3" />}
        </button>
      </div>
      {error && (
        <p className="mt-1.5 flex items-center gap-2 text-[12px] text-os-muted">
          <span className="dot err" /> {error}
        </p>
      )}
    </div>
  );
}
