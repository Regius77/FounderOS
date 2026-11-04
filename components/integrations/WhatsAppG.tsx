import { ChevronLeft } from 'lucide-react';
import { GButton, GCard, GPage, GSectionHeader, GTag } from '@/components/g';
import { t } from '@/lib/i18n';
import { ConnectFlowG } from './ConnectFlowG';

/**
 * /integrations/whatsapp under the GladOS style (SPEC S05 F05.80): the three
 * cards keep their order and content; facts read as sentence-case labels, the
 * state is a tag, the section count badges are cut and the intro is the
 * header subtitle.
 */

export type ConnState = 'connected' | 'not_configured' | 'error';
type Row = { label: string; value: string };

function Facts({ rows }: { rows: Row[] }) {
  return (
    <dl className="kg-facts">
      {rows.map((r) => (
        <div key={r.label} className="kg-fact">
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function State({ state }: { state: ConnState }) {
  if (state === 'connected') return <GTag tone="ok" dot>{t('Live')}</GTag>;
  if (state === 'error') return <GTag tone="err" dot>{t('Error')}</GTag>;
  return <GTag tone="outline">{t('Not configured')}</GTag>;
}

function Head({ id, title, sub, state }: { id: string; title: string; sub: string; state?: ConnState }) {
  return <GSectionHeader size={22} id={id} title={title} caption={sub} action={state ? <State state={state} /> : <GTag tone="neutral">{t('Not built')}</GTag>} />;
}

export function WhatsAppG({ readState, readDetail, sendState, canSend }: { readState: ConnState; readDetail: string; sendState: ConnState; canSend: boolean }) {
  return (
    <GPage className="kg-page kg-narrow">
      <div className="kg-back">
        <GButton variant="sm" href="/integrations">
          <ChevronLeft size={13} strokeWidth={1.8} aria-hidden="true" /> {t('Connections')}
        </GButton>
      </div>
      <GSectionHeader
        size="page"
        title="WhatsApp"
        caption={t('Two connections, not one. Reading works off the desktop app on this Mac; sending needs a WhatsApp Business number of its own.')}
      />

      <GCard as="section" p={24} aria-labelledby="wa-read" className="kg-card-stack">
        <p className="kg-eyebrow">{t('Reading')}</p>
        <Head id="wa-read" title={t('Local desktop app')} sub={t('Reads the WhatsApp database on this Mac, read-only')} state={readState} />
        <Facts
          rows={[
            { label: t('Status'), value: readDetail },
            { label: t('Setup'), value: t('Nothing to paste. Requires the desktop app signed in, and Full Disk Access for the process running this console.') },
            { label: t('Gives you'), value: t('Every chat, real message history, profile pictures, and downloaded media — voice notes, images, video, documents.') },
            { label: t('Cannot do'), value: t('Send anything. The app owns the encryption session, so writing to its store transmits nothing.') },
          ]}
        />
      </GCard>

      <GCard as="section" p={24} aria-labelledby="wa-send" className="kg-card-stack">
        <p className="kg-eyebrow">{t('Sending')}</p>
        <Head id="wa-send" title="WhatsApp Business Cloud API" sub={t('Meta\'s official API, on a business number')} state={sendState} />
        <Facts
          rows={[
            { label: t('Setup'), value: t('Paste the phone number id and access token from developers.facebook.com → your app → WhatsApp → API Setup.') },
            { label: t('Gives you'), value: t('Replies sent from here to anyone who messaged your business number, within 24 hours of their last message.') },
            {
              label: t('Cannot do'),
              value: t(
                'Reach the personal chats above. It runs on a separate business number, cannot message groups or linked ids, and outside the 24-hour window only pre-approved templates go through.',
              ),
            },
          ]}
        />
        <ConnectFlowG slug="whatsapp" name={t('WhatsApp sending')} connected={canSend} keySaved={canSend} keys={['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN']} />
      </GCard>

      <GCard as="section" p={24} aria-labelledby="wa-other" className="kg-card-stack">
        <p className="kg-eyebrow">{t('Other ways to send')}</p>
        <Head id="wa-other" title={t('Linked device')} sub={t('Pairing by QR, the way WhatsApp Web does')} />
        <Facts
          rows={[
            {
              label: t('What it is'),
              value: t(
                'Pairing this console to your personal account by QR, the way WhatsApp Web does. It is the only route that can reply to the personal chats and groups above.',
              ),
            },
            {
              label: t('Why it is not here'),
              value: t(
                'It relies on an unofficial library. Meta does not sanction it and accounts get banned for automated use, so it is a deliberate decision rather than a default.',
              ),
            },
          ]}
        />
      </GCard>
    </GPage>
  );
}
