/**
 * Verdicts and the hide rule (06 section 8): a predictor is shown outside the Ledger only when it
 * beats "your normal" on the eval that decides it; otherwise one reason line replaces its number.
 */
import type { LabEval, LabPlatform } from '@/lib/schemas';
import type { LabStore } from '@/lib/lab/store';
import { predictorDef, type PredictorDef, type PredictorKind } from '@/lib/lab/ledger/predictors';
import { typicalFactor } from '@/lib/lab/ledger/metrics';
import { t } from '@/lib/i18n';

export type Verdict = 'beats' | 'at_chance' | 'worse' | 'not_enough';

export const VERDICT_MIN_N = 20;
export const RANKING_MIN_PAIRS = 30;
export const CLASSIFIER_MIN_POSITIVES = 5;
export const EVAL_WINDOW_WEEKS = 12;

/** 06 8.2, from the eval's own fields (so constructed evals can be judged). */
export function verdictFor(e: LabEval, kind: PredictorKind): Verdict {
  const n = e.nPosts;
  if (kind === 'forecast') {
    if (n < VERDICT_MIN_N || e.maeDeltaLo === null || e.maeDeltaHi === null) return 'not_enough';
    const coverageOk = e.coverage === null || (e.coverage >= 0.7 && e.coverage <= 0.9);
    if (e.maeDeltaLo > 0 && coverageOk) return 'beats';
    if (e.maeDeltaHi < 0) return 'worse';
    return 'at_chance';
  }
  if (kind === 'ranking') {
    if (n < VERDICT_MIN_N || e.nPairs < RANKING_MIN_PAIRS || e.pairwiseLo === null || e.pairwiseHi === null) return 'not_enough';
    if (e.pairwiseLo > 0.5 && e.spearmanLo !== null && e.spearmanLo > 0) return 'beats';
    if (e.pairwiseHi < 0.5) return 'worse';
    return 'at_chance';
  }
  if (kind === 'classifier') {
    if (n < VERDICT_MIN_N || e.positives < CLASSIFIER_MIN_POSITIVES || e.prAucLo === null || e.prAucHi === null || e.baseRate === null) return 'not_enough';
    if (e.prAucLo > e.baseRate) return 'beats';
    if (e.prAucHi < e.baseRate) return 'worse';
    return 'at_chance';
  }
  // pairwise (judge): Wilson 90% of right / n
  if (n < VERDICT_MIN_N || e.pairwiseLo === null || e.pairwiseHi === null) return 'not_enough';
  if (e.pairwiseLo > 0.5) return 'beats';
  if (e.pairwiseHi < 0.5) return 'worse';
  return 'at_chance';
}

/**
 * The eval that decides (06 8.2): scope backtest for replayable predictors, live for the rest,
 * window 12 weeks, the platform row when its n >= 20, else the `all` row.
 */
export function decidingEval(store: LabStore, predictor: string, platform: LabPlatform | 'all'): LabEval | null {
  const def = predictorDef(predictor);
  const scope = def.replayable ? 'backtest' : 'live';
  if (platform !== 'all') {
    const own = store.evals.latest(predictor, scope, def.scope, platform, EVAL_WINDOW_WEEKS);
    if (own && own.nPosts >= VERDICT_MIN_N) return own;
  }
  return store.evals.latest(predictor, scope, def.scope, 'all', EVAL_WINDOW_WEEKS);
}

/** The kind a predictor is displayed as (its first registered kind). */
export const displayKind = (def: PredictorDef): PredictorKind => def.kinds[0];

/** verdict === 'beats' (06 8.3). `creator_median` is the baseline and is never hidden. */
export function isShown(store: LabStore, predictor: string, platform: LabPlatform | 'all', kind?: PredictorKind): boolean {
  const def = predictorDef(predictor);
  if (def.isBaseline) return true;
  const e = decidingEval(store, predictor, platform);
  return e !== null && verdictFor(e, kind ?? displayKind(def)) === 'beats';
}

const pct = (x: number) => `${Math.round(x * 100)}`;
const dec2 = (x: number) => x.toFixed(2);

/** 06 8.3 copy for a hidden predictor (pure). */
export function hideReasonFor(def: PredictorDef, e: LabEval | null, verdict: Verdict | null, kind: PredictorKind): string {
  const label = def.label;
  if (!e || verdict === null) return t('Hidden: {label} has not been graded yet.', { label });
  const n = e.nPosts;
  if (verdict === 'not_enough') return t('Hidden: {label} has {n} graded posts. It shows once it beats your normal on 20.', { label, n });
  if (verdict === 'worse') return t('Hidden: {label} has done worse than your normal (n {n}).', { label, n });
  if (kind === 'forecast') {
    const model = e.logMae !== null ? typicalFactor(e.logMae).toFixed(1) : '?';
    const base = e.logMaeBaseline !== null ? typicalFactor(e.logMaeBaseline).toFixed(1) : '?';
    return t('Hidden: {label} is not yet better than your normal (off by x{model} vs x{base}, n {n}).', { label, model, base, n });
  }
  if (kind === 'ranking') return t('Hidden: {label} picks the better post {pct}% of the time, which is chance so far (n {n}).', { label, pct: pct(e.pairwise ?? 0.5), n });
  if (kind === 'classifier') return t('Hidden: {label} finds breakouts no better than chance yet ({auc} vs {base}, n {n}).', { label, auc: dec2(e.prAuc ?? 0), base: dec2(e.baseRate ?? 0), n });
  return t('Hidden: {label} picked the test winner {k} of {n} times, which is chance so far.', { label, k: Math.round((e.pairwise ?? 0) * n), n });
}

/** The single reason line that replaces a hidden predictor's number (06 8.3), or null when shown. */
export function hideReason(store: LabStore, predictor: string, platform: LabPlatform | 'all', kind?: PredictorKind): string | null {
  const def = predictorDef(predictor);
  if (def.isBaseline) return null;
  const k = kind ?? displayKind(def);
  const e = decidingEval(store, predictor, platform);
  const v = e ? verdictFor(e, k) : null;
  return v === 'beats' ? null : hideReasonFor(def, e, v, k);
}

/** 06 8.4 record line (pure); 'not enough yet' under n 5. */
export function recordLineFor(def: PredictorDef, e: LabEval | null, kind: PredictorKind): string {
  if (!e || e.nPosts < 5) return t('not enough yet');
  const n = e.nPosts;
  if (kind === 'forecast') {
    const x = e.logMae !== null ? typicalFactor(e.logMae).toFixed(1) : '?';
    const m = e.coverageN;
    const k = e.coverage !== null ? Math.round(e.coverage * m) : 0;
    return m ? t('{label}: typically off by x{x} on {n} posts, 80% range held {k} of {m}.', { label: def.label, x, n, k, m }) : t('{label}: typically off by x{x} on {n} posts.', { label: def.label, x, n });
  }
  if (kind === 'ranking') return t('{label}: picked the better post {pct}% of the time ({n} posts, {weeks} weeks).', { label: def.label, pct: pct(e.pairwise ?? 0.5), n, weeks: e.windowWeeks });
  if (kind === 'classifier') return t('{label}: finds breakouts at {auc} against {base} by chance ({n} posts).', { label: def.label, auc: dec2(e.prAuc ?? 0), base: dec2(e.baseRate ?? 0), n });
  return t('{label}: picked the test winner {k} of {n} times.', { label: def.label, k: Math.round((e.pairwise ?? 0) * n), n });
}

/** 06 8.4 record line for every place a shown prediction appears (06 writes recordLine(predictor, platform)). */
export function recordLine(store: LabStore, predictor: string, platform: LabPlatform | 'all', kind?: PredictorKind): string {
  const def = predictorDef(predictor);
  return recordLineFor(def, decidingEval(store, predictor, platform), kind ?? displayKind(def));
}
