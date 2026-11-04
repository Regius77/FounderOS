'use client';

/**
 * /trading when the store itself is unreachable (pages/trading.md §3 Error):
 * a DB problem is real, so the whole page says so, with Retry.
 */
import { useRouter } from 'next/navigation';
import { GCard, GEmpty, GPage, GSectionHeader } from '@/components/g';
import { PageHeader } from '@/components/PageHeader';
import { t } from '@/lib/i18n';

export function TradingError({ message, g }: { message: string; g: boolean }) {
  const router = useRouter();
  if (g) {
    return (
      <GPage className="trd-g">
        <GSectionHeader size="page" title={t('Trading')} caption={t('The trading store could not be read')} />
        <GCard p={24}>
          <GEmpty kind="error" title={t('The trading store is not reachable.')} body={message} onRetry={() => router.refresh()} />
        </GCard>
      </GPage>
    );
  }
  return (
    <div className="trd-c">
      <PageHeader title={t('Trading')} eyebrow={t('The trading store could not be read')} />
      <div role="alert" className="rounded-lg-t border border-os-border bg-os-surface px-5 py-8 text-center">
        <p className="text-[14px] text-os-text">{t('The trading store is not reachable.')}</p>
        <p className="mt-1 font-mono text-[12px] text-os-muted">{message}</p>
        <button type="button" onClick={() => router.refresh()} className="c-btn mt-4">
          {t('Retry')}
        </button>
      </div>
    </div>
  );
}
