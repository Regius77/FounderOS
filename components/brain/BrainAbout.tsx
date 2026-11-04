import { AboutButton } from '@/components/system-g/AboutButton';
import { t } from '@/lib/i18n';

/**
 * /brain "About this page" (S05 F05.3, F05.17): the Pipeline prose and the
 * Query path explainer, moved off the working surface word for word.
 */
export function BrainAbout({ storeShort }: { storeShort: string }) {
  return (
    <AboutButton>
      <h3>{t('1 · Markdown brain-store')}</h3>
      <p>
        <code>{storeShort}</code>
        {t(': plain')} <code>.md</code> {t('files, the source of truth.')} <code>engine sync</code>{' '}
        {t('walks the git repo and pushes changed pages up.')}
      </p>
      <h3>{t('2 · engine CLI')}</h3>
      <p>{t('Chunk, embed, route: the engine between disk and database. Its health and checks open from the Doctor card.')}</p>
      <h3>3 · Supabase Postgres + pgvector</h3>
      <p>
        {t('Each page is split into chunks; every chunk gets a ZeroEntropy embedding stored in a')} <code>vector</code>{' '}
        {t('column. Postgres holds both the text (tsvector) and the vectors, so one database answers keyword and semantic queries.')}
      </p>
      <p>
        {t('Free tier pauses on idle — when hybrid queries fail, unpause from the Supabase dashboard. The brain-store on disk keeps working regardless.')}
      </p>
      <h3>{t('Query path')}</h3>
      <p>
        {t('What happens when an agent calls')} <code>engine query</code>{' '}
        {t('— hybrid retrieval with an honest fallback.')}
      </p>
      <ol>
        <li>{t('Question: natural-language query from you or an agent run.')}</li>
        <li>{t('Query expansion: the CLI rewrites the question into search variants (skip with --no-expand).')}</li>
        <li>{t('Keyword search: Postgres tsvector full-text match over chunk text.')}</li>
        <li>{t('Vector search: pgvector nearest-neighbor over ZeroEntropy embeddings.')}</li>
        <li>{t('RRF fusion: reciprocal-rank fusion merges both result lists into one ranking.')}</li>
        <li>{t('Ranked snippets: top pages with snippets, returned to the agent.')}</li>
      </ol>
      <p>
        {t('Fallback, local grep: if Supabase is paused or unreachable, the OS greps the markdown brain-store directly — fewer smarts, zero downtime.')}
      </p>
    </AboutButton>
  );
}
