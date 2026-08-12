/** Shared types for the transcript and the scorecard. */

import type { StageId } from '@/lib/stages';

export type Speaker = 'rep' | 'prospect';

export interface TranscriptTurn {
  speaker: Speaker;
  text: string;
}

export interface ObjectionGrade {
  id: string;
  label: string;
  raised: boolean;
  addressed: boolean;
  /** 1–5 per rubric.md. Null when the objection never came up. */
  grade: number | null;
  /** One line, written to the rep. */
  note: string;
  escalationTrap: boolean;
  /** True for objections contributed by the funnel stage rather than the persona. */
  fromStage?: boolean;
}

export interface EscalationMoment {
  /** What the prospect asked that should have triggered an escalation. */
  trigger: string;
  /** Did the rep decline to guess and commit to bringing the right person? */
  handled: boolean;
  note: string;
}

export interface TalkRatio {
  repWords: number;
  prospectWords: number;
  /** Rep's share of total words, 0–100. */
  repSharePct: number;
  /** Plain-language read, per the rubric's bands. */
  read: string;
}

export interface GradedDimension {
  grade: number | null;
  note: string;
}

export interface Scorecard {
  personaId: string;
  personaName: string;
  stage: StageId;
  stageLabel: string;
  objections: ObjectionGrade[];
  escalation: EscalationMoment[];
  talkRatio: TalkRatio;
  /** Judged against the stage's own close standard, not a universal one. */
  closeQuality: GradedDimension;
  /** Was this the right conversation for this point in the deal? */
  stageFit: GradedDimension;
  /** Did the rep use the pre-call brief, or burn discovery on answered questions? */
  researchUsage: GradedDimension | null;
  /** One paragraph, second person, written to the rep. */
  coaching: string;
  /**
   * 2–3 sentences from the prospect's point of view: what they remember and what the rep
   * promised. Injected into the next call in a campaign.
   */
  prospectMemory: string;
  /**
   * Headline grade. The mean of graded objections, capped at ESCALATION_FAILURE_CAP when
   * the rep bluffed something that needed escalating.
   */
  overallGrade: number | null;
  /** The uncapped mean, so the scorecard can show its working rather than just a number. */
  rawOverallGrade: number | null;
  /** True if any escalation trap was answered from memory. Blocks advancing. */
  failedEscalation: boolean;
  durationSeconds: number;
}
