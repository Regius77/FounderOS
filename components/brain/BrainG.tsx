'use client';

import { useState, type ReactNode } from 'react';
import { Zap } from 'lucide-react';
import { GButton, GCard, GDriverBars, GEmpty, GErrorLine, GHeroCard, GList, GProgress, GRadar, GRow, GRuler, GSearch, GSectionHeader, GSheet, GTag, GVizStage, type GTagTone } from '@/components/g';
import type { VizColor } from '@/components/g/viz-shared';
import { GBrainRadialLazy } from '@/components/GBrainRadialLazy';
import { BrainDock } from '@/components/BrainDock';
import { useBrainQuery } from '@/components/BrainQuery';
import type { ObservatoryData } from '@/lib/gbrain-observatory';
import type { PillarAxis } from '@/lib/pillar-radar';
import type { StorageLayer } from '@/lib/brain-layers';
import { localeTag, t } from '@/lib/i18n';

/**
 * /brain under the GladOS style (SPEC S05 F05.10 to F05.17). The radial keeps
 * every interaction inside a GVizStage; the Doctor is the page's one hero and
 * opens the checks and hybrid search; Pillar health is a GRadar; storage is a
 * list with honest values (H33); the folder bars are the one Pipeline stage
 * with real data. Explanations live in About.
 */

type DoctorCheck = { name: string; status: string; message: string };
export type DoctorLite = { connected: boolean; healthScore: number | null; detail: string; checks: DoctorCheck[] };

const CHECK_TONE: Record<string, GTagTone> = { ok: 'ok', warn: 'warn', error: 'err' };

export function RadialStage({ data }: { data: ObservatoryData }) {
  const [fs, setFs] = useState(false);
  return (
    <GVizStage
      label={t('Optimal Engine radial')}
      height="max(560px, calc(100vh - 180px))"
      fullscreen={fs}
      onFullscreenChange={setFs}
      className="kg-radial"
      hudTopLeft={
        <>
          <span className="kg-hud-title">Optimal Engine · radial</span>
          <span className="kg-cap">{data.statusLine}</span>
        </>
      }
      hudTopRight={data.mounted ? <span className="kg-cap" title={t('Embedded chunks across the brain-store')}>{t('{n} chunks', { n: data.totalChunks.toLocaleString(localeTag()) })}</span> : undefined}
      bottomCenter={data.mounted ? <BrainDock g /> : undefined}
    >
      {data.mounted ? (
        <GBrainRadialLazy data={data} g fullscreen={fs} />
      ) : (
        <div className="kg-stage-empty">
          <GEmpty kind="unconfigured" title="No brain-store mounted" body={t("The radial draws the brain-store's folders and pages once it is mounted.")} setupHref="/setup" setupHint={t('expected at ~/knowledge/brain-store (or GBRAIN_STORE)')} />
        </div>
      )}
    </GVizStage>
  );
}

function HybridSearch({ fallbackActive }: { fallbackActive: boolean }) {
  const { q, setQ, state, run } = useBrainQuery();
  return (
    <div className="kg-stack-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
        className="kg-query"
      >
        <GSearch value={q} onValueChange={setQ} size="md" placeholder={t('Query the second brain')} aria-label={t('Query the second brain')} />
        <GButton type="submit" variant="ink" busy={state.phase === 'busy'} disabled={!q.trim()} disabledReason={t('Type a question first')}>
          {t('Search')}
        </GButton>
      </form>
      {state.phase === 'busy' && <GProgress text={t('Querying: hybrid (local + ZeroEntropy)…')} />}
      {state.phase === 'error' && <GErrorLine align="left">{t('Query failed: {message}', { message: state.message })}</GErrorLine>}
      {state.phase === 'done' && (
        <>
          <p className="kg-cap">
            {t('{n} hits for “{query}”', { n: state.hits.length, query: state.query })}{fallbackActive ? t(' · local fallback (Supabase paused)') : ''}
          </p>
          {state.hits.length === 0 ? (
            <GEmpty inline title={t('Nothing matched')} body={t('Try a broader phrase.')} />
          ) : (
            <GList divided label={t('Results')}>
              {state.hits.map((h) => (
                <GRow key={h.title} title={h.title} meta={h.snippet} trailing={<span className="kg-cap">{h.source}</span>} />
              ))}
            </GList>
          )}
        </>
      )}
    </div>
  );
}

/** Doctor hero (F05.14): health, warnings and last run; opens checks and hybrid search. */
export function DoctorHero({ doctor, lastRun, fallbackActive }: { doctor: DoctorLite; lastRun: string | null; fallbackActive: boolean }) {
  const [open, setOpen] = useState(false);
  const warnings = doctor.checks.filter((c) => c.status !== 'ok');
  const status = doctor.connected
    ? `${warnings.length === 1 ? t('{n} warning', { n: warnings.length }) : t('{n} warnings', { n: warnings.length })} · ${lastRun ? t('last run {when}', { when: lastRun }) : t('no agent runs yet')}`
    : t('CLI unreachable');
  return (
    <>
      <GHeroCard
        variant="a"
        caption={t('Doctor')}
        value={doctor.connected ? doctor.healthScore : null}
        label={doctor.connected && doctor.healthScore != null ? t('Health {n} of 100', { n: doctor.healthScore }) : t('Health unknown')}
        title={t('Engine health score, 0 to 100. Opens the checks and hybrid search.')}
        status={status}
        strip={<GRuler value={doctor.connected ? doctor.healthScore : null} max={100} onHero label={t('Health {n} of 100', { n: doctor.healthScore ?? t('unknown') })} />}
        onClick={() => setOpen(true)}
        className="kg-doctor"
      />
      <GSheet open={open} onClose={() => setOpen(false)} title={t('Doctor · search')} caption={doctor.connected ? t('{n} of {total} checks need attention', { n: warnings.length, total: doctor.checks.length }) : t('Doctor offline')} width={720}>
        <div className="kg-stack">
          {!doctor.connected ? (
            <GEmpty kind="unconfigured" title="The engine CLI is unreachable" body={doctor.detail} setupHref="/setup" setupHint={doctor.detail} />
          ) : (
            <GList divided label={t('Doctor checks')}>
              {doctor.checks.map((c) => (
                <GRow
                  key={c.name}
                  title={<span className="kg-mono-inline" data-mono-ok="">{c.name}</span>}
                  meta={c.message}
                  trailing={<GTag tone={CHECK_TONE[c.status] ?? 'err'} dot size="xs">{c.status === 'ok' ? 'OK' : c.status === 'warn' ? t('Warning') : t('Error')}</GTag>}
                />
              ))}
            </GList>
          )}
          <section className="kg-stack-sm" aria-label={t('Hybrid search')}>
            <GSectionHeader size={22} title={t('Hybrid search')} caption={t('Keyword and vector search over the brain, with a local fallback.')} />
            <HybridSearch fallbackActive={fallbackActive} />
            {fallbackActive && (
              <div className="kg-fallback">
                <Zap size={14} strokeWidth={1.7} aria-hidden="true" />
                <span className="kg-body">{t('Supabase free tier is paused: hybrid queries fall back to local grep until revived.')}</span>
                <GButton variant="sm" href="/roadmap">
                  {t('Roadmap')}
                </GButton>
              </div>
            )}
          </section>
        </div>
      </GSheet>
    </>
  );
}

const LAYERS: { id: keyof Pick<PillarAxis, 'score' | 'roster' | 'freshness' | 'sop'>; label: string; color: VizColor }[] = [
  { id: 'score', label: t('Overall'), color: 'accent' },
  { id: 'roster', label: t('Roster'), color: 'series-2' },
  { id: 'freshness', label: t('Run freshness'), color: 'series-3' },
  { id: 'sop', label: t('SOP coverage'), color: 'series-4' },
];

/** Pillar health (F05.15): the radar with its layers; the duplicated health footer is cut. */
export function PillarHealth({ axes }: { axes: PillarAxis[] }) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <GCard as="section" p={24} className="kg-pillar" aria-labelledby="pillar-head">
      <GSectionHeader size={22} id="pillar-head" title={t('Pillar health')} caption={t('Live roster, run freshness and SOP coverage per department')} />
      {axes.length === 0 ? (
        <GEmpty inline title={t('No departments yet')} />
      ) : (
        <GRadar
          label={t('Pillar health radar')}
          axes={axes.map((a) => ({ id: a.id, label: a.label }))}
          layers={LAYERS.map((l) => ({ id: l.id, label: l.label, color: l.color, values: axes.map((a) => a[l.id]) }))}
          activeLayer={active}
          onLayer={setActive}
          size={320}
        />
      )}
    </GCard>
  );
}

const LAYER_TONE: Record<string, GTagTone> = { connected: 'ok', available: 'warn', error: 'err', off: 'neutral' };

export function StorageLayers({ layers }: { layers: StorageLayer[] }) {
  return (
    <GCard as="section" p={20} aria-labelledby="storage-head" className="kg-card-stack">
      <GSectionHeader size={22} id="storage-head" title={t('Storage layers')} caption={t('Where the knowledge lives, from disk to database')} />
      <GList divided label={t('Storage layers')}>
        {layers.map((l) => (
          <GRow
            key={l.name}
            leading={<span className="kg-dot" data-state={l.state} aria-hidden="true" />}
            title={l.name}
            meta={<span className="kg-trunc">{l.sub}</span>}
            trailing={<GTag tone={LAYER_TONE[l.state] ?? 'neutral'} size="xs">{t(l.val)}</GTag>}
            hint={`${l.name}: ${t(l.val)}`}
          />
        ))}
      </GList>
    </GCard>
  );
}

export function FolderBars({ folders, total }: { folders: { name: string; files: number }[]; total: number }) {
  const rows = [...folders].sort((a, b) => b.files - a.files).map((f) => ({ id: f.name, label: f.name, value: f.files, title: t('{n} pages in {folder}/', { n: f.files, folder: f.name }) }));
  return (
    <GCard as="section" p={20} aria-labelledby="folders-head" className="kg-card-stack">
      <GSectionHeader size={22} id="folders-head" title={t('Brain-store by folder')} caption={t('{n} pages on disk, plain markdown', { n: total })} />
      <GDriverBars rows={rows} labelWidth={120} label={t('Pages per folder')} />
    </GCard>
  );
}

export function BrainSection({ id, title, caption, children }: { id: string; title: string; caption?: ReactNode; children: ReactNode }) {
  return (
    <section className="kg-section" aria-labelledby={id}>
      <GSectionHeader size={22} id={id} title={title} caption={caption} />
      {children}
    </section>
  );
}
