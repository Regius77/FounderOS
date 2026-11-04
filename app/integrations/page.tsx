import type { ReactNode } from 'react';
import { allConnectorStatuses } from '@/lib/connectors';
import { readEnvLocal } from '@/lib/creds';
import { connectionCatalog, integrationsByCategory, popularNotConnected, type CatalogEntry } from '@/lib/integrations-catalog';
import { listKeyStatuses } from '@/lib/keys';
import { getAppearance } from '@/lib/appearance-server';
import { treeFor } from '@/lib/appearance';
import { GButton, GPage, GSectionHeader } from '@/components/g';
import { ConnectionCardG, ConnSection } from '@/components/integrations/ConnectionsG';
import { CategoryG } from '@/components/integrations/CategoryG';
import { ApiKeysG } from '@/components/integrations/ApiKeysG';
import { PageHeader } from '@/components/PageHeader';
import { ApiKeys } from '@/components/ApiKeys';
import { SectionHead } from '@/components/terminal';
import { ConnectionCard } from '@/components/ConnectionCard';
import { IntegrationCategory } from '@/components/IntegrationCategory';
import { IntegrationBrowser, type BrowserItem } from '@/components/integrations/IntegrationBrowser';
import { browseState, categoryLabel } from '@/lib/integration-browser';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const GRID = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';

export default async function ConnectionsPage() {
  const statuses = await allConnectorStatuses();
  const catalog = connectionCatalog(statuses, readEnvLocal());
  const detailByConnector = new Map(statuses.map((s) => [s.id, s.detail]));
  const guidanceFor = (entry: CatalogEntry) =>
    entry.connectorId ? detailByConnector.get(entry.connectorId) : undefined;

  const byId = new Map(catalog.map((c) => [c.slug, c]));
  const connected = catalog.filter((c) => c.connected);
  const popular = catalog.filter((c) => c.popular);
  const categories = [...integrationsByCategory().entries()];
  const categoryNames = categories.map(([c]) => c as string);
  // F11 (founderos-ui): the browser's facts per tool, each with its tree's card.
  const browseItems = (render: (entry: CatalogEntry) => ReactNode): BrowserItem[] =>
    catalog.map((c) => ({ slug: c.slug, name: c.name, tagline: c.tagline, category: c.category, state: browseState(c), card: render(c) }));

  // Two trees, one fetch (glados-ui SPEC X5, S05 F05.70 to F05.73).
  if (treeFor(getAppearance(), '/integrations') === 'glados') {
    const popularOpen = popularNotConnected(catalog);
    const slots = listKeyStatuses();
    const set = slots.filter((s) => s.present).length;
    const card = (entry: CatalogEntry) => <ConnectionCardG key={entry.slug} entry={entry} guidance={guidanceFor(entry)} />;
    return (
      <GPage className="kg-page">
        <GSectionHeader
          size="page"
          title={t('Connections')}
          caption={t('Every tool this OS can reach, with its live state.')}
          action={
            <GButton variant="sm" href="#keys-head" title={t('{set} of {total} key slots hold a value in .env.local on this host', { set, total: slots.length })}>
              {t('{set} of {total} keys set', { set, total: slots.length })}
            </GButton>
          }
        />
        {connected.length > 0 && (
          <ConnSection id="conn-connected" title={t('Your connected tools')} caption={t('{n} reporting live', { n: connected.length })}>
            <div className="kg-grid-3">{connected.map(card)}</div>
          </ConnSection>
        )}
        {popularOpen.length > 0 && (
          <ConnSection id="conn-popular" title={t('Popular')} caption={t('Not connected yet')}>
            <div className="kg-grid-3">{popularOpen.map(card)}</div>
          </ConnSection>
        )}
        <ConnSection id="conn-browse" title={t('Browse by category')} caption={t('{n} categories', { n: categories.length })}>
          <IntegrationBrowser ui="glados" items={browseItems(card)} categories={categoryNames} gridClassName="kg-grid-3">
            <div className="kg-stack-sm">
              {categories.map(([category, tools]) => (
                <CategoryG key={category} label={category} count={tools.length} slugs={tools.map((tool) => tool.slug)}>
                  <div className="kg-grid-3">{tools.map((tool) => card(byId.get(tool.slug) as CatalogEntry))}</div>
                </CategoryG>
              ))}
            </div>
          </IntegrationBrowser>
        </ConnSection>
        <ApiKeysG />
      </GPage>
    );
  }

  return (
    <div>
      <PageHeader eyebrow={t('Live connections board')} title={t('Connections')} />

      {/* Your connected tools — driven by real connector status */}
      {connected.length > 0 && (
        <section className="mb-8">
          <SectionHead label={t('Your connected tools')} count={connected.length} />
          <div className={GRID}>
            {connected.map((entry) => (
              <ConnectionCard key={entry.slug} entry={entry} guidance={guidanceFor(entry)} />
            ))}
          </div>
        </section>
      )}

      {/* Popular */}
      <section className="mb-8">
        <SectionHead label={t('Popular')} count={popular.length} />
        <div className={GRID}>
          {popular.map((entry) => (
            <ConnectionCard key={entry.slug} entry={entry} guidance={guidanceFor(entry)} />
          ))}
        </div>
      </section>

      {/* Browse by category — collapsible */}
      <section className="mb-8">
        <SectionHead label={t('Browse by category')} count={categories.length} />
        <IntegrationBrowser
          ui="classic"
          items={browseItems((entry) => <ConnectionCard key={entry.slug} entry={entry} guidance={guidanceFor(entry)} />)}
          categories={categoryNames}
          gridClassName={GRID}
        >
        <div className="flex flex-col gap-3.5">
          {categories.map(([category, tools], idx) => (
            <IntegrationCategory key={category} label={categoryLabel(category)} count={tools.length} defaultOpen={idx === 0} slugs={tools.map((tool) => tool.slug)}>
              <div className={GRID}>
                {tools.map((tool) => (
                  <ConnectionCard
                    key={tool.slug}
                    entry={byId.get(tool.slug) as CatalogEntry}
                    guidance={guidanceFor(byId.get(tool.slug) as CatalogEntry)}
                  />
                ))}
              </div>
            </IntegrationCategory>
          ))}
        </div>
        </IntegrationBrowser>
      </section>

      <ApiKeys />
    </div>
  );
}
