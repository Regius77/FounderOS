import { getDb } from '@/lib/data';
import { compileBlueprint } from '@/lib/blueprint/compile';
import { BlueprintCanvasLazy } from '@/components/blueprint/BlueprintCanvasLazy';
import { GStyleProvider } from '@/components/system-g/style-context';
import { getAppearance } from '@/lib/appearance-server';
import { treeFor } from '@/lib/appearance';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

function relativeTime(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 5) return t('just now');
  if (seconds < 60) return t('{n}s ago', { n: seconds });
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t('{n}m ago', { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t('{n}h ago', { n: hours });
  return t('{n}d ago', { n: Math.round(hours / 24) });
}

/**
 * Blueprint — the system, drawn from itself. compileBlueprint assembles
 * the graph from the live registries on every request; the workspace reads
 * that graph as machines → groups → things, so the subline's counts and the
 * map itself genuinely change when the system does.
 */
export default async function BlueprintPage() {
  const graph = await compileBlueprint(getDb());
  const count = (kind: string) => graph.nodes.filter((n) => n.kind === kind).length;
  const subline = t('{components} components · {agents} agents · {daemons} daemons · {machines} machines · compiled {when}', {
    components: graph.nodes.length,
    agents: count('agent'),
    daemons: count('daemon'),
    machines: count('host'),
    when: relativeTime(graph.compiledAt),
  });
  // Two trees over one workspace (glados-ui SPEC X5, S05 F05.50 to F05.55): under GladOS the same
  // workspace renders kit controls (style context) and reads --g-* inside .kg-blueprint.
  if (treeFor(getAppearance(), '/blueprint') === 'glados') {
    return (
      <div className="kg-blueprint">
        <GStyleProvider>
          <BlueprintCanvasLazy graph={graph} subline={subline} />
        </GStyleProvider>
      </div>
    );
  }
  return <BlueprintCanvasLazy graph={graph} subline={subline} />;
}
