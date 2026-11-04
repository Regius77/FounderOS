'use client';

import { t } from '@/lib/i18n';
import { useMemo, useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import type { Angle, Campaign, Framework, ScriptControls, Tone, Intro } from '@/lib/creative-engine/schemas';
import { FRAMEWORKS } from '@/lib/creative-engine/schemas';
import { FRAMEWORK_BANK } from '@/lib/creative-engine/frameworks';
import { TONE_OPTIONS, INTRO_OPTIONS } from '@/lib/creative-engine/compose';
import { wordsForSeconds } from '@/lib/creative-engine/duration';
import { api } from '@/components/creative-engine/api';
import { ErrorLine, Field } from '@/components/creative-engine/primitives';
import { Btn, Chip, Input, Textarea } from '@/components/creative-engine/skin';
import { Empty, OptionSelect } from '@/components/creative-engine/skin-dash';

/**
 * Ad scripter on paper: a settings column (framework, length, tone, intro,
 * CTA) and a beat column where each beat is a white card with the spoken
 * line large and the on-screen note small. Versions are pills; approving
 * is the one ink action; the three exits sit together.
 */
export function Scripter({ campaign, readOnly = false, onCampaign, onUgc, onMotion, onBrief, onGenerator, initialAngleId, initialScriptId }: { onGenerator?: () => void; campaign: Campaign | null; readOnly?: boolean; onCampaign: (c: Campaign) => void; onUgc: () => void; onMotion: () => void; onBrief: () => void; initialAngleId?: string; initialScriptId?: string }) {
  // S07 §7.5: open at a given angle (or the angle a script belongs to). An angle written but
  // no longer selected still opens, so a delivered script is never unreachable.
  const wanted = initialAngleId ?? campaign?.scripts.find((s) => s.id === initialScriptId)?.angleId ?? null;
  const picked = campaign?.angles.filter((a) => a.selected) ?? [];
  const extra = wanted && !picked.some((a) => a.id === wanted) ? campaign?.angles.find((a) => a.id === wanted && campaign.scripts.some((s) => s.angleId === a.id)) : undefined;
  const selected = extra ? [...picked, extra] : picked;
  const [active, setActive] = useState<string | null>(wanted ?? selected[0]?.id ?? null);
  const angle = selected.find((a) => a.id === active) ?? selected[0] ?? null;
  if (!campaign || !angle) return <Empty line1={t('No angles selected yet.')} line2={t('Pick one or more angles in the Creative generator, then write each one here.')} action={onGenerator ? { label: t('Open the Creative generator'), onClick: onGenerator } : undefined} />;
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {selected.map((a) => {
          const s = campaign.scripts.find((x) => x.angleId === a.id);
          return (<Chip key={a.id} active={angle.id === a.id} onClick={() => setActive(a.id)}>{a.title.slice(0, 30)}<span className="opacity-60">{!s ? t('not written') : s.approvedVersion ? t('approved') : `v${s.versions.length}`}</span></Chip>);
        })}
      </div>
      <AngleScripter key={angle.id} campaign={campaign} angle={angle} readOnly={readOnly} onCampaign={onCampaign} onUgc={onUgc} onMotion={onMotion} onBrief={onBrief} />
    </div>
  );
}

const DURATIONS = [null, 8, 12, 15, 20, 30] as const;

function AngleScripter({ campaign, angle, readOnly, onCampaign, onUgc, onMotion, onBrief }: { campaign: Campaign; angle: Angle; readOnly: boolean; onCampaign: (c: Campaign) => void; onUgc: () => void; onMotion: () => void; onBrief: () => void }) {
  const script = campaign.scripts.find((s) => s.angleId === angle.id) ?? null;
  const [framework, setFramework] = useState<Framework>(script?.framework ?? guessFramework(angle));
  const [targetSeconds, setTargetSeconds] = useState<number | null>(script?.controls.targetSeconds ?? 15);
  const [tone, setTone] = useState<Tone>(script?.controls.tone ?? 'best-friend');
  const [intro, setIntro] = useState<Intro>(script?.controls.intro ?? 'show');
  const [cta, setCta] = useState(script?.controls.cta ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');
  const [viewing, setViewing] = useState<number | null>(null);
  const pool = campaign.research?.pool ?? [];
  const proofHooks = angle.proofAdIds.map((id) => pool.find((a) => a.id === id)?.hook).filter(Boolean) as string[];
  const ctaBank = useMemo(() => [...new Set(pool.map((a) => a.ctaType).filter(Boolean))].slice(0, 5) as string[], [pool]);

  const version = script ? (script.versions.find((v) => v.n === (viewing ?? script.versions.at(-1)?.n)) ?? script.versions.at(-1) ?? null) : null;
  const [beats, setBeats] = useState(version?.beats ?? []);
  const [editCta, setEditCta] = useState(version?.cta ?? '');
  const dirty = version ? JSON.stringify(beats) !== JSON.stringify(version.beats) || editCta !== version.cta : false;

  const write = async () => {
    if (readOnly) return;
    setBusy('writing');
    setError(null);
    try {
      const controls: Partial<ScriptControls> = { targetSeconds, tone, intro, cta };
      const res = await api.script(campaign.id, angle.id, framework, controls);
      onCampaign(res.campaign);
      const v = res.campaign.scripts.find((x) => x.id === res.scriptId)?.versions.at(-1);
      setViewing(v?.n ?? null); setBeats(v?.beats ?? []); setEditCta(v?.cta ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Writing failed.'));
    } finally {
      setBusy(null);
    }
  };

  const patch = async (body: Record<string, unknown>, label: string) => {
    if (!script || readOnly) return;
    setBusy(label);
    setError(null);
    try {
      const res = await api.patchScript(script.id, { campaignId: campaign.id, ...body });
      onCampaign(res.campaign);
      const v = res.campaign.scripts.find((x) => x.id === script.id)?.versions.at(-1);
      if (label !== 'approve') { setViewing(v?.n ?? null); setBeats(v?.beats ?? []); setEditCta(v?.cta ?? ''); }
    } catch (err) {
      setError(err instanceof Error ? err.message : `${label} failed.`);
    } finally {
      setBusy(null);
    }
  };

  const budget = targetSeconds ? wordsForSeconds(targetSeconds) : null;
  const approved = script?.approvedVersion ?? null;

  return (
    <div className="mt-4 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="ae-card-2 p-5">
        <div className="text-[17px] font-light leading-tight">{angle.title}</div>
        <div className="ae-cap mt-1 leading-snug">{angle.thesis}</div>
        {proofHooks.length > 0 && (
          <div className="mt-4">
            <div className="ae-cap">{t('Proof hooks, for energy not words')}</div>
            {proofHooks.slice(0, 3).map((h, i) => (<div key={i} className="mt-1 text-[12.5px]">“{h}”</div>))}
          </div>
        )}
        <div className="mt-5">
          <div className="ae-cap mb-2">{t('Framework')}</div>
          <div className="flex flex-wrap gap-1.5">{FRAMEWORKS.map((f) => (<Chip key={f} active={framework === f} onClick={() => setFramework(f)} title={FRAMEWORK_BANK[f].beats.map((b) => b.name).join(', ')}>{FRAMEWORK_BANK[f].label.split(' (')[0]}</Chip>))}</div>
        </div>
        <div className="mt-5">
          <div className="ae-cap mb-2">{t('Length')}</div>
          <div className="flex flex-wrap gap-1.5">{DURATIONS.map((d) => (<Chip key={String(d)} active={targetSeconds === d} onClick={() => setTargetSeconds(d)}>{d === null ? t('No limit') : t('{s}s, {n} words', { s: d, n: wordsForSeconds(d) })}</Chip>))}</div>
        </div>
        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          <Field label={t('Tone')}><OptionSelect value={tone} options={TONE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} onChange={setTone} label={t('Tone')} /></Field>
          <Field label={t('Product intro')}><OptionSelect value={intro} options={INTRO_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} onChange={setIntro} label={t('Product intro')} /></Field>
        </div>
        <div className="mt-4">
          <Field label={t('Call to action')}><Input value={cta} onChange={(e) => setCta(e.target.value)} maxLength={140} placeholder={t('Link in bio to try it free')} /></Field>
          {ctaBank.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{ctaBank.map((c) => (<Chip key={c} onClick={() => setCta(c.toLowerCase().replaceAll('_', ' '))}>{c.toLowerCase().replaceAll('_', ' ')}</Chip>))}</div>}
        </div>
        <div className="ae-faint mt-4">{t('Spoken words only. No stage directions, so the script can go straight to an actor.')}</div>
        <Btn tone="ink" onClick={write} disabled={busy !== null || readOnly} title={readOnly ? t('Sample data: actions are off') : undefined} className="mt-4 w-full">{busy === 'writing' ? t('Writing') : script ? t('Write a new version') : t('Write the script')}</Btn>
        {error && <ErrorLine text={error} />}
      </div>

      <div>
        {!version ? (
          <Empty line1={t('No script yet.')} line2={`${t('Choose a framework and write.')} ${budget ? t('{n} spoken words fit {s} seconds.', { n: budget, s: targetSeconds ?? '' }) : ''}`} />
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              {script!.versions.map((v) => (<Chip key={v.n} active={version.n === v.n} onClick={() => { setViewing(v.n); setBeats(v.beats); setEditCta(v.cta); }}>{t('Version {n}', { n: v.n })}{approved === v.n ? t(' · approved') : ''}</Chip>))}
              <span className="ae-cap ml-auto">{t('{n} words', { n: version.wordCount })}{version.targetSeconds ? t(' of {n} for {s}s', { n: wordsForSeconds(version.targetSeconds), s: version.targetSeconds }) : ''} · <span className={version.fits ? 'text-[var(--p-green)]' : 'text-[var(--p-orange)]'}>{version.fits ? t('fits') : t('over')}</span></span>
            </div>
            <div className="mt-3 space-y-3">
              {beats.map((b, i) => (
                <div key={i} className="ae-card-2 p-4">
                  <div className="flex items-center justify-between">
                    <span className="ae-cap">{b.name}{i === 0 ? ', the hook' : ''}</span>
                    <span className="flex items-center gap-2">
                      <Input type="number" min={0} max={60} value={b.seconds} onChange={(e) => setBeats(beats.map((x, j) => (j === i ? { ...x, seconds: Number(e.target.value) } : x)))} aria-label={t('{name} seconds', { name: b.name })} size="compact" className="w-[58px] text-center tabular-nums" cClassName="!py-1" />
                      <span className="ae-faint">s</span>
                      <Btn size="sm" disabled={busy !== null || readOnly} onClick={() => patch({ action: 'regenerate', beatIndex: i, instruction: instruction || undefined }, 'beat')} title={readOnly ? t('Sample data: actions are off') : busy !== null ? t('Wait for the rewrite in progress') : t('Rewrite only this beat')}><RefreshCw className="h-3 w-3" strokeWidth={1.8} /> {t('Rewrite')}</Btn>
                    </span>
                  </div>
                  <Textarea bare value={b.spoken} onChange={(e) => setBeats(beats.map((x, j) => (j === i ? { ...x, spoken: e.target.value } : x)))} rows={2} aria-label={t('{name}, spoken', { name: b.name })} className="mt-2 w-full resize-none bg-transparent text-[16px] font-light leading-snug outline-none" />
                  <Input bare value={b.action} onChange={(e) => setBeats(beats.map((x, j) => (j === i ? { ...x, action: e.target.value } : x)))} placeholder={t('What is on screen')} aria-label={t('{name}, on screen', { name: b.name })} className="ae-cap mt-1 w-full bg-transparent outline-none placeholder:text-[var(--p-dim)]" />
                </div>
              ))}
              <div className="ae-card-2 flex items-center gap-3 p-3 pl-4"><span className="ae-cap shrink-0">{t('Call to action')}</span><Input value={editCta} onChange={(e) => setEditCta(e.target.value)} aria-label={t('Call to action')} /></div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Input value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder={t('Instruction for a rewrite, optional')} maxLength={400} aria-label={t('Instruction for a rewrite')} />
              <Btn disabled={busy !== null || readOnly} onClick={() => patch({ action: 'regenerate', instruction: instruction || undefined }, 'rewrite')} title={readOnly ? t('Sample data: actions are off') : busy !== null ? t('Wait for the rewrite in progress') : t('Rewrite every beat')}><RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} /> {t('Rewrite all')}</Btn>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {dirty && <Btn disabled={busy !== null || readOnly} onClick={() => patch({ action: 'edit', beats, cta: editCta }, 'edit')} title={readOnly ? t('Sample data: actions are off') : busy !== null ? t('Wait for the step in progress') : t('Keep your edits as a new version')}>{t('Save as version {n}', { n: script!.versions.length + 1 })}</Btn>}
              <Btn tone={approved === version.n ? 'default' : 'ink'} disabled={busy !== null || dirty || readOnly} onClick={() => patch({ action: 'approve', version: version.n }, 'approve')} title={readOnly ? t('Sample data: actions are off') : dirty ? t('Save your edits as a version first') : busy !== null ? t('Wait for the step in progress') : approved === version.n ? t('This version is the approved one') : t('Approve this version for briefs and videos')}><Check className="h-3.5 w-3.5" strokeWidth={2.2} /> {approved === version.n ? t('Version {n} approved', { n: version.n }) : t('Approve version {n}', { n: version.n })}</Btn>
              <span className="ml-auto flex gap-1.5">
                <Btn disabled={approved === null} onClick={async () => { if (!readOnly) await api.brief(campaign.id, script!.id).then((r) => onCampaign(r.campaign)).catch((e) => setError(e.message)); onBrief(); }} title={approved === null ? t('Approve a version first') : readOnly ? t('Sample data: opens the sample brief') : t('Write the brief for the approved version')}>{t('Make a brief')}</Btn>
                <Btn disabled={approved === null} onClick={onUgc} title={approved === null ? t('Approve a version first') : t('Open the UGC studio')}>{t('UGC video')}</Btn>
                <Btn disabled={approved === null} onClick={onMotion} title={approved === null ? t('Approve a version first') : t('Open the Motion console')}>{t('Motion video')}</Btn>
              </span>
            </div>
            {approved === null && <div className="ae-faint mt-2 text-right">{t('Approve a version to unlock the next steps.')}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function guessFramework(angle: Angle): Framework {
  const h = `${angle.hookPattern} ${angle.thesis}`.toLowerCase();
  if (/before|after/.test(h)) return 'before-after';
  if (/feature|walkthrough|how to/.test(h)) return 'feature-walkthrough';
  if (/testimon|tried|convert/.test(h)) return 'testimonial-arc';
  if (/problem|struggl|pain|stop/.test(h)) return 'problem-agitate-solve';
  return 'hook-show-demo-result-verdict';
}
