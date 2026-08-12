/**
 * One shape for "who the rep is about to call", whether that came from the repo or from
 * something they pasted in five minutes ago.
 *
 * Resolving happens client-side because custom prospects live in localStorage. Built-ins
 * are resolved from the same module the server uses, so ids stay honest.
 */

import { campaignKey, getCustomProspect } from '@/lib/customProspects';
import { type Objection, type PersonaBrief, getPersona } from '@/lib/personas';

export interface ProspectView {
  /** Namespaced key for campaign storage. */
  key: string;
  id: string;
  isCustom: boolean;
  name: string;
  title: string;
  company: string;
  difficulty: string;
  accent: string;
  scoutingReport: string;
  openingPosture: string;
  brief: PersonaBrief;
  objections: Objection[];
  /** Custom prospects carry their prompt; built-ins resolve theirs on the agent. */
  systemPrompt?: string;
  voice?: string;
}

/** `champion` resolves a built-in; `c_ab12cd34` resolves a stored custom prospect. */
export function resolveProspect(id: string): ProspectView | null {
  const builtIn = getPersona(id);
  if (builtIn) {
    return {
      key: campaignKey(builtIn, false),
      id: builtIn.id,
      isCustom: false,
      name: builtIn.name,
      title: builtIn.title,
      company: builtIn.company,
      difficulty: builtIn.difficulty,
      accent: builtIn.accent,
      scoutingReport: builtIn.scoutingReport,
      openingPosture: builtIn.openingPosture,
      brief: builtIn.brief,
      objections: builtIn.objections,
    };
  }

  const custom = getCustomProspect(id);
  if (!custom) return null;

  return {
    key: campaignKey(custom, true),
    id: custom.id,
    isCustom: true,
    name: custom.name,
    title: custom.title,
    company: custom.company,
    difficulty: custom.difficulty,
    accent: custom.accent,
    scoutingReport: custom.scoutingReport,
    openingPosture: custom.openingPosture,
    brief: custom.brief,
    objections: custom.objections,
    systemPrompt: custom.systemPrompt,
    voice: custom.voice,
  };
}
