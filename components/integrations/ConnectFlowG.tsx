'use client';

import { useState } from 'react';
import { GButton, GDialog, GField, GInput, GSheet, GTag } from '@/components/g';
import { useConnectFlow } from '@/components/ConnectFlow';
import { t } from '@/lib/i18n';

/**
 * A connection's footer under the GladOS style (SPEC S05 F05.72): the state
 * as a tag, and Connect opening the paste-a-key form in a sheet rather than
 * inline. Same endpoint and rules as the Classic ConnectFlow: connected is
 * never faked, a stored key on a connector-less tile reads "Key saved".
 * Disconnect removes stored keys, so it asks first (§3.1.8).
 */
export function ConnectFlowG({
  slug,
  name,
  connected,
  keySaved,
  keys,
  guidance,
}: {
  slug: string;
  /** Tool name for the sheet title. */
  name: string;
  connected: boolean;
  keySaved: boolean;
  keys: string[];
  guidance?: string;
}) {
  const { open, setOpen, values, setValues, busy, error, setError, save, disconnect } = useConnectFlow(slug);
  const [confirm, setConfirm] = useState(false);
  const missing = keys.some((k) => !(values[k] ?? '').trim());

  return (
    <div className="kg-connect">
      {connected ? (
        <GTag tone="ok" dot>
          {t('Connected')}
        </GTag>
      ) : keySaved ? (
        <GTag tone="warn" dot title={t('A key is stored; the connector has not reported connected')}>
          {t('Key saved')}
        </GTag>
      ) : (
        <GTag tone="outline">{t('Not connected')}</GTag>
      )}
      {connected || keySaved ? (
        keySaved ? (
          <GButton variant="sm" busy={busy} onClick={() => setConfirm(true)}>
            {t('Disconnect')}
          </GButton>
        ) : (
          <span className="kg-cap" title={t('Credentials managed outside the console (canonical machine files)')}>
            {t('Managed')}
          </span>
        )
      ) : keys.length > 0 ? (
        <GButton variant="sm" onClick={() => setOpen(true)}>
          {t('Connect')}
        </GButton>
      ) : (
        <span className="kg-cap" title={guidance ?? t('Connects through local setup, not a pasted key')}>
          {t('Local setup')}
        </span>
      )}

      <GSheet
        open={open}
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
        title={t('Connect {name}', { name })}
        caption={t('Keys are written to .env.local on this host only, never to git.')}
        width={480}
        footer={
          <>
            <GButton
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
            >
              {t('Cancel')}
            </GButton>
            <GButton variant="ink" busy={busy} disabled={missing} disabledReason={t('Fill in every key first')} onClick={() => void save()}>
              {t('Save and connect')}
            </GButton>
          </>
        }
      >
        <div className="kg-form kg-form-wide">
          {keys.map((k) => (
            <GField key={k} label={<code data-mono-ok="">{k}</code>} htmlFor={`connect-${slug}-${k}`}>
              <GInput
                id={`connect-${slug}-${k}`}
                type="password"
                autoComplete="off"
                value={values[k] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
              />
            </GField>
          ))}
          {error && <p className="kg-err-line">{error}</p>}
        </div>
      </GSheet>

      <GDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t('Disconnect {name}?', { name })}
        confirmLabel={t('Disconnect')}
        tone="danger"
        busy={busy}
        onConfirm={() => {
          setConfirm(false);
          void disconnect();
        }}
      >
        <p className="kg-body">{t('The stored keys for {name} are removed from .env.local on this host.', { name })}</p>
      </GDialog>
    </div>
  );
}
