/**
 * Grades a sparring session transcript against rubric.md.
 *
 * Split of responsibilities, on purpose:
 *   - Talk/listen ratio is computed here, in code. It is arithmetic, and a language
 *     model asked for a percentage will happily round it into whatever supports the
 *     narrative it just wrote.
 *   - Source links are resolved from lib/sources.ts by id. The model chooses ids from a
 *     fixed catalogue and never writes a URL, so remediation cannot cite a page that does
 *     not exist.
 *   - Everything else requiring judgement is one LLM call.
 *
 * Two modes. AE grades a stage of a deal. SDR grades one inbound qualification call, where
 * the failure being trained is qualifying on reputation instead of on a use case.
 */

import { NextResponse } from 'next/server';
import { ESCALATION_FAILURE_CAP } from '@/lib/campaign';
import { chatCompletion, extractJson, sanitizeMaybe, sanitizeProse } from '@/lib/inference';
import {
  QUALIFICATION_CRITERIA,
  SELF_SERVE_CEILING_MINUTES,
  ENTERPRISE_HEADCOUNT,
  type ModeId,
  type Segment,
  type Verdict,
} from '@/lib/modes';
import { getPersona, type Objection, type PersonaBrief } from '@/lib/personas';
import { SOURCE_IDS, resolveSources, sourceCatalogue } from '@/lib/sources';
import { getStage } from '@/lib/stages';
import type { QualificationScore, Scorecard, TalkRatio, TranscriptTurn } from '@/lib/types';

export const maxDuration = 60;

const GRADER_MODEL = 'openai/gpt-4.1';

/** Below this the rep did not win the objection, so they get remediation for it. */
const WON_THRESHOLD = 4;

function sanitizeDimension(dim: { grade: number | null; note: string } | undefined) {
  return { grade: dim?.grade ?? null, note: sanitizeMaybe(dim?.note) ?? '' };
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Rubric bands, applied to the rep's share of total words. */
function readTalkRatio(pct: number): string {
  if (pct < 40) return 'Excellent. The prospect did most of the talking.';
  if (pct <= 55) return 'Healthy balance for a discovery call.';
  if (pct <= 70) return 'Pitching more than listening. Common, and correctable.';
  return 'Presenting, not discovering. Objections never got room to surface.';
}

function computeTalkRatio(turns: TranscriptTurn[]): TalkRatio {
  const repWords = turns
    .filter((t) => t.speaker === 'rep')
    .reduce((sum, t) => sum + countWords(t.text), 0);
  const prospectWords = turns
    .filter((t) => t.speaker === 'prospect')
    .reduce((sum, t) => sum + countWords(t.text), 0);

  const total = repWords + prospectWords;
  const repSharePct = total === 0 ? 0 : Math.round((repWords / total) * 100);

  return { repWords, prospectWords, repSharePct, read: readTalkRatio(repSharePct) };
}

interface GradeRequest {
  personaId?: string;
  personaName?: string;
  mode?: ModeId;
  stage?: string;
  turns: TranscriptTurn[];
  durationSeconds: number;
  /** Supplied for custom prospects; built-ins resolve from the repo. */
  objections?: Objection[];
  brief?: PersonaBrief | null;
}

type ModelObjection = {
  id: string;
  raised: boolean;
  addressed: boolean;
  grade: number | null;
  note: string;
  whatWouldHaveWon?: string;
  sourceIds?: string[];
};

type ModelOutput = {
  objections: ModelObjection[];
  escalation: { trigger: string; handled: boolean; note: string }[];
  closeQuality: { grade: number | null; note: string };
  stageFit?: { grade: number | null; note: string };
  researchUsage?: { grade: number | null; note: string };
  qualification?: {
    criteria: { id: string; established: boolean; note: string }[];
    repVerdict: string;
    repSegment: string;
    reputationTrap: { avoided: boolean; note: string };
  };
  coaching: string;
  prospectMemory: string;
};

export async function POST(request: Request) {
  let body: GradeRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const builtIn = getPersona(body.personaId ?? '');
  const mode: ModeId = builtIn?.mode ?? body.mode ?? 'ae';
  const isSdr = mode === 'sdr';
  const stage = getStage(body.stage);

  const personaObjections: Objection[] = builtIn?.objections ?? body.objections ?? [];
  const brief = builtIn?.brief ?? body.brief ?? null;
  const personaName = builtIn?.name ?? body.personaName ?? 'the prospect';
  const qual = builtIn?.qualification ?? null;

  if (personaObjections.length === 0) {
    return NextResponse.json(
      { error: 'No objection queue for this prospect, so there is nothing to grade against.' },
      { status: 400 }
    );
  }

  // Stage objections only apply to AE mode; an SDR call is not a funnel stage.
  const allObjections = [
    ...personaObjections.map((o) => ({ ...o, fromStage: false })),
    ...(isSdr ? [] : stage.stageObjections.map((o) => ({ ...o, fromStage: true }))),
  ];

  const turns = Array.isArray(body.turns) ? body.turns.filter((t) => t?.text?.trim()) : [];
  const talkRatio = computeTalkRatio(turns);

  if (turns.filter((t) => t.speaker === 'rep').length < 2) {
    return NextResponse.json(
      { error: 'Not enough conversation to grade. Try a longer call.' },
      { status: 422 }
    );
  }

  const objectionBlock = allObjections
    .map(
      (o) =>
        `- id "${o.id}"${o.escalationTrap ? ' [ESCALATION TRAP]' : ''}${o.fromStage ? ' [STAGE]' : ''}\n` +
        `  They said: ${o.label}\n` +
        `  What a 5 looks like: ${o.strongAnswer}`
    )
    .join('\n');

  const briefBlock = brief
    ? `
# The pre-call brief the rep had

The rep could see all of this before dialling. Asking questions this already answers wastes
the call and should cost them on "researchUsage".

Company: ${brief.company.map((f) => `${f.label}: ${f.value}`).join(' | ')}
Person: ${brief.person.map((f) => `${f.label}: ${f.value}`).join(' | ')}
Deal: ${brief.deal.map((f) => `${f.label}: ${f.value}`).join(' | ')}
Hooks they were told to use: ${brief.hooks.join(' | ')}
`
    : '';

  const modeBlock = isSdr
    ? `
# What this call is

One inbound qualification call. The rep is an SDR. The only question is whether this lead is
real and where it should go.

The truth about this lead, which the rep had to uncover:
- Employees: ${qual?.employees.toLocaleString() ?? 'unknown'}
- Running or building a voice agent: ${qual?.hasVoiceUseCase ? 'yes' : 'no'}
- Timeline: ${qual?.timeline ?? 'unknown'}
- Monthly minutes: ${qual?.monthlyMinutes ? qual.monthlyMinutes.toLocaleString() : 'unknown / none given'}
- Correct verdict: ${qual?.correctVerdict ?? 'unknown'}
- Correct segment: ${qual?.correctSegment ?? 'None'}
- Why: ${qual?.rationale ?? ''}
- The reputation bait in this call: ${qual?.reputationBait ?? 'none'}

Qualification rules:
- Self-serve tops out around ${SELF_SERVE_CEILING_MINUTES.toLocaleString()} agent minutes a
  month. Below that, sending it to an AE wastes two people's time.
- ${ENTERPRISE_HEADCOUNT.toLocaleString()} employees or more is Enterprise. Under that is Commercial.
- A qualified lead is running voice agents today, or launching imminently, AT volume that
  clears self-serve. Funding, brand recognition and job titles are not qualification.

The failure being trained: qualifying on reputation instead of on the use case. If the rep
became warmer or more eager because of the funding, the company name or the title, that is a
reputation-trap failure even if they happened to reach the right verdict.
`
    : `
# Where this call sits in the deal

Stage: ${stage.label} (${stage.order} of 5). ${stage.summary}
The rep's objective was: ${stage.objective}
A 5 on the close here means: ${stage.closeStandard}
`;

  const transcript = turns
    .map((t) => `${t.speaker === 'rep' ? 'REP' : personaName.toUpperCase()}: ${t.text}`)
    .join('\n');

  const qualificationOutput = isSdr
    ? `
  "qualification": {
    "criteria": [
${QUALIFICATION_CRITERIA.map(
  (c) => `      { "id": "${c.id}", "established": <boolean: did the rep actually establish this on the call?>, "note": "<one sentence>" }`
).join(',\n')}
    ],
    "repVerdict": "<qualify | self-serve | disqualify | none — what the REP concluded, or none if they never landed one>",
    "repSegment": "<Commercial | Enterprise | None — how the REP routed it, or None if they never said>",
    "reputationTrap": { "avoided": <boolean: did they resist qualifying on funding, brand or title?>, "note": "<one sentence>" }
  },`
    : `
  "stageFit": { "grade": <1-5 or null>, "note": "<one sentence: was this the right conversation for ${stage.label}? Correct content at the wrong stage scores badly>" },`;

  const prompt = `You are grading a sales call from a training tool. The rep works for LiveKit,
a WebRTC infrastructure and voice-AI platform. The prospect is ${personaName}.
${modeBlock}${briefBlock}
# The queue

${objectionBlock}

# Grading scale (1-5, per item)

5 = Advances things. Handles it AND moves forward: concedes what is true, is specific and
    checkable, lands a concrete next step.
4 = Solid. Accurate and credible, addresses the real concern.
3 = Survivable. Not wrong, but generic. Neither gains nor loses ground.
2 = Weak. Dodges, changes the subject, or answers a different question.
1 = Damaging. Invents facts, trash-talks a competitor, argues, or bluffs on something that
    needed escalation.

# Biases you must actively correct for

- Confidence is not competence. A fluent, warm rep who invented a figure scored a 1 on that
  item. Fluency must never lift a grade.
- Length is not substance. Long answers usually mean the rep is filling silence.
- Politeness is not conceding.
- A good outcome is not a good call. These prospects can be charmed by a rep who said nothing
  checkable. Grade substance.
- Grade the floor, not the ceiling. A strong answer undermined by a bluff thirty seconds later
  is scored on the bluff.

# Escalation judgment

These must be escalated, never answered from memory: specific latency figures under the
customer's workload; compliance certifications; data residency and retention; security
specifics; contractual SLAs. Answering from memory is a MISS even if the answer was correct.
"I'll find out" is a partial miss; a named role and a date is a pass.

# Remediation sources

For any item the rep did NOT win (grade below ${WON_THRESHOLD}, or raised but not addressed),
write "whatWouldHaveWon": two or three sentences telling them specifically what to say next
time. Be concrete enough to rehearse.

Then pick 1 to 2 "sourceIds" from this catalogue so they can read further. Use ONLY these ids.
If nothing fits, return an empty array. Never invent an id or a URL.

${sourceCatalogue()}

# Transcript

${transcript}

# Computed for you (do not recompute, do not contradict)

Rep spoke ${talkRatio.repSharePct}% of the words (${talkRatio.repWords} rep / ${talkRatio.prospectWords} prospect).

# Style for everything you write

Plain, direct sentences. Never use em dashes or en dashes; use a comma, a period, a colon or
brackets instead. No filler ("it's worth noting", "at the end of the day"). Do not define
things by what they are not ("it's not X, it's Y"); say the thing directly.

# Output

Return ONLY a JSON object, no markdown fence:

{
  "objections": [
    {
      "id": "<id from the queue above>",
      "raised": <boolean>,
      "addressed": <boolean>,
      "grade": <integer 1-5, or null if never raised>,
      "note": "<one sentence of coaching, written TO the rep, second person>",
      "whatWouldHaveWon": "<2-3 sentences. ONLY for items scored below ${WON_THRESHOLD} or raised-but-unaddressed. Omit otherwise>",
      "sourceIds": ["<ids from the catalogue, 1-2, only alongside whatWouldHaveWon>"]
    }
  ],
  "escalation": [
    { "trigger": "<what they asked>", "handled": <boolean>, "note": "<one sentence>" }
  ],
  "closeQuality": { "grade": <1-5 or null>, "note": "<one sentence>" },${qualificationOutput}
  ${brief ? `"researchUsage": { "grade": <1-5 or null>, "note": "<one sentence: did they use the brief, or ask what it already answered?>" },` : ''}
  "coaching": "<ONE paragraph, second person, to the rep. Lead with the single highest-leverage
                change. Name one specific moment, quoting or closely paraphrasing what was
                actually said. Include one thing to keep doing. Do NOT re-list the grades.>",
  "prospectMemory": "<2-3 sentences from ${personaName}'s point of view, in their voice, as their
                own recollection. What stuck, what the rep promised, what is unresolved.>"
}

Include an entry in "objections" for every id in the queue, including ones never raised.`;

  let parsed: ModelOutput;
  try {
    const raw = await chatCompletion(
      [
        {
          role: 'system',
          content:
            'You are a precise, unsentimental sales coach. You return only valid JSON. ' +
            'You are harder on bluffing than on ignorance.',
        },
        { role: 'user', content: prompt },
      ],
      { model: GRADER_MODEL, temperature: 0.2, maxTokens: 4000 }
    );
    parsed = extractJson<ModelOutput>(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: `Grading failed: ${message}` }, { status: 502 });
  }

  // Re-join to our own metadata rather than trusting the model to echo it back.
  const objections = allObjections.map((o) => {
    const graded = parsed.objections?.find((g) => String(g.id) === o.id);
    const grade = typeof graded?.grade === 'number' ? graded.grade : null;
    const raised = Boolean(graded?.raised);
    const addressed = Boolean(graded?.addressed);

    const needsRemediation = raised && (grade === null || grade < WON_THRESHOLD || !addressed);
    const text = graded?.whatWouldHaveWon?.trim();

    // Curated sources win; otherwise take the model's picks, validated against the registry.
    const ids = (o.sources?.length ? o.sources : (graded?.sourceIds ?? [])).filter((id) =>
      SOURCE_IDS.includes(id)
    );

    return {
      id: o.id,
      label: o.label,
      raised,
      addressed,
      grade,
      note: sanitizeMaybe(graded?.note) ?? 'Not reached in this call.',
      escalationTrap: Boolean(o.escalationTrap),
      fromStage: o.fromStage,
      remediation:
        needsRemediation && text
          ? { whatWouldHaveWon: sanitizeProse(text), sources: resolveSources(ids) }
          : null,
    };
  });

  const graded = objections.map((o) => o.grade).filter((g): g is number => typeof g === 'number');
  const rawOverallGrade =
    graded.length > 0
      ? Math.round((graded.reduce((a, b) => a + b, 0) / graded.length) * 10) / 10
      : null;

  const failedEscalation =
    (parsed.escalation ?? []).some((e) => !e.handled) ||
    objections.some((o) => o.escalationTrap && o.raised && (o.grade ?? 5) <= 2);

  // Cap the headline number so it cannot disagree with the gate.
  const overallGrade =
    failedEscalation && rawOverallGrade !== null
      ? Math.min(rawOverallGrade, ESCALATION_FAILURE_CAP)
      : rawOverallGrade;

  let qualification: QualificationScore | null = null;
  if (isSdr && qual) {
    const q = parsed.qualification;
    const repVerdict = (['qualify', 'self-serve', 'disqualify'] as const).includes(
      q?.repVerdict as Verdict
    )
      ? (q!.repVerdict as Verdict)
      : 'none';
    const repSegment = (['Commercial', 'Enterprise', 'None'] as const).includes(
      q?.repSegment as Segment
    )
      ? (q!.repSegment as Segment)
      : 'none';

    qualification = {
      criteria: QUALIFICATION_CRITERIA.map((c) => {
        const found = q?.criteria?.find((x) => x.id === c.id);
        return {
          id: c.id,
          label: c.label,
          established: Boolean(found?.established),
          note: sanitizeMaybe(found?.note) ?? 'Never established on the call.',
        };
      }),
      repVerdict,
      correctVerdict: qual.correctVerdict,
      verdictCorrect: repVerdict === qual.correctVerdict,
      repSegment,
      correctSegment: qual.correctSegment,
      segmentCorrect: repSegment === qual.correctSegment,
      reputationTrap: {
        avoided: Boolean(q?.reputationTrap?.avoided),
        note: sanitizeMaybe(q?.reputationTrap?.note) ?? '',
      },
      rationale: qual.rationale,
    };
  }

  const scorecard: Scorecard = {
    personaId: builtIn?.id ?? body.personaId ?? 'custom',
    personaName,
    mode,
    stage: stage.id,
    stageLabel: isSdr ? 'Qualification' : stage.label,
    objections,
    escalation: (Array.isArray(parsed.escalation) ? parsed.escalation : []).map((e) => ({
      ...e,
      note: sanitizeMaybe(e.note) ?? '',
    })),
    talkRatio,
    closeQuality: sanitizeDimension(parsed.closeQuality),
    stageFit: isSdr ? null : sanitizeDimension(parsed.stageFit),
    researchUsage: brief ? sanitizeDimension(parsed.researchUsage) : null,
    qualification,
    coaching: sanitizeMaybe(parsed.coaching) ?? '',
    prospectMemory: sanitizeMaybe(parsed.prospectMemory) ?? '',
    overallGrade,
    rawOverallGrade,
    failedEscalation,
    durationSeconds: Math.max(0, Math.round(body.durationSeconds ?? 0)),
  };

  return NextResponse.json(scorecard);
}
