/**
 * Two jobs, two different skills.
 *
 * AE mode works a deal across five stages. SDR mode is one call with one question:
 * is this lead real?
 *
 * The SDR failure this trains is specific and, per LiveKit's own commercial team, common:
 * inbound leads arrive through "talk to sales" and get qualified on reputation (a big raise,
 * a name you recognise) rather than on whether they are actually running voice agents at
 * volume. A logo is not a use case.
 */

export type ModeId = 'ae' | 'sdr';

export interface Mode {
  id: ModeId;
  label: string;
  blurb: string;
  /** Shown on the mode toggle. */
  role: string;
}

export const MODES: Mode[] = [
  {
    id: 'ae',
    label: 'AE',
    role: 'Work the cycle',
    blurb:
      'Five stages from first call to signature. The prospect remembers every conversation, so anything you promised in stage two comes back in stage four.',
  },
  {
    id: 'sdr',
    label: 'SDR',
    role: 'Qualify the lead',
    blurb:
      'One inbound call, one question: is this real? Establish the use case, the timeline, the volume and the headcount, then make a call. Impressive is not the same as qualified.',
  },
];

export function getMode(id: string | null | undefined): Mode {
  return MODES.find((m) => m.id === id) ?? MODES[0];
}

// ---------------------------------------------------------------------------
// Qualification model
// ---------------------------------------------------------------------------

/** LiveKit splits the field at a thousand employees. */
export const ENTERPRISE_HEADCOUNT = 1000;

/**
 * Self-serve tops out at the Scale plan (about 50,000 agent session minutes a month and
 * up to 600 concurrent sessions). Below that a prospect can swipe a card and never speak
 * to anyone, so routing them to sales wastes two people's time.
 */
export const SELF_SERVE_CEILING_MINUTES = 50_000;

export type Verdict = 'qualify' | 'self-serve' | 'disqualify';
export type Segment = 'Commercial' | 'Enterprise' | 'None';

export const VERDICT_LABEL: Record<Verdict, string> = {
  qualify: 'Qualified, pass to an AE',
  'self-serve': 'Real, but self-serve',
  disqualify: 'Not qualified',
};

export interface Qualification {
  /** Headcount decides Commercial vs Enterprise, nothing else does. */
  employees: number;
  /** Are they actually building or running a voice agent right now? */
  hasVoiceUseCase: boolean;
  /** Plain-language timeline. "Live today", "launching in six weeks", "someday". */
  timeline: string;
  /** Expected monthly agent minutes, or null when they genuinely have no idea. */
  monthlyMinutes: number | null;
  correctVerdict: Verdict;
  correctSegment: Segment;
  /** Why that is the right call, shown on the scorecard after the fact. */
  rationale: string;
  /**
   * The impressive-sounding fact that tempts an SDR to qualify on reputation. This is the
   * trap, and the whole reason SDR mode exists.
   */
  reputationBait: string;
}

export function segmentFor(employees: number): Segment {
  return employees >= ENTERPRISE_HEADCOUNT ? 'Enterprise' : 'Commercial';
}

/**
 * The four facts an SDR has to leave the call with. Anything less and they are guessing,
 * however good the call felt.
 */
export const QUALIFICATION_CRITERIA = [
  {
    id: 'useCase',
    label: 'Use case',
    question: 'Are they actually building or running a voice agent, or just curious?',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    question: 'Is it live or launching imminently, or is it a someday project?',
  },
  {
    id: 'volume',
    label: 'Volume',
    question: `Did they get a number, and does it clear self-serve (about ${SELF_SERVE_CEILING_MINUTES.toLocaleString()} minutes a month)?`,
  },
  {
    id: 'segment',
    label: 'Headcount',
    question: `Did they establish company size and route it right (${ENTERPRISE_HEADCOUNT.toLocaleString()}+ is Enterprise)?`,
  },
] as const;

export type QualificationCriterionId = (typeof QUALIFICATION_CRITERIA)[number]['id'];
