import Link from 'next/link';
import { GButton, GCard, GEmpty, GList, GRow, GSectionHeader, GStat, GTag } from '@/components/g';
import { postAgeText, CREW_WINDOW_DAYS, type ContentCrew } from '@/lib/social-crew';
import { localeTag, t } from '@/lib/i18n';

/**
 * The content crew card on /social (founderos-ui F12, from FO's
 * ContentAgentCard): the Growth agents, their runs in 30 days, the busiest
 * one and the age of the last post. GladOS and Classic forms; Legacy renders
 * the Classic one under its skin.
 */

const runsN = (n: number) => (n === 1 ? t('{n} run', { n }) : t('{n} runs', { n }));
const timesN = (n: number) => (n === 1 ? t('{n} time', { n }) : t('{n} times', { n }));
const growthAgentsN = (n: number) => (n === 1 ? t('{n} Growth agent', { n }) : t('{n} Growth agents', { n }));

export function ContentCrewG({ crew }: { crew: ContentCrew }) {
  return (
    <aside className="soc-g-sec soc-g-crew" aria-labelledby="soc-g-crew" data-content-crew="">
      <GSectionHeader
        id="soc-g-crew"
        size={22}
        title={t('Content crew')}
        caption={crew.department ? `${crew.department.name} · ${t('last {n} days', { n: CREW_WINDOW_DAYS })}` : undefined}
        action={
          <GButton size="sm" href={crew.href} title={t('Open the Growth agents')}>
            {t('Agents')}
          </GButton>
        }
      />
      <GCard p={16} className="soc-g-crew-card">
        {crew.agents.length === 0 ? (
          <GEmpty title={t('No Growth agents yet')} body={t('Agents in the Growth department show here with their runs.')} action={{ label: t('Open Agents'), href: '/agents' }} />
        ) : (
          <>
            <div className="soc-g-crew-stats">
              <GStat value={crew.runs} label={t('runs · {n}d', { n: CREW_WINDOW_DAYS })} href={crew.href} source={`${t('Runs by the {agents} in the last {n} days', { agents: growthAgentsN(crew.agents.length), n: CREW_WINDOW_DAYS })}${crew.failed > 0 ? `; ${t('{n} failed', { n: crew.failed })}` : ''}`} />
              <div className="soc-g-crew-facts">
                <span title={crew.busiest ? t('{name} ran {times} in {n} days', { name: crew.busiest.name, times: timesN(crew.busiest.runs), n: CREW_WINDOW_DAYS }) : t('No Growth agent ran in {n} days', { n: CREW_WINDOW_DAYS })}>
                  <span className="soc-g-cap">{t('Busiest')}</span> {crew.busiest ? crew.busiest.name : t('None yet')}
                </span>
                <span title={crew.lastPostAt ? new Date(crew.lastPostAt).toLocaleString(localeTag()) : t('No published post on record')}>
                  <span className="soc-g-cap">{t('Last post')}</span> {postAgeText(crew.lastPostAge)}
                </span>
              </div>
            </div>
            <GList divided label={t('Growth agents')}>
              {crew.agents.map((a) => (
                <GRow
                  key={a.id}
                  href={`/agents?agent=${encodeURIComponent(a.id)}`}
                  title={a.name}
                  meta={a.role || a.status}
                  hint={`${a.name}: ${t('{runs} in {n} days', { runs: runsN(a.runs), n: CREW_WINDOW_DAYS })}`}
                  trailing={
                    a.failed > 0 ? (
                      <GTag tone="err" size="xs">
                        {a.runs} · {t('{n} failed', { n: a.failed })}
                      </GTag>
                    ) : (
                      <span className="soc-g-cap">{runsN(a.runs)}</span>
                    )
                  }
                />
              ))}
            </GList>
          </>
        )}
      </GCard>
    </aside>
  );
}

export function ContentCrewClassic({ crew }: { crew: ContentCrew }) {
  return (
    <section className="mb-8" aria-labelledby="crew-title" data-content-crew="">
      <div className="rounded-lg-t border border-os-border bg-os-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="crew-title" className="text-[13.5px] font-medium text-os-text">
            {t('Content crew')}
            {crew.department && <span className="ml-2 font-normal text-os-muted">{crew.department.name} · {t('last {n} days', { n: CREW_WINDOW_DAYS })}</span>}
          </h2>
          <Link href={crew.href} className="text-[12px] text-os-accent hover:underline">
            {t('Agents →')}
          </Link>
        </div>
        {crew.agents.length === 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] text-os-muted">
            {t('No Growth agents yet. Agents in the Growth department show here with their runs.')}
            <Link href="/agents" className="text-os-accent hover:underline">
              {t('Open Agents')}
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <div className="text-[11.5px] text-os-muted">{t('Runs · {n}d', { n: CREW_WINDOW_DAYS })}</div>
                <div className="mt-1 text-[26px] font-normal leading-none tabular-nums text-os-text">{crew.runs}</div>
                {crew.failed > 0 && <div className="mt-1 text-[11.5px] text-os-err">{t('{n} failed', { n: crew.failed })}</div>}
              </div>
              <div className="min-w-0">
                <div className="text-[11.5px] text-os-muted">{t('Busiest')}</div>
                <div className="mt-1 truncate text-[14px] text-os-text" title={crew.busiest ? `${crew.busiest.name}: ${runsN(crew.busiest.runs)}` : undefined}>
                  {crew.busiest ? crew.busiest.name : t('None yet')}
                </div>
                {crew.busiest && <div className="mt-1 font-mono text-[11.5px] text-os-muted">{runsN(crew.busiest.runs)}</div>}
              </div>
              <div>
                <div className="text-[11.5px] text-os-muted">{t('Last post')}</div>
                <div className="mt-1 text-[14px] text-os-text" title={crew.lastPostAt ? new Date(crew.lastPostAt).toLocaleString(localeTag()) : undefined}>
                  {postAgeText(crew.lastPostAge)}
                </div>
              </div>
            </div>
            <ul className="mt-4 divide-y divide-os-border border-t border-os-border">
              {crew.agents.map((a) => (
                <li key={a.id}>
                  <Link href={`/agents?agent=${encodeURIComponent(a.id)}`} className="flex items-center gap-3 py-2 text-[12.5px] hover:bg-os-surface2">
                    <span className="min-w-0 flex-1 truncate text-os-text">{a.name}</span>
                    <span className="hidden min-w-0 truncate text-os-muted sm:inline">{a.role || a.status}</span>
                    <span className={`shrink-0 font-mono text-[11.5px] ${a.failed > 0 ? 'text-os-err' : 'text-os-muted'}`}>
                      {runsN(a.runs)}
                      {a.failed > 0 ? ` · ${t('{n} failed', { n: a.failed })}` : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
