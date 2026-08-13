/** Shared types for the transcript and the scorecard. */

import type { ModeId, Segment, Verdict } from '@/lib/modes';
import type { Source } from '@/lib/sources';
import type { StageId } from '@/lib/stages';

export type Speaker = 'rep' | 'prospect';

export interface TranscriptTurn {
  speaker: Speaker;
  text: string;
}

/**
 * What the rep should have said, for anything they did not win.
 *
 * Sources are resolved from lib/sources.ts by id, so a coaching note can never link to a
 * page that does not exist.
 */
export interface Remediation {
  whatWouldHaveWon: string;
  sources: Source[];
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
  /** Present only where the rep did not win it. */
  remediation?: Remediation | null;
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

/** SDR mode only. Whether the rep left the call actually knowing anything. */
export interface QualificationScore {
  criteria: {
    id: string;
    label: string;
    established: boolean;
    note: string;
  }[];
  /** What the rep concluded, as far as the transcript shows. */
  repVerdict: Verdict | 'none';
  correctVerdict: Verdict;
  verdictCorrect: boolean;
  repSegment: Segment | 'none';
  correctSegment: Segment;
  segmentCorrect: boolean;
  /** Did they qualify on the use case, or on the logo? */
  reputationTrap: {
    avoided: boolean;
    note: string;
  };
  /** Why the correct verdict is correct. Shown after the fact. */
  rationale: string;
}

export interface Scorecard {
  personaId: string;
  personaName: string;
  mode: ModeId;
  stage: StageId;
  stageLabel: string;
  objections: ObjectionGrade[];
  escalation: EscalationMoment[];
  talkRatio: TalkRatio;
  /** Judged against the stage's own close standard, not a universal one. */
  closeQuality: GradedDimension;
  /** Was this the right conversation for this point in the deal? AE mode only. */
  stageFit: GradedDimension | null;
  /** Did the rep use the pre-call brief, or burn discovery on answered questions? */
  researchUsage: GradedDimension | null;
  /** SDR mode only. */
  qualification: QualificationScore | null;
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
