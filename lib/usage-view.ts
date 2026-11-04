/**
 * The /usage view model (pages/usage.md §3 to §5): every state, number,
 * label and sentence the page shows, built from the payload
 * (lib/usage-payload.ts) by one pure function. The GladOS and Classic trees
 * render this and nothing else, and a Bennett Legacy tree can be added on the
 * same object later. No fs, no DOM, no CSS: it runs on the server for the
 * first render and in the browser after every 10 s poll.
 */
import { formatCompact } from '@/lib/format-number';
import type { UsagePlan } from '@/lib/schemas';
import type { LaneBurn, UsageOn, UsagePayload } from '@/lib/usage-payload';
import type { OfficialWindow, PlanSummary } from '@/lib/usage';
import { localeTag, t, tc } from '@/lib/i18n';
import { WEEKDAYS_SHORT } from '@/lib/locale-names';

export const USAGE_TITLE = t('Usage');
export const USAGE_SUBTITLE = t('Claude · ChatGPT / Codex · Ollama · local files only · no paid calls');
export const USAGE_POLL_MS = 10_000;
export const NOT_REPORTED = t('Not reported');
export const NO_GAUGE = t('No provider reported an official gauge.');
export const PLAN_ORDER: UsagePlan[] = ['claude', 'codex', 'ollama'];
/** Plan colour slot (GladOS series-n, Classic --cat-n). */
export const PLAN_SLOT: Record<UsagePlan, 1 | 2 | 3> = {
  claude: 1,
  codex: 2,
  ollama: 3,
};

/** Token counts: 9,999 then 12.3K, 4.2M, 1.1B (the dot glyphs have K, M and B). */
export const fmtTokens = (n: number): string => formatCompact(n);

const MIN = 60_000;
/** "just now", "4 min ago", "3 h ago", "2 d ago". */
export function ago(iso: string, now: number): string {
  const ms = Math.max(0, now - Date.parse(iso));
  if (!Number.isFinite(ms) || ms < MIN) return t('just now');
  const m = Math.floor(ms / MIN);
  if (m < 60) return t('{n} min ago', { n: m });
  const h = Math.floor(m / 60);
  if (h < 48) return t('{n} h ago', { n: h });
  return t('{n} d ago', { n: Math.floor(h / 24) });
}

const DOW = WEEKDAYS_SHORT;
/** Bucket label: weekday for 7 days, day of month for 30. */
function dayLabel(day: string, range: 7 | 30): string {
  const [y, m, d] = day.split('-').map(Number);
  return range === 7 ? DOW[new Date(y, m - 1, d).getDay()] : String(d);
}
function dayLong(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(localeTag(), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export type LaneRow = {
  id: string;
  label: string;
  burn: number;
  display: string;
  share: number;
};
export type MachineRow = {
  machine: string;
  source: 'local' | 'push';
  sourceLabel: string;
  burn: string;
  age: string;
  stale: boolean;
  title: string;
};
export type GaugeView = {
  id: string;
  label: string;
  used: number;
  caption: string;
  resets: string | null;
  title: string;
};
export type PlanCardView = {
  plan: UsagePlan;
  label: string;
  slot: 1 | 2 | 3;
  reported: boolean;
  /** formatted burn, or "Not reported" */
  total: string;
  burn: number | null;
  spark: number[] | null;
  /** "2 machines · updated 4 min ago" or what is missing */
  meta: string;
  status: { tone: 'ok' | 'warn' | 'err' | 'neutral'; text: string } | null;
  /** plan detail sheet */
  detail: {
    lanes: LaneRow[] | null;
    lanesNote: string;
    machines: MachineRow[];
    days: { id: string; label: string; long: string; burn: number }[] | null;
    windows: GaugeView[];
    models: { id: string; label: string; burn: number; display: string }[];
  };
};

export type UsageReadyView = {
  kind: 'ready';
  sample: boolean;
  range: 7 | 30;
  rangeLabel: string;
  /** zero burn in the window, sources found: "No burn in this window." */
  empty: boolean;
  hero: {
    caption: string;
    value: string;
    label: string;
    status: string;
    title: string;
  };
  lanes: { rows: LaneRow[] | null; note: string; machine: string };
  burnChart: {
    caption: string;
    keys: { id: UsagePlan; label: string; slot: 1 | 2 | 3 }[];
    columns: {
      id: string;
      label: string;
      long: string;
      parts: number[];
      total: number;
    }[];
    max: number;
  };
  models: {
    rows: {
      id: string;
      label: string;
      burn: number;
      display: string;
      plan: UsagePlan;
    }[];
    caption: string;
  };
  limits: { gauges: (GaugeView & { plan: UsagePlan })[]; note: string };
  topBurner: {
    machine: string;
    planLabel: string;
    value: string;
    share: string;
    caption: string;
  } | null;
  plans: PlanCardView[];
  ollama: { up: boolean; text: string; models: string[] };
  todayBurn: string;
  machinesReporting: number;
  readAgo: string;
  footnote: string;
  push: { path: string; tokenSet: boolean };
};

export type UsageView =
  | { kind: 'off'; title: string; body: string; filming: boolean }
  | {
      kind: 'unconfigured';
      title: string;
      body: string;
      checks: { label: string; value: string; ok: boolean }[];
      push: { path: string; tokenSet: boolean };
      ollama: { up: boolean; text: string; models: string[] };
      setupHint: string;
    }
  | UsageReadyView;

function laneRows(lanes: LaneBurn[] | null): LaneRow[] | null {
  if (!lanes) return null;
  const total = lanes.reduce((a, l) => a + l.burn, 0);
  return lanes.map((l) => ({
    id: l.lane,
    label: t(l.label),
    burn: l.burn,
    display: fmtTokens(l.burn),
    share: total > 0 ? l.burn / total : 0,
  }));
}

function windowsOf(o: PlanSummary['official'], now: number): GaugeView[] {
  if (!o) return [];
  const one = (id: string, w: OfficialWindow | null, label: string): GaugeView | null => {
    if (!w) return null;
    const resets = w.resetsAt ? t('resets {when}', { when: new Date(w.resetsAt).toLocaleString(localeTag(), { weekday: 'short', hour: 'numeric', minute: '2-digit' }) }) : null;
    const hrs = Math.round(w.windowMinutes / 60);
    return {
      id,
      label,
      used: Math.max(0, Math.min(100, w.usedPercent)),
      caption: hrs >= 24 ? t('{pct}% of the {n}-day window', { pct: Math.round(w.usedPercent), n: Math.round(hrs / 24) }) : t('{pct}% of the {n}-hour window', { pct: Math.round(w.usedPercent), n: hrs }),
      resets,
      title: t('Reported by the provider {ago}', { ago: ago(o.at, now) }),
    };
  };
  return [one('session', o.session, t('Session window')), one('weekly', o.weekly, t('Weekly window'))].filter((g): g is GaugeView => g != null);
}

function planCard(p: PlanSummary, data: UsageOn, now: number): PlanCardView {
  const lanes = laneRows(data.planLanes[p.plan]);
  const machines: MachineRow[] = p.machines.map((m) => ({
    machine: m.machine,
    source: m.source,
    sourceLabel: m.source === 'local' ? t('This machine') : m.stale ? t('Push is stale') : t('Pushed'),
    burn: fmtTokens(m.burn),
    age: ago(m.lastAt, now),
    stale: m.stale,
    title: m.source === 'local' ? t("Read from this machine's transcripts {ago}", { ago: ago(m.lastAt, now) }) : m.stale ? t('Last push {ago}; older than 15 minutes', { ago: ago(m.lastAt, now) }) : t('Last push {ago}', { ago: ago(m.lastAt, now) }),
  }));
  const freshest = p.machines.reduce<string | null>((a, m) => (!a || m.lastAt > a ? m.lastAt : a), null);
  let status: PlanCardView['status'] = null;
  if (p.plan === 'ollama')
    status =
      data.ollama.state === 'up'
        ? {
            tone: 'ok',
            text: data.ollama.models.length ? t('Running {n}', { n: data.ollama.models.length }) : t('Answering'),
          }
        : { tone: 'err', text: t('Ollama not answering') };
  else if (p.machines.some((m) => m.stale)) status = { tone: 'warn', text: t('Stale push') };
  const meta = p.reported
    ? `${machines.length === 1 ? t('{n} machine', { n: machines.length }) : t('{n} machines', { n: machines.length })}${freshest ? t(' · updated {ago}', { ago: ago(freshest, now) }) : ''}`
    : p.plan === 'ollama'
      ? t('Ollama has no usage log; a machine can push its readings')
      : t('No machine reported this plan in the window');
  return {
    plan: p.plan,
    label: p.label,
    slot: PLAN_SLOT[p.plan],
    reported: p.reported,
    total: p.reported && p.burn != null ? fmtTokens(p.burn) : NOT_REPORTED,
    burn: p.reported ? p.burn : null,
    spark: p.days ? p.days.map((d) => d.burn) : null,
    meta,
    status,
    detail: {
      lanes: p.plan === 'ollama' ? null : lanes,
      lanesNote:
        p.plan === 'ollama'
          ? t('Ollama runs are not split by lane.')
          : lanes
            ? t('Lanes are read on {machine} only; pushes carry totals.', { machine: data.machine })
            : t('No transcript folder on this machine, so lanes are not reported.'),
      machines,
      days: p.days
        ? p.days.map((d) => ({
            id: d.day,
            label: dayLabel(d.day, data.range),
            long: dayLong(d.day),
            burn: d.burn,
          }))
        : null,
      windows: windowsOf(p.official, now),
      models: p.byModel.map((m) => ({
        id: m.model,
        label: m.model,
        burn: m.burn,
        display: fmtTokens(m.burn),
      })),
    },
  };
}

export function buildUsageView(data: UsagePayload, nowMs: number = Date.now()): UsageView {
  if (!data.available) {
    const filming = data.reason === 'filming mode';
    return {
      kind: 'off',
      title: t(data.message),
      body: filming
        ? t('Filming mode is on. Usage reads private model transcripts, so it stays off while filming.')
        : t('This is a demo instance. Usage reads private model transcripts, so it is off here.'),
      filming,
    };
  }
  const ollama = {
    up: data.ollama.state === 'up',
    text:
      data.ollama.state === 'up' ? (data.ollama.models.length ? t('Ollama running {models}', { models: data.ollama.models.join(', ') }) : t('Ollama answering, no model loaded')) : t('Ollama not answering'),
    models: data.ollama.models,
  };
  if (!data.configured) {
    return {
      kind: 'unconfigured',
      title: t('No usage source found on this machine.'),
      body: t('Usage reads Claude Code and Codex transcripts on this machine, and readings other machines push here. Neither exists yet.'),
      checks: [
        {
          label: t('Claude Code transcripts'),
          value: data.sources.claude ? t('Found') : t('Not found in ~/.claude/projects'),
          ok: data.sources.claude,
        },
        {
          label: t('Codex sessions'),
          value: data.sources.codex ? t('Found') : t('Not found in ~/.codex/sessions'),
          ok: data.sources.codex,
        },
        {
          label: t('Push token'),
          value: data.push.tokenSet ? tc('token', 'Set') : t('USAGE_PUSH_TOKEN not set'),
          ok: data.push.tokenSet,
        },
      ],
      push: data.push,
      ollama,
      setupHint: t('Run Claude Code or Codex on this machine, or set USAGE_PUSH_TOKEN and push from another machine to /api/usage/push'),
    };
  }

  const range = data.range;
  const rangeLabel = range === 7 ? t('last 7 days') : t('last 30 days');
  const plans = PLAN_ORDER.map((id) => data.plans.find((p) => p.plan === id)).filter((p): p is PlanSummary => p != null);
  const cards = plans.map((p) => planCard(p, data, nowMs));
  const dayIds = plans.find((p) => p.days)?.days?.map((d) => d.day) ?? [];
  // The chart stacks only plans that reported: an unreported plan is not a zero layer.
  const charted = plans.filter((p) => p.reported);
  const columns = dayIds.map((day, i) => {
    const parts = charted.map((p) => p.days?.[i]?.burn ?? 0);
    return {
      id: day,
      label: dayLabel(day, range),
      long: dayLong(day),
      parts,
      total: parts.reduce((a, b) => a + b, 0),
    };
  });
  const today = columns.length ? columns[columns.length - 1].total : 0;
  const machines = new Set(plans.flatMap((p) => p.machines.map((m) => m.machine)));
  const reportedPlans = plans.filter((p) => p.reported).map((p) => p.label);
  const models = plans
    .flatMap((p) =>
      p.byModel.map((m) => ({
        id: `${p.plan}:${m.model}`,
        label: m.model,
        burn: m.burn,
        display: fmtTokens(m.burn),
        plan: p.plan,
      })),
    )
    .sort((a, b) => b.burn - a.burn);
  const gauges = plans.flatMap((p) =>
    windowsOf(p.official, nowMs).map((g) => ({
      ...g,
      id: `${p.plan}:${g.id}`,
      label: `${p.label} · ${g.label}`,
      plan: p.plan,
    })),
  );
  const top = data.topBurner;
  const lanes = laneRows(data.lanes);

  return {
    kind: 'ready',
    sample: data.sample,
    range,
    rangeLabel,
    empty: data.totalBurn === 0,
    hero: {
      caption: t('Tokens burned · {range}', { range: rangeLabel }),
      value: fmtTokens(data.totalBurn),
      label: t('{n} tokens burned, {range}', { n: data.totalBurn.toLocaleString(localeTag()), range: rangeLabel }),
      status: machines.size === 1 ? t('{today} today · {n} machine reporting', { today: fmtTokens(today), n: machines.size }) : t('{today} today · {n} machines reporting', { today: fmtTokens(today), n: machines.size }),
      title: t('Burn across {plans}, {range}. {footnote}', { plans: reportedPlans.join(', ') || t('no plan'), range: rangeLabel, footnote: t(data.footnote) }),
    },
    lanes: {
      rows: lanes,
      note: lanes ? t('Lanes on {machine}', { machine: data.machine }) : t('Lanes not reported: no transcript folder on this machine'),
      machine: data.machine,
    },
    burnChart: {
      caption: `${reportedPlans.join(' + ') || t('No plan')} · ${rangeLabel}`,
      keys: charted.map((p) => ({
        id: p.plan,
        label: p.label,
        slot: PLAN_SLOT[p.plan],
      })),
      columns,
      max: Math.max(0, ...columns.map((c) => c.total)),
    },
    models: { rows: models, caption: rangeLabel },
    limits: {
      gauges,
      note: gauges.length ? t('Official gauges only, as the provider reported them') : NO_GAUGE,
    },
    topBurner: top
      ? {
          machine: top.machine,
          planLabel: plans.find((p) => p.plan === top.plan)?.label ?? top.plan,
          value: fmtTokens(top.burn),
          share: data.totalBurn > 0 ? `${Math.round((top.burn / data.totalBurn) * 100)}%` : '0%',
          caption: t('of all burn, {range}', { range: rangeLabel }),
        }
      : null,
    plans: cards,
    ollama,
    todayBurn: fmtTokens(today),
    machinesReporting: machines.size,
    readAgo: ago(data.readAt, nowMs),
    footnote: t(data.footnote),
    push: data.push,
  };
}
