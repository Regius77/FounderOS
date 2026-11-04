'use client';

import { t } from '@/lib/i18n';
import { useEffect, useRef } from 'react';
import { OBtn } from '@/components/creative-engine/skin';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * The shortcuts sheet (S05b FR-67), opened by the "?" bar button or the `?`
 * key. Lists the keyboard map and what Run does, and offers "Show tips
 * again" for the coach marks.
 */

const KEYS: [string, string][] = [
  [t('Delete / Backspace'), t('Delete the selected nodes or links')],
  ['Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z, Ctrl+Y', t('Undo, redo')],
  ['Cmd/Ctrl+A', t('Select every node')],
  [t('Shift+click, Shift+drag'), t('Add to the selection, marquee select')],
  ['Cmd/Ctrl+C / V / D', t('Copy, paste, duplicate')],
  [t('Cmd/Ctrl+K or /'), t('Add a node at the centre')],
  ['Cmd/Ctrl+S', t('Save a version')],
  [t('Cmd/Ctrl+Enter'), t('Run (opens the cost check first)')],
  [t('Arrows, Shift+Arrows'), t('Nudge the selection 1 or 11 px')],
  [t('Alt while dragging'), t('Move without snapping to the grid')],
  ['F', t('Fit the selection, or everything')],
  ['0, +, −', t('Zoom to 100%, in, out')],
  [t('Shift+F'), t('Full screen on or off')],
  [t('Enter'), t('Open the settings of the selected node')],
  [t('Space+drag, middle-drag'), t('Pan from anywhere')],
  ['Esc', t('Close the innermost menu, sheet or selection')],
  ['?', t('This sheet')],
];

export function Shortcuts({ container, dry, onClose, onTips }: { container: Element; dry: boolean; onClose: () => void; onTips: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { root.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }); }, []);
  return createPortal(
    <div className="ae-o-gate" onClick={onClose}>
      <div ref={root} className="ae-o-panel ae-o-wf-keys w-full max-w-[560px] p-6" role="dialog" aria-modal="true" aria-labelledby="ae-wf-keys-title" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><div id="ae-wf-keys-title" className="text-[16px] font-medium">{t('Workflow builder keys')}</div><OBtn kind="icon-sm" cls="ae-o-icon sm"  onClick={onClose} aria-label={t('Close')}><X className="h-4 w-4" strokeWidth={2} /></OBtn></div>
        <dl>{KEYS.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}</dl>
        <div className="about">
          <b>{t('About Run.')}</b>{t(' Run checks the graph, then resolves local nodes (text, script, files, Claude, enhance, Deliver) in dependency order and sends each paid node to Arcads as its own request. Each paid node is charged separately when Arcads accepts it; the cost check lists them first. ')}{dry ? t('This instance runs dry: paid nodes get placeholder outputs and nothing is charged.') : t('Run failed only re-sends just what failed; Stop stops tracking requests, but anything Arcads already accepted stays charged.')}
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <OBtn kind="pill" cls="ae-o-pill"  onClick={onTips}>{t('Show tips again')}</OBtn>
          <OBtn kind="pill" cls="ae-o-pill"  onClick={onClose}>{t('Close')}</OBtn>
        </div>
      </div>
    </div>,
    container,
  );
}
