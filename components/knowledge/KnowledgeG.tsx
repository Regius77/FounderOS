'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  GButton, GCard, GDrawer, GEmpty, GHeatmap, GLegend, GList, GRow, GSearch, GSectionHeader, GSegmented, GSheet, GStackedBar, GStat, GTable, GTabs, GTag, GVizStage,
  type GColumn, type GLegendItem, type GTagTone,
} from '@/components/g';
import type { VizColor } from '@/components/g/viz-shared';
import type { EdgeKind, KIEntity, KnowledgeIndex } from '@/lib/knowledge-index';
import type { Finding } from '@/lib/knowledge-metrics';
import { CATEGORY_LABEL, EDGE_LABEL, KIND_CATEGORY, KIND_LABEL, rankRows, type ColorDimension, type RankRow } from '@/lib/knowledge-views';
import { RANK_PAGE, TIMELINE_SERIES, filterRank, openClusters, timelineMonths, timelineSentence, topClusters } from '@/lib/knowledge-g';
import { t } from '@/lib/i18n';
import { KnowledgeCanvas } from './KnowledgeCanvas';
import { FocusG } from './FocusG';
import { useKnowledgeState, type KnowledgeAnalysis } from './KnowledgeVisualizer';

/**
 * The Knowledge Visualizer under the GladOS style (SPEC S05 F05.30 to F05.37):
 * one long page kept, with anchor tabs that track the section in view. The
 * network sits in a GVizStage (never captures the wheel inline; Full screen
 * hands it over), its rail is a legend HUD, and the record panel docks as a
 * non-modal drawer. Matrix is a heatmap with the most open clusters beside it,
 * the timeline states one sentence when it would be one bar, the ranking pages
 * by 25, and findings expand in place.
 */

const SECTIONS = [
  { value: 'network', label: t('Network') },
  { value: 'matrix', label: t('Matrix') },
  { value: 'timeline', label: t('Timeline') },
  { value: 'ranking', label: t('Ranking') },
  { value: 'findings', label: t('Findings') },
];

const DIMS: { value: ColorDimension; label: string; title: string }[] = [
  { value: 'kind', label: t('Kind'), title: t('What sort of record it is') },
  { value: 'recency', label: t('Recency'), title: t('How long since it was edited') },
  { value: 'authority', label: t('Authority'), title: t('How much the graph leans on it') },
  { value: 'health', label: t('Health'), title: t('What is structurally wrong with it') },
];

/** Legend key → token slot under the GladOS style. Sequential bands run from the accent (most) to dim (least). */
const G_COLOR: Record<ColorDimension, Record<string, VizColor>> = {
  kind: { page: 'cat-1', skill: 'cat-2', agent: 'cat-3', client: 'cat-4', system: 'cat-5' },
  recency: { week: 'accent', month: 'accent-2', quarter: 'ink', year: 'muted', older: 'dim', none: 'track' },
  authority: { a1: 'accent', a2: 'accent-2', a3: 'muted', a4: 'dim' },
  health: { orphan: 'err', 'stale-hub': 'warn', bridge: 'cat-3', ok: 'ok' },
};
const EDGE_G: Record<EdgeKind, VizColor> = { link: 'cat-2', owns: 'cat-3', mention: 'cat-1', similar: 'dim' };
const KIND_G = G_COLOR.kind;
const catOf = (kind: string): VizColor => KIND_G[KIND_CATEGORY[kind] ?? 'system'] ?? 'cat-5';
const v = (c: VizColor) => `var(--g-${c})`;

const SEV_TONE: Record<Finding['severity'], GTagTone> = { high: 'err', medium: 'warn', low: 'neutral' };
const MATRIX_INLINE_LIMIT = 12;
const TARGETS_INLINE = 12;

function scrollTo(id: string) {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

export function KnowledgeG({ index, analysis }: { index: KnowledgeIndex; analysis: KnowledgeAnalysis }) {
  const k = useKnowledgeState(index, analysis);
  const { dim, setDim, hidden, setHidden, activeKinds, setActiveKinds, query, setQuery, focusId, setFocusId, metrics, sortedPr, medianDegree, legend, bandOf, focus, toggle } = k;
  const [networkFs, setNetworkFs] = useState(false);
  const [matrixFs, setMatrixFs] = useState(false);
  const [openFinding, setOpenFinding] = useState<string | null>(null);
  const [allTargets, setAllTargets] = useState<Finding | null>(null);
  const [rankShown, setRankShown] = useState(RANK_PAGE);
  const [legendSheet, setLegendSheet] = useState(false);
  const s = analysis.summary;

  const gColorOf = (e: KIEntity, m: Parameters<typeof bandOf>[1]) => v(G_COLOR[dim][bandOf(e, m)] ?? 'dim');

  const openRecord = (id: string) => {
    setFocusId(id);
    scrollTo('network');
  };
  const onSearch = (q: string) => {
    setQuery(q);
    setRankShown(RANK_PAGE); // a new search starts the ranking at 25 again (S05 §6)
  };

  if (!index.mounted && index.entities.length === 0) {
    return (
      <GCard p={24}>
        <GEmpty title={t('Nothing indexed yet')} body={t('The knowledge store is not mounted and the database has no records, so there is no graph to draw.')} />
      </GCard>
    );
  }

  const legendItems: GLegendItem[] = legend.map((l) => ({ id: l.key, label: t(l.label), count: l.count, color: G_COLOR[dim][l.key] ?? 'dim', on: !hidden.has(l.key) }));
  const edgeItems: GLegendItem[] = (['link', 'owns', 'mention', 'similar'] as EdgeKind[])
    .filter((e) => (index.byEdgeKind[e] ?? 0) > 0)
    .map((e) => ({ id: e, label: t(EDGE_LABEL[e]), count: index.byEdgeKind[e] ?? 0, color: EDGE_G[e], on: activeKinds.has(e) }));

  const rail = (
            <div className="kg-rail">
              <span className="kg-rail-label">{t('Colour by')}</span>
              <GSegmented
                size="compact"
                label={t('Colour by')}
                options={DIMS}
                value={dim}
                onChange={(d) => {
                  setDim(d);
                  setHidden(new Set());
                }}
              />
              <span className="kg-rail-label">{t('Groups')}</span>
              <GLegend
                layout="stack"
                label={t('Groups')}
                items={legendItems}
                onToggle={(id) => setHidden(toggle(hidden, id))}
                onIsolate={(id) => setHidden(new Set(legend.map((l) => l.key).filter((x) => x !== id)))}
              />
              {hidden.size > 0 && (
                <GButton variant="sm" size="compact" onClick={() => setHidden(new Set())}>
                  {t('Show all')}
                </GButton>
              )}
              <span className="kg-rail-label">{t('Connections')}</span>
              <GLegend layout="stack" label={t('Connection kinds')} items={edgeItems} onToggle={(id) => setActiveKinds(toggle(activeKinds, id as EdgeKind))} />
            </div>
  );

  return (
    <div className="kg-section kg-know">
      {/* stats (F05.31): avg connections cut; orphans opens its finding */}
      <div className="kg-know-stats">
        <GStat value={s.nodes} label={t('Records')} source={t('Pages, skills, agents, accounts, workflows, tools and departments')} />
        <GStat value={s.edges} label={t('Connections')} source={t('Every edge, including inferred similarity')} />
        <GStat value={`${s.largestComponentPct.toFixed(0)}%`} label={t('In one network')} source={t('{n} disconnected groups, counting written connections only', { n: s.components })} />
        <GStat
          value={s.orphans}
          label={t('Orphans')}
          source={t('Records nothing an author wrote points to. Opens the finding.')}
          onClick={() => {
            setOpenFinding('orphans');
            requestAnimationFrame(() => scrollTo('finding-orphans'));
          }}
        />
        <GStat value={s.medianDays === null ? null : `${s.medianDays}d`} label={t('Median age')} source={t('Median days since last edit, files only')} />
      </div>

      <div className="kg-know-nav">
        <GTabs tabs={SECTIONS} variant="anchor" label={t('Sections')} className="kg-know-tabs" />
        <div className="kg-know-search">
          <GSearch value={query} onValueChange={onSearch} size="md" placeholder={t('Search records, clusters, summaries…')} aria-label={t('Search records')} />
        </div>
        {focusId && (
          <GButton variant="sm" onClick={() => setFocusId(null)}>
            {t('Whole graph')}
          </GButton>
        )}
      </div>

      {/* Network */}
      <section id="network" className="kg-anchor" aria-label={t('Network')}>
        <GVizStage
          label={t('Knowledge network')}
          height="max(600px, 72vh)"
          fullscreen={networkFs}
          onFullscreenChange={setNetworkFs}
          hudTopRight={
            <>
              <span className="kg-cap">{t('{n} records', { n: s.nodes })}</span>
              <GButton variant="sm" className="kg-legend-btn" onClick={() => setLegendSheet(true)}>
                {t('Legend')}
              </GButton>
            </>
          }
          hudLeft={rail}
          className="kg-viz kg-net"
        >
          <KnowledgeCanvas
            entities={index.entities}
            edges={index.edges}
            metrics={metrics}
            colorOf={gColorOf}
            bandOf={bandOf}
            activeKinds={activeKinds}
            hidden={hidden}
            query={query}
            focusId={focusId}
            onFocus={setFocusId}
            dim={dim}
            fullscreen={networkFs}
          />
        </GVizStage>
        {focus && (
          <GDrawer open modal={false} onClose={() => setFocusId(null)} title={focus.label} width={360}>
            <FocusG entity={focus} metrics={metrics} edges={index.edges} entities={index.entities} sortedPr={sortedPr} medianDegree={medianDegree} onFocus={setFocusId} color={v(catOf(focus.kind))} catOf={(kind) => v(catOf(kind))} edgeColor={(e) => v(EDGE_G[e])} />
          </GDrawer>
        )}
      </section>

      <GSheet open={legendSheet} onClose={() => setLegendSheet(false)} title={t('Legend')} width={420}>
        {rail}
      </GSheet>

      {/* Matrix (F05.34) */}
      <MatrixG matrix={analysis.clusterMatrix} onPick={onSearch} onFull={() => setMatrixFs(true)} />
      <GSheet open={matrixFs} onClose={() => setMatrixFs(false)} title={t('Cluster connection matrix')} caption={t('All {n} clusters', { n: analysis.clusterMatrix.clusters.length })}>
        <ClusterHeat matrix={analysis.clusterMatrix} onPick={(c) => { onSearch(c); setMatrixFs(false); }} />
      </GSheet>

      {/* Timeline (F05.35) */}
      <TimelineG entities={index.entities} />

      {/* Ranking (F05.36) */}
      <RankingG index={index} metrics={metrics} query={query} shown={rankShown} setShown={setRankShown} onOpen={openRecord} onClear={() => onSearch('')} />

      {/* Findings (F05.37) */}
      <section id="findings" className="kg-anchor kg-section" aria-labelledby="findings-head">
        <GSectionHeader size={22} id="findings-head" title={t('Findings')} caption={t('The structural audit. Each finding names the measurement behind it.')} />
        <GCard p={16}>
          <GList divided label={t('Findings')}>
            {analysis.findings.map((f) => {
              const open = openFinding === f.id;
              const targets = [...new Set(f.targets)];
              return (
                <FindingRow
                  key={f.id}
                  f={f}
                  open={open}
                  targets={targets}
                  byId={k.byId}
                  onToggle={() => setOpenFinding(open ? null : f.id)}
                  onOpen={openRecord}
                  onAll={() => setAllTargets(f)}
                />
              );
            })}
          </GList>
        </GCard>
      </section>
      <GSheet open={Boolean(allTargets)} onClose={() => setAllTargets(null)} title={allTargets?.title ?? t('Records')} caption={allTargets ? t('{n} records', { n: allTargets.total }) : undefined} width={720}>
        {allTargets && (
          <GList label={t('Records')}>
            {[...new Set(allTargets.targets)].map((id) => {
              const e = k.byId.get(id);
              if (!e) return null;
              return (
                <GRow
                  key={id}
                  leading={<i className="kg-swatch" style={{ background: v(catOf(e.kind)) }} aria-hidden="true" />}
                  title={e.label}
                  meta={`${KIND_LABEL[e.kind] ? t(KIND_LABEL[e.kind]) : e.kind} · ${e.cluster}`}
                  onClick={() => {
                    setAllTargets(null);
                    openRecord(id);
                  }}
                />
              );
            })}
          </GList>
        )}
      </GSheet>
    </div>
  );
}

function FindingRow({ f, open, targets, byId, onToggle, onOpen, onAll }: {
  f: Finding;
  open: boolean;
  targets: string[];
  byId: Map<string, KIEntity>;
  onToggle: () => void;
  onOpen: (id: string) => void;
  onAll: () => void;
}) {
  return (
    <li className="kg-finding" id={`finding-${f.id}`} data-open={open || undefined}>
      <GButton variant="sm" className="kg-finding-head" aria-expanded={open} onClick={onToggle}>
        <span className="kg-finding-text">
          <span className="kg-finding-title">{f.title}</span>
          <span className="kg-cap">{f.detail}</span>
        </span>
        <GTag tone={SEV_TONE[f.severity]} size="xs">
          {f.severity === 'high' ? t('High') : f.severity === 'medium' ? t('Medium') : t('Low')}
        </GTag>
        <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" className="kg-chev" data-open={open || undefined} />
      </GButton>
      {open && targets.length > 0 && (
        <div className="kg-finding-body">
          <div className="kg-chips">
            {targets.slice(0, TARGETS_INLINE).map((id) => {
              const e = byId.get(id);
              if (!e) return null;
              return (
                <GButton key={id} variant="sm" size="compact" onClick={() => onOpen(id)} title={t('Open {label} in the network', { label: e.label })}>
                  <i className="kg-swatch" style={{ background: v(catOf(e.kind)) }} aria-hidden="true" />
                  {e.label.length > 34 ? `${e.label.slice(0, 33)}…` : e.label}
                </GButton>
              );
            })}
          </div>
          {f.total > TARGETS_INLINE && (
            <GButton variant="sm" onClick={onAll}>
              {t('Show all {n}', { n: f.total })}
            </GButton>
          )}
        </div>
      )}
    </li>
  );
}

function ClusterHeat({ matrix, onPick }: { matrix: KnowledgeAnalysis['clusterMatrix']; onPick: (c: string) => void }) {
  // The diagonal is left out on purpose: a cluster is always densest inside.
  return (
    <GHeatmap
      label={t('Connections between clusters')}
      rows={matrix.clusters}
      cols={matrix.clusters}
      values={matrix.counts.map((r, i) => r.map((x, j) => (i === j ? null : x)))}
      onCell={(r) => onPick(matrix.clusters[r])}
      cellTitle={(r, c, x) => t('{a} ↔ {b}: {n} connections. Click to search {a}.', { a: matrix.clusters[r], b: matrix.clusters[c], n: x ?? 0 })}
    />
  );
}

function MatrixG({ matrix, onPick, onFull }: { matrix: KnowledgeAnalysis['clusterMatrix']; onPick: (c: string) => void; onFull: () => void }) {
  const capped = matrix.clusters.length > MATRIX_INLINE_LIMIT;
  const shown = topClusters(matrix, MATRIX_INLINE_LIMIT);
  const open = openClusters(matrix);
  return (
    <section id="matrix" className="kg-anchor kg-section" aria-labelledby="matrix-head">
      <GSectionHeader
        size={22}
        id="matrix-head"
        title={t('Matrix')}
        caption={capped ? t('The {limit} most connected of {n} clusters. A bright cell is two clusters that reference each other.', { limit: MATRIX_INLINE_LIMIT, n: matrix.clusters.length }) : t('A bright cell is two clusters that reference each other.')}
        action={
          capped ? (
            <GButton variant="sm" onClick={onFull}>
              {t('All {n} clusters', { n: matrix.clusters.length })}
            </GButton>
          ) : undefined
        }
      />
      <div className="kg-matrix">
        <GCard p={20} className="kg-matrix-heat">
          <ClusterHeat matrix={shown} onPick={onPick} />
        </GCard>
        <GCard p={16} className="kg-matrix-open" aria-label={t('Least open clusters')}>
          <GSectionHeader size={22} title={t('Least open clusters')} caption={t("Share of each cluster's connections that leave it, lowest first")} />
          <GList label={t('Least open clusters')}>
            {open.map((c) => (
              <GRow key={c.cluster} title={c.cluster} meta={t('of {n} connections', { n: c.total })} trailing={`${c.pct.toFixed(0)}%`} onClick={() => onPick(c.cluster)} hint={t('Search {cluster}', { cluster: c.cluster })} />
            ))}
          </GList>
        </GCard>
      </div>
    </section>
  );
}

function TimelineG({ entities }: { entities: KIEntity[] }) {
  const { months, dated } = useMemo(() => timelineMonths(entities), [entities]);
  const sentence = timelineSentence(months, dated);
  return (
    <section id="timeline" className="kg-anchor kg-section" aria-labelledby="timeline-head">
      <GSectionHeader size={22} id="timeline-head" title={t('Timeline')} caption={t('When this knowledge was last touched, by month of last edit')} />
      <GCard p={20}>
        {sentence ? (
          <GList label={t('Timeline')}>
            <GRow title={sentence} meta={t('Records with no date on disk are not plotted.')} />
          </GList>
        ) : (
          <GStackedBar
            label={t('Records by month of last edit')}
            height={200}
            keys={TIMELINE_SERIES.map((id) => ({ id, label: t(CATEGORY_LABEL[id]), color: KIND_G[id] }))}
            columns={months.map((m) => ({ id: m.key, label: m.label, parts: m.counts }))}
          />
        )}
      </GCard>
    </section>
  );
}

function RankingG({ index, metrics, query, shown, setShown, onOpen, onClear }: {
  index: KnowledgeIndex;
  metrics: Map<string, import('@/lib/knowledge-metrics').NodeMetrics>;
  query: string;
  shown: number;
  setShown: (n: number) => void;
  onOpen: (id: string) => void;
  onClear: () => void;
}) {
  const rows = useMemo(() => rankRows(index.entities, metrics), [index.entities, metrics]);
  const filtered = useMemo(() => filterRank(rows, query).sort((a, b) => b.authority - a.authority), [rows, query]);
  const page = filtered.slice(0, shown);
  const columns: GColumn<RankRow>[] = [
    {
      key: 'label',
      label: t('Record'),
      sortValue: (r) => r.label.toLowerCase(),
      render: (r) => (
        <span className="kg-cell-name kg-cell-wide" title={r.label}>
          <i className="kg-swatch" style={{ background: v(catOf(r.kind)) }} aria-hidden="true" />
          <span className="kg-trunc">{r.label}</span>
        </span>
      ),
    },
    { key: 'kind', label: t('Kind'), sortValue: (r) => r.kind, render: (r) => (KIND_LABEL[r.kind] ? t(KIND_LABEL[r.kind]) : r.kind) },
    { key: 'cluster', label: t('Cluster'), sortValue: (r) => r.cluster, render: (r) => <span className="kg-trunc kg-cell-clip">{r.cluster}</span> },
    { key: 'degree', label: t('Links'), numeric: true, title: t('Total connections, inferred included'), sortValue: (r) => r.degree, render: (r) => r.degree },
    { key: 'authored', label: t('Written'), numeric: true, title: t('Connections a person actually wrote'), sortValue: (r) => r.authored, render: (r) => r.authored },
    { key: 'authority', label: t('Authority'), numeric: true, title: t('PageRank ×1000'), sortValue: (r) => r.authority, render: (r) => (r.authority * 1000).toFixed(1) },
    { key: 'brokerage', label: t('Brokerage'), numeric: true, title: t('Betweenness centrality'), sortValue: (r) => r.brokerage, render: (r) => Math.round(r.brokerage) },
    { key: 'days', label: t('Age'), numeric: true, title: t('Days since last edit'), sortValue: (r) => r.days ?? -1, render: (r) => (r.days === null ? '—' : `${r.days}d`) },
  ];
  return (
    <section id="ranking" className="kg-anchor kg-section" aria-labelledby="ranking-head">
      <GSectionHeader
        size={22}
        id="ranking-head"
        title={t('Ranking')}
        caption={query ? t('{n} of {total} records match', { n: filtered.length, total: rows.length }) : t('{n} records, by authority', { n: rows.length })}
      />
      <GCard p={16} className="kg-rank">
        {filtered.length === 0 ? (
          <GEmpty title={t("No record matches '{query}'", { query })} action={{ label: t('Clear'), onClick: onClear }} />
        ) : (
          <>
            <div className="kg-table-scroll">
              <GTable columns={columns} rows={page} rowKey={(r) => r.id} caption={t('Every record, ranked')} onRowClick={(r) => onOpen(r.id)} rowLabel={(r) => t('Open {label} in the network', { label: r.label })} sticky={false} />
            </div>
            {filtered.length > shown && (
              <div className="kg-rank-more">
                <span className="kg-cap">
                  {t('Showing {n} of {total}', { n: page.length, total: filtered.length })}
                </span>
                <GButton variant="sm" onClick={() => setShown(shown + RANK_PAGE)}>
                  {t('Show {n} more', { n: Math.min(RANK_PAGE, filtered.length - shown) })}
                </GButton>
                <GButton variant="sm" onClick={() => setShown(filtered.length)}>
                  {t('Show all')}
                </GButton>
              </div>
            )}
          </>
        )}
      </GCard>
    </section>
  );
}

