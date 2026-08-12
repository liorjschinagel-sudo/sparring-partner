/**
 * Prospects the rep authored at runtime.
 *
 * A compiled prospect is the same shape as a built-in one, minus the markdown file: it
 * carries its own system prompt instead of a persona id. Everything downstream (call
 * screen, agent dispatch, grader) treats the two identically.
 *
 * Stored only in the rep's browser. The compile route is stateless and writes nothing, so
 * a pasted Gong transcript never lands on a server. Clearing site data clears these.
 */

import type { Difficulty, Objection, PersonaBrief } from '@/lib/personas';

const STORAGE_KEY = 'sp_custom_prospects_v1';

export type ProspectSource = 'research' | 'gong';

export interface CustomProspect {
  id: string;
  createdAt: number;
  source: ProspectSource;
  name: string;
  title: string;
  company: string;
  difficulty: Difficulty;
  accent: string;
  voice: string;
  scoutingReport: string;
  openingPosture: string;
  brief: PersonaBrief;
  objections: Objection[];
  /** Replaces the persona file entirely at dispatch time. */
  systemPrompt: string;
}

/** The subset the compiler returns; id and timestamp are assigned locally. */
export type CompiledProspect = Omit<CustomProspect, 'id' | 'createdAt'>;

function readAll(): CustomProspect[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as CustomProspect[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: CustomProspect[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Quota or private browsing. Nothing to recover; the session still works.
  }
}

export function listCustomProspects(): CustomProspect[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function getCustomProspect(id: string): CustomProspect | undefined {
  return readAll().find((p) => p.id === id);
}

export function saveCustomProspect(compiled: CompiledProspect): CustomProspect {
  const prospect: CustomProspect = {
    ...compiled,
    id: `c_${Math.random().toString(36).slice(2, 10)}`,
    createdAt: Date.now(),
  };
  writeAll([prospect, ...readAll()]);
  return prospect;
}

export function deleteCustomProspect(id: string): void {
  writeAll(readAll().filter((p) => p.id !== id));
}

/** Campaign keys namespace custom prospects so they cannot collide with built-in ids. */
export function campaignKey(prospect: { id: string }, isCustom: boolean): string {
  return isCustom ? `custom:${prospect.id}` : prospect.id;
}
