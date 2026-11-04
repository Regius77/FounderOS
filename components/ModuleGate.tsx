'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GEmpty } from '@/components/g';
import { useUiStyle } from '@/lib/use-ui-style';
import type { UiStyle } from '@/lib/appearance';
import { NAV_ITEMS } from '@/lib/nav';
import { offModuleFor } from '@/lib/modules';
import { t } from '@/lib/i18n';

/** A switched-off module's page (Settings → Modules, lib/modules.ts) shows this instead of its content. */
export function ModuleGate({ off, ui, children }: { off: string[]; ui: UiStyle; children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const g = useUiStyle(ui) === 'glados';
  const href = offModuleFor(pathname, off);
  if (!href) return <>{children}</>;
  const label = NAV_ITEMS.find((i) => i.href === href)?.label ?? t('This module');
  const body = t('Switch it back on in Settings under Modules. Its data is kept as it was.');
  if (g) return <GEmpty title={t('{label} is switched off', { label })} body={body} action={{ label: t('Open Settings'), href: '/setup#modules' }} />;
  return (
    <div className="mx-auto mt-16 max-w-[420px] rounded-lg-t border border-os-border bg-os-surface px-6 py-8 text-center">
      <p className="text-[14px] font-medium text-os-text">{t('{label} is switched off', { label })}</p>
      <p className="mt-1.5 text-[12.5px] text-os-muted">{body}</p>
      <Link href="/setup#modules" className="cf-btn mt-4 inline-flex">
        {t('Open Settings')}
      </Link>
    </div>
  );
}
