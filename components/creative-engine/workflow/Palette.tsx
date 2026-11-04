'use client';

import { t } from '@/lib/i18n';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { OBtn, OInput } from '@/components/creative-engine/skin';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import type { NodeType } from '@/lib/creative-engine/schemas';
import { NODE_SPECS, PALETTE } from '@/lib/creative-engine/workflow';
import { clampPopover, fitsContext, paletteMatches, type PaletteContext } from '@/lib/creative-engine/workflow-edit';
import { NODE_ICON } from '@/components/creative-engine/workflow/icons';

/**
 * The add-node palette (S05b FR-38 to FR-43). A popover portalled to the
 * nearest `.ae-octane` root (the console, or the full-screen layer), placed
 * in viewport coordinates with clampPopover, so the stage's overflow can
 * never clip it. The search box is pinned; only the list scrolls, and a
 * wheel over the palette never reaches the canvas or the console page.
 */

export const PALETTE_W = 280;
export const PALETTE_MAX_H = 420;

type Group = { label: string; types: NodeType[] };

export function Palette({ at, title, ctx, recent, needsArcads, needsClaude = false, container, onPick, onClose }: {
  /** client coordinates of the opening point */
  at: { x: number; y: number };
  /** header for connect / insert mode */
  title?: string;
  ctx?: PaletteContext;
  recent: NodeType[];
  /** true when paid node types need an Arcads connection to run */
  needsArcads: boolean;
  /** true when the LLM node can't run here: Claude isn't on this host and runs are live (Q-WF-4: still addable) */
  needsClaude?: boolean;
  container: Element;
  onPick: (type: NodeType) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const uid = useId().replace(/:/g, '');

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const groups: Group[] = useMemo(() => {
    if (q.trim()) { const hits = paletteMatches(q, ctx); return hits.length ? [{ label: 'Matches', types: hits }] : []; }
    const out: Group[] = [];
    const rec = recent.filter((ty) => fitsContext(ty, ctx));
    if (rec.length) out.push({ label: 'Recent', types: rec });
    for (const g of PALETTE) { const types = g.types.filter((ty) => fitsContext(ty, ctx)); if (types.length) out.push({ label: g.label, types }); }
    return out;
  }, [q, ctx, recent]);
  const flat = useMemo(() => groups.flatMap((g) => g.types), [groups]);
  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => { list.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active]);

  // wheel and trackpad scroll only the list: never the canvas, never the console page
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (list.current) list.current.scrollTop += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // a press outside closes it (the canvas handles its own presses)
  useEffect(() => {
    const onDown = (e: PointerEvent) => { if (root.current && !root.current.contains(e.target as Node) && !(e.target as Element).closest?.('.ae-o-wf-stage')) onClose(); };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [onClose]);

  useLayoutEffect(() => { input.current?.focus({ preventScroll: true }); }, []);

  const sheet = vp.w < 480;
  const h = Math.min(PALETTE_MAX_H, vp.h - 16);
  const pos = clampPopover(at, { w: PALETTE_W, h }, vp);
  const style: React.CSSProperties = sheet ? {} : { left: pos.x, top: pos.y, width: PALETTE_W, height: h };

  const onKey = (e: React.KeyboardEvent) => {
    if (!flat.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % flat.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + flat.length) % flat.length); }
    else if (e.key === 'Enter') { e.preventDefault(); const ty = flat[active]; if (ty) onPick(ty); }
  };

  let idx = -1;
  return createPortal(
    <div ref={root} className="ae-o-wf-palette" data-sheet={sheet || undefined} data-flip-x={pos.flipX || undefined} data-flip-y={pos.flipY || undefined} style={style} role="dialog" aria-label={title ?? t('Add a node')} onPointerDown={(e) => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()}>
      {title && <div className="hd">{title}</div>}
      <label className="search">
        <Search className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        <OInput ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder={t('Search nodes')} aria-label={t('Search nodes')} role="combobox" aria-expanded="true" aria-controls={`${uid}-list`} aria-activedescendant={flat.length ? `${uid}-opt-${active}` : undefined} autoComplete="off" spellCheck={false} />
      </label>
      <div ref={list} className="list" id={`${uid}-list`} role="listbox" aria-label={t('Node types')}>
        {groups.map((g) => (
          <div key={g.label} role="group" aria-label={t(g.label)}>
            <div className="grp">{t(g.label)}</div>
            {g.types.map((ty) => {
              idx += 1;
              const i = idx;
              const paid = !NODE_SPECS[ty].local;
              const off = (paid && needsArcads) ? 'arcads' : (ty === 'llm' && needsClaude) ? 'claude' : null;
              return (
                <OBtn kind="row" cls="item" keep="item" key={`${g.label}-${ty}`} id={`${uid}-opt-${i}`} data-idx={i} role="option" aria-selected={i === active}  data-active={i === active} data-off={off ?? undefined} onPointerEnter={() => setActive(i)} onClick={() => onPick(ty)}>
                  <span className="ae-o-node-icon" style={{ width: 22, height: 22 }}>{NODE_ICON[ty]}</span>
                  <span className="min-w-0 flex-1">{t(NODE_SPECS[ty].label)}<small>{t(NODE_SPECS[ty].hint)}</small></span>
                  {off === 'arcads' && <span className="badge" title={t('Paid node: Run needs an Arcads connection. You can still design with it.')}>{t('Needs Arcads')}</span>}
                  {off === 'claude' && <span className="badge" title={t('Claude is not available on this host: you can still design with it, and it fails at run until Claude is installed.')}>{t('Needs Claude')}</span>}
                </OBtn>
              );
            })}
          </div>
        ))}
        {!flat.length && (
          <div className="none">
            {q.trim() ? <>{t('No node matches “{q}”', { q: q.trim() })}<OBtn kind="pill" cls="ae-o-pill"  onClick={() => { setQ(''); input.current?.focus(); }}>{t('Clear')}</OBtn></> : t('No node takes this link.')}
          </div>
        )}
      </div>
    </div>,
    container,
  );
}
