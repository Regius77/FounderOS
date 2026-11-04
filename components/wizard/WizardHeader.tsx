'use client';

import { Plus } from 'lucide-react';
import { t } from '@/lib/i18n';

export type WizardTab = 'workspace' | 'sessions';

export function WizardHeader({
  tab,
  onTab,
  onCreateAgent,
  projectCount,
}: {
  tab: WizardTab;
  onTab: (tab: WizardTab) => void;
  onCreateAgent: () => void;
  projectCount: number;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-[30px] leading-none tracking-[-0.01em] text-os-text">Wizard</h1>
          <button type="button" aria-label={t('Create an agent')} onClick={onCreateAgent} className="wz-plus group/plus">
            <Plus className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 ease-[var(--ease)] group-hover/plus:rotate-90" strokeWidth={2.2} />
            <span className="wz-plus-label">{t('Create an agent')}</span>
          </button>
        </div>
        <p className="mt-2 text-[13px] text-os-muted">{t('Talk to the system. Every conversation becomes a project.')}</p>
      </div>
      <div className="flex items-center gap-6">
        <span className="text-[12px] text-os-dim tabular-nums">
          {projectCount === 1 ? t('{n} project', { n: projectCount }) : t('{n} projects', { n: projectCount })}
        </span>
        <div className="flex items-center gap-5" role="tablist">
          {(['workspace', 'sessions'] as WizardTab[]).map((key) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => onTab(key)} className={`wz-tab ${tab === key ? 'wz-tab-on' : ''}`}>
              {key === 'workspace' ? t('Workspace') : t('Sessions')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
