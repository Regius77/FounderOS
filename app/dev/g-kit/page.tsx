import { notFound } from 'next/navigation';
import { t } from '@/lib/i18n';
import { KitGallery } from './KitGallery';

/**
 * Dev-only gallery of the G kit (SPEC S00 §10, lane 1d): every primitive in
 * every state, for screenshot review and the audit scripts. Not in the nav,
 * not served by a production build.
 */
export const metadata = { title: t('Kit gallery') };

export default function GKitPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <KitGallery />;
}
