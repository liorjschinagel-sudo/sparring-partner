/**
 * Campaign state: one deal, progressing across calls.
 *
 * Lives in localStorage on purpose. Cross-call memory is the most valuable thing in v2 and
 * it needs no server to work — which keeps the deploy at three environment variables and
 * means no rep's practice transcripts sit in a database somewhere.
 *
 * The interesting field is `prospectMemory`. It is written from the prospect's point of
 * view by the grader and injected into the next call's prompt, so a promise made in stage 2
 * gets handed back to the rep in stage 4.
 */

import { type StageId, nextStage } from '@/lib/stages';

const STORAGE_KEY = 'sp_campaigns_v2';

/** Clearing this bar advances the deal. Bluffing an escalation trap never does. */
export const ADVANCE_MIN_GRADE = 3.5;

/**
 * Ceiling on the overall grade when the rep bluffed something that needed escalating.
 *
 * Without this the headline number is a plain mean, so three strong answers and one
 * invented compliance claim reads as a 4/5 — which is exactly the lesson the tool exists
 * to prevent. Sits below ADVANCE_MIN_GRADE so the number and the gate always agree.
 */
export const ESCALATION_FAILURE_CAP = 2.5;

export interface CallRecord {
  stage: StageId;
  stageLabel: string;
  overallGrade: number | null;
  passed: boolean;
  /** 2–3 sentences in the prospect's voice: what they remember, what you promised. */
  prospectMemory: string;
  at: number;
}

export interface Campaign {
  /** `champion` for a built-in, `custom:<id>` for an authored prospect. */
  prospectKey: string;
  displayName: string;
  stage: StageId;
  calls: CallRecord[];
  closedWon: boolean;
}

type CampaignMap = Record<string, Campaign>;

function readAll(): CampaignMap {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as CampaignMap;
  } catch {
    return {};
  }
}

function writeAll(map: CampaignMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Private browsing or a full quota. The tool still works, it just forgets.
  }
}

export function getCampaign(prospectKey: string): Campaign | null {
  return readAll()[prospectKey] ?? null;
}

export function listCampaigns(): Campaign[] {
  return Object.values(readAll()).sort(
    (a, b) => (b.calls.at(-1)?.at ?? 0) - (a.calls.at(-1)?.at ?? 0)
  );
}

export function startCampaign(prospectKey: string, displayName: string, stage: StageId): Campaign {
  const map = readAll();
  const campaign: Campaign = {
    prospectKey,
    displayName,
    stage,
    calls: [],
    closedWon: false,
  };
  map[prospectKey] = campaign;
  writeAll(map);
  return campaign;
}

/**
 * Whether a call earned the right to advance.
 *
 * A failed escalation trap blocks progression regardless of the average. That is the whole
 * argument of the tool: a rep who bluffs their way through a technical evaluation should
 * not find themselves in procurement.
 */
export function callPassed(overallGrade: number | null, failedEscalation: boolean): boolean {
  if (failedEscalation) return false;
  return (overallGrade ?? 0) >= ADVANCE_MIN_GRADE;
}

export function recordCall(prospectKey: string, displayName: string, record: CallRecord): Campaign {
  const map = readAll();
  const existing = map[prospectKey] ?? {
    prospectKey,
    displayName,
    stage: record.stage,
    calls: [],
    closedWon: false,
  };

  existing.displayName = displayName;
  existing.calls = [...existing.calls, record];
  map[prospectKey] = existing;
  writeAll(map);
  return existing;
}

/** Move the deal forward. Only called once the rep has cleared the bar. */
export function advance(prospectKey: string): Campaign | null {
  const map = readAll();
  const campaign = map[prospectKey];
  if (!campaign) return null;

  const next = nextStage(campaign.stage);
  if (next) {
    campaign.stage = next.id;
  } else {
    campaign.closedWon = true;
  }

  map[prospectKey] = campaign;
  writeAll(map);
  return campaign;
}

export function resetCampaign(prospectKey: string): void {
  const map = readAll();
  delete map[prospectKey];
  writeAll(map);
}

/**
 * Condense prior calls into the memory the prospect carries into the next one.
 *
 * Only passed calls advance the deal, but every call is remembered — a rep who bluffed and
 * had to retry should find the prospect a little more wary, not amnesiac.
 */
export function buildHistoryPrompt(campaign: Campaign | null): string | undefined {
  if (!campaign || campaign.calls.length === 0) return undefined;

  return campaign.calls
    .map((call, i) => {
      const outcome = call.passed ? 'It went well enough to keep going.' : 'You were not convinced.';
      return `Call ${i + 1} — ${call.stageLabel}. ${call.prospectMemory} ${outcome}`;
    })
    .join('\n\n');
}
