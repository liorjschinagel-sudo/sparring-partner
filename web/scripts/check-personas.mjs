/**
 * Guards the one deliberate duplication in this repo.
 *
 * The agent owns behaviour (`agent/personas/*.md`); the web app owns display copy and
 * grading criteria (`web/lib/personas.ts`). They are separate concerns, but they share
 * ids — and a mismatch is silent at build time and only shows up as a rep sparring
 * with the wrong prospect. So: fail loudly here instead.
 *
 * Run with `pnpm check:personas`. Local/CI only — it reads outside the Vercel root.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const personasDir = join(here, '..', '..', 'agent', 'personas');
const webPersonas = join(here, '..', 'lib', 'personas.ts');

function agentPersonaIds() {
  return readdirSync(personasDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = readFileSync(join(personasDir, f), 'utf8');
      const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
      const id = match?.[1].match(/^id:\s*(.+)$/m)?.[1].trim();
      if (!id) throw new Error(`${f} has no "id" in its frontmatter`);
      return id;
    })
    .sort();
}

function webPersonaIds() {
  const raw = readFileSync(webPersonas, 'utf8');
  // Only the top-level persona entries: `id: '...'` at four-space indentation.
  return [...raw.matchAll(/^ {4}id: '([^']+)',$/gm)].map((m) => m[1]).sort();
}

const fromAgent = agentPersonaIds();
const fromWeb = webPersonaIds();

const onlyAgent = fromAgent.filter((id) => !fromWeb.includes(id));
const onlyWeb = fromWeb.filter((id) => !fromAgent.includes(id));

if (onlyAgent.length || onlyWeb.length) {
  console.error('Persona ids are out of sync between the agent and the web app.\n');
  if (onlyAgent.length) console.error(`  Only in agent/personas/: ${onlyAgent.join(', ')}`);
  if (onlyWeb.length) console.error(`  Only in web/lib/personas.ts: ${onlyWeb.join(', ')}`);
  console.error('\nEvery persona needs a prompt file AND a web entry.');
  process.exit(1);
}

console.log(`Personas in sync (${fromAgent.length}): ${fromAgent.join(', ')}`);
