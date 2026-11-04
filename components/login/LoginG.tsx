'use client';

/* eslint-disable @next/next/no-img-element */
import { GButton, GCard, GField, GInput } from '@/components/g';
import { useLogin } from '@/components/LoginForm';
import { t } from '@/lib/i18n';

/**
 * /login under the GladOS style (SPEC S05 F05.101): a centred 380px card on
 * the ground, no shell (H37, lib/bare-routes.ts). Same submit and endpoint as
 * the Classic form; `<form>` semantics are kept so Enter submits.
 */

function Frame({ brandName, mark, children }: { brandName: string; mark: string; children: React.ReactNode }) {
  return (
    <div data-g="GPage" className="g-page kg-login">
      <div className="page-ground g-ground" aria-hidden />
      <GCard p={24} as="section" className="kg-login-card" aria-label={t('{brand} sign in', { brand: brandName })}>
        <div className="kg-login-brand">
          <img src={mark} alt="" width={28} height={21} className="kg-login-mark" />
          <span>{brandName}</span>
        </div>
        {children}
      </GCard>
    </div>
  );
}

export function LoginFormG({ brandName, mark }: { brandName: string; mark: string }) {
  const { password, setPassword, error, busy, submit } = useLogin();
  return (
    <Frame brandName={brandName} mark={mark}>
      <h1 className="kg-login-title">{t('Sign in')}</h1>
      <p className="kg-cap">{t('Operator console · sign in to continue')}</p>
      <form onSubmit={submit} className="kg-login-form">
        <GField label={t('Operator password')} htmlFor="login-password" error={error ?? undefined}>
          <GInput
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
            invalid={Boolean(error)}
          />
        </GField>
        <GButton type="submit" variant="ink" busy={busy} disabled={password.length === 0} disabledReason={t('Type the password first')} className="kg-login-submit">
          {t('Sign in')}
        </GButton>
      </form>
      <p className="kg-cap">
        {t('Set in Settings on the machine {brand} runs on. Stored there as a hash in', { brand: brandName })} <code data-mono-ok="">.env.local</code>{t(', never in git. Forgot it: delete the')}{' '}
        <code data-mono-ok="">GLADOS_PASSWORD_HASH</code> {t('line, restart, and set a new one.')}
      </p>
    </Frame>
  );
}

export function NoPasswordG({ brandName, mark }: { brandName: string; mark: string }) {
  return (
    <Frame brandName={brandName} mark={mark}>
      <h1 className="kg-login-title">{t('No password is set')}</h1>
      <p className="kg-body">
        {t('Nothing is locked, so there is nothing to sign in to. Open the console directly, or set an operator password under Settings to turn sign-in on.')}
      </p>
      <div className="kg-setting-actions">
        <GButton variant="ink" href="/">
          {t('Open {brand}', { brand: brandName })}
        </GButton>
        <GButton href="/setup#security">{t('Set a password')}</GButton>
      </div>
    </Frame>
  );
}
