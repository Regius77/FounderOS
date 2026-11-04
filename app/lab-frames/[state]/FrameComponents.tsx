'use client';
/**
 * The components specimen board (02 section 16.1, state `components`): every shared component in every
 * state from sections 4 to 13, labelled, on the Aurora. Fictional sample values only.
 */
import type { ReactNode } from 'react';
import {
  ActionPill, ArrowButton, Aurora, CostFitBar, DotMatrix, Glass, GlassBudgetProvider, HeroMetric, NarrativeCard, PeriodScrubber,
  PlusButton, ProgressRow, RoundButton, SearchPill, Segmented, StageList, Tile, type HeroMetricProps, type TileProps,
} from '@/components/lab/v2/shared';
import { frameToday } from '@/lib/lab/view/frames';
import { t } from '@/lib/i18n';

function Spec({ name, children, wide }: { name: string; children: ReactNode; wide?: boolean }) {
  return (
    <figure className="lab2-spec" data-wide={wide ? '' : undefined}>
      <figcaption className="lab2-spec-name" data-lab-ink="">{name}</figcaption>
      <div className="lab2-spec-body">{children}</div>
    </figure>
  );
}

function Board({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="lab2-board">
      <h2 className="lab2-row-title" data-lab-ink="">{title}</h2>
      <div className="lab2-board-grid">{children}</div>
    </section>
  );
}

export function FrameComponents() {
  const d = frameToday('default');
  const h = d.heroes[0];
  const hero = (over: Partial<HeroMetricProps>): HeroMetricProps => ({ ...h, ...over });
  const tile = (over: Partial<TileProps>): TileProps => ({ ...d.yourPosts[0], ...over });
  return (
    <div className="lab lab-v2" data-lab-root="" data-lab-frame="components">
      <Aurora />
      <GlassBudgetProvider>
        <div className="lab2-page">
          <header className="lab2-head">
            <span className="lab2-back" data-lab-ink="">Content Lab</span>
            <h1 className="lab2-tab" aria-current="page" data-lab-ink="" style={{ borderBottom: 0 }}>Components</h1>
            <span className="lab2-head-tools"><span className="lab2-chip" data-lab-ink="">{t('Sample data')}</span></span>
          </header>

          <Board title={t('Hero metric')}>
            <Spec name={t('ready')}><HeroMetric {...hero({})} /></Spec>
            <Spec name={t('ready, count')}><HeroMetric {...d.heroes[1]} /></Spec>
            <Spec name={t('thin (n 3)')}><HeroMetric {...hero({ n: 3, nText: 'n 3' })} /></Spec>
            <Spec name={t('empty')}><HeroMetric {...hero({ state: 'empty', n: 0, nText: 'n 0' })} /></Spec>
            <Spec name={t('not configured')}><HeroMetric {...hero({ state: 'not-configured' })} /></Spec>
            <Spec name={t('loading')}><HeroMetric {...hero({ state: 'loading' })} /></Spec>
          </Board>

          <Board title={t('Dot matrix')}>
            <Spec name={t('prev and current')}>
              <DotMatrix groups={h.groups} label={t('last 30d against this 30d')} />
            </Spec>
            <Spec name={t('with context group')}>
              <DotMatrix
                groups={[{ id: 'ctx', label: t('before'), values: [0.7, 0.9, 1.1, 0.8, 1.0, 0.9, 1.2, 0.8, 1.0, 0.9], emphasis: 'context' }, ...h.groups]}
                label={t('context, last and this period')}
              />
            </Spec>
          </Board>

          <Board title={t('Narrative cards')}>
            <Spec name={t('brief, ready')}><NarrativeCard {...d.brief} /></Spec>
            <Spec name={t('brief, thin')}><NarrativeCard kind="brief" label={t('Brief')} sentence={null} state="thin" /></Spec>
            <Spec name={t('brief, loading')}><NarrativeCard kind="brief" label={t('Brief')} sentence={null} state="loading" /></Spec>
            <Spec name={t('window, open (t 0.15)')}><NarrativeCard {...frameToday('window-open').window} /></Spec>
            <Spec name={t('window, closing (t 0.7)')}><NarrativeCard {...frameToday('window-closing').window} /></Spec>
            <Spec name={t('window, none')}><NarrativeCard {...frameToday('window-none').window} /></Spec>
            <Spec name={t('window, not configured')}><NarrativeCard {...frameToday('not-configured').window} /></Spec>
          </Board>

          <Board title={t('Tiles')}>
            <Spec name={t('ready, band')}><Tile {...tile({ id: 'spec-band' })} /></Spec>
            <Spec name={t('ready, wave')}><Tile {...d.launchRadar[1]} id="spec-wave" /></Spec>
            <Spec name={t('ready, ticks, delta')}>
              <Tile {...tile({ id: 'spec-ticks', title: t('Scraped'), valueText: '441', format: 'count', n: 441, nText: 'n 441', foot: t('Last 7 days'), delta: { text: '+12', dir: 'up' }, viz: { kind: 'ticks', values: [40, 52, 61, 48, 70, 88, 82, 64, 59, 71, 90, 66, 58, 74], highlight: [10] } })} />
            </Spec>
            <Spec name={t('ready, cap')}>
              <Tile {...tile({ id: 'spec-cap', title: t('Spend'), valueText: '$8.20', format: 'money', n: 9, nText: 'n 9', foot: t('of $30 cap'), viz: { kind: 'cap', spent: 8.2, cap: 30, currency: '$' } })} />
            </Spec>
            <Spec name={t('thin (n 4)')}><Tile {...tile({ id: 'spec-thin', n: 4, nText: 'n 4' })} /></Spec>
            <Spec name={t('too new')}><Tile {...d.yourPosts[3]} id="spec-new" /></Spec>
            <Spec name={t('loading')}><Tile {...tile({ id: 'spec-load', state: 'loading' })} /></Spec>
          </Board>

          <Board title={t('Controls')}>
            <Spec name={t('segmented')}><Segmented label={t('Today view')} options={[{ id: 'brief', label: t('Brief') }, { id: 'ask', label: t('Ask the Lab') }]} /></Spec>
            <Spec name={t('segmented, count')}><Segmented label={t('Activity')} options={[{ id: 'a', label: t('Activities'), countText: '36' }, { id: 'b', label: t('Assistance') }]} /></Spec>
            <Spec name={t('period scrubber')}><PeriodScrubber periods={d.periods} label={t('Period')} /></Spec>
            <Spec name={t('search pill')}><SearchPill placeholder={t('Ask the Lab')} /></Spec>
            <Spec name={t('action pill')}><ActionPill label={t('Add source')} href="?setup=sources&focus=add" /></Spec>
            <Spec name={t('action pill, play')}><ActionPill label={t('Run now')} icon="play" onClick={() => {}} /></Spec>
            <Spec name={t('action pill, busy 40%')}><ActionPill label={t('Running, 2 of 5')} busy progress={0.4} /></Spec>
            <Spec name={t('action pill, busy')}><ActionPill label={t('Running, 2m')} busy progress={null} /></Spec>
            <Spec name={t('action pill, disabled')}><ActionPill label={t('New idea')} disabled disabledReason={t('Sample data is a read-only preview.')} /></Spec>
            <Spec name={t('plus, round, arrows')}>
              <span style={{ display: 'inline-flex', gap: 12, alignItems: 'center' }}>
                <PlusButton label={t('Create')} items={d.createMenu} />
                <RoundButton label={t('Setup')} icon="menu" href="?setup=keys" />
                <ArrowButton label={t('Open')} href="#" size={36} />
                <ArrowButton label={t('Open')} href="#" size={32} />
              </span>
            </Spec>
          </Board>

          <Board title={t('Glass')}>
            {(['base', 'strong', 'tint', 'solid'] as const).map((tone) => (
              <Spec key={tone} name={t('tone {tone}', { tone })}>
                <Glass tone={tone} radius="tile" priority={2} className="lab2-card" style={{ width: 200, height: 96 }}>
                  <span className="lab2-card-text" data-lab-ink="">{t('Glass {tone}', { tone })}</span>
                </Glass>
              </Spec>
            ))}
          </Board>

          <Board title={t('Run progress and cost')}>
            <Spec name={t('progress row, determinate')} wide>
              <Glass tone="strong" radius="tile" priority={2} className="lab2-card">
                <ProgressRow row={{ label: t('Instagram posts'), targetsText: t('{n} creators', { n: 8 }), stateText: t('Running'), fill: 0.46, countsText: t('{done} of {total}', { done: 214, total: 460 }), costText: t('$0.41 of about $0.92'), elapsedText: '1m 40s' }} />
              </Glass>
            </Spec>
            <Spec name={t('progress row, indeterminate')} wide>
              <Glass tone="strong" radius="tile" priority={2} className="lab2-card">
                <ProgressRow row={{ label: t('X search'), targetsText: t('{n} queries', { n: 2 }), stateText: t('Running'), fill: null, countsText: t('{n} so far', { n: 61 }), elapsedText: '40s', statusMessage: t('Scraping tweets') }} />
              </Glass>
            </Spec>
            <Spec name={t('progress row, failed')} wide>
              <Glass tone="strong" radius="tile" priority={2} className="lab2-card">
                <ProgressRow row={{ label: t('TikTok posts'), targetsText: t('{n} creators', { n: 5 }), stateText: t('Failed'), fill: 0.2, frozen: true, countsText: t('{done} of {total}', { done: 40, total: 200 }), failed: true, runLogHref: '?setup=spend' }} />
              </Glass>
            </Spec>
            <Spec name={t('stage list')} wide>
              <Glass tone="strong" radius="tile" priority={2} className="lab2-card">
                <StageList
                  stages={[
                    { id: 'ingest', label: t('Ingest'), state: 'done', stateText: t('done'), countText: t('{done} of {total}', { done: 214, total: 214 }) },
                    { id: 'transcribe', label: t('Transcribe'), state: 'running', stateText: t('running'), countText: t('{done} of {total}', { done: 3, total: 9 }) },
                    { id: 'dissect', label: t('Dissect'), state: 'waiting', stateText: t('waiting') },
                    { id: 'measure', label: t('Measure'), state: 'failed', stateText: t('failed'), note: t('Waiting for the running tick to finish') },
                  ]}
                />
              </Glass>
            </Spec>
            <Spec name={t('cost fit bar, fits / tight / over')} wide>
              <Glass tone="strong" radius="tile" priority={2} className="lab2-card">
                <CostFitBar spent={8.2} estimate={{ low: 0.8, point: 1.0, high: 1.3 }} cap={30} fit="fits" />
                <CostFitBar spent={22} estimate={{ low: 1.5, point: 2.4, high: 3.2 }} cap={30} fit="tight" />
                <CostFitBar spent={28} estimate={{ low: 2, point: 3, high: 4 }} cap={30} fit="over" />
              </Glass>
            </Spec>
          </Board>
        </div>
      </GlassBudgetProvider>
    </div>
  );
}
