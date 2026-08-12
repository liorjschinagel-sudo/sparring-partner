/**
 * Grades a sparring session transcript against rubric.md.
 *
 * Split of responsibilities, on purpose:
 *   - Talk/listen ratio is computed here, in code. It is arithmetic, and a language
 *     model asked for a percentage will happily round it into whatever supports the
 *     narrative it just wrote.
 *   - Everything requiring judgement is one LLM call, given the objection queue for this
 *     persona AND this stage, plus the rubric's anchors and known biases.
 *
 * Works identically for built-in personas and runtime-authored ones: the caller supplies
 * the objection queue, so the grader never needs to know where the prospect came from.
 */

import { NextResponse } from 'next/server';
import { ESCALATION_FAILURE_CAP } from '@/lib/campaign';
import { chatCompletion, extractJson } from '@/lib/inference';
import { getPersona, type Objection, type PersonaBrief } from '@/lib/personas';
import { getStage } from '@/lib/stages';
import type { Scorecard, TalkRatio, TranscriptTurn } from '@/lib/types';

export const maxDuration = 60;

const GRADER_MODEL = 'openai/gpt-4.1';

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Rubric bands, applied to the rep's share of total words. */
function readTalkRatio(pct: number): string {
  if (pct < 40) return 'Excellent — the prospect did most of the talking.';
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
  stage?: string;
  turns: TranscriptTurn[];
  durationSeconds: number;
  /** Supplied for custom prospects; built-ins resolve from the repo. */
  objections?: Objection[];
  brief?: PersonaBrief | null;
}

type ModelOutput = {
  objections: { id: string; raised: boolean; addressed: boolean; grade: number | null; note: string }[];
  escalation: { trigger: string; handled: boolean; note: string }[];
  closeQuality: { grade: number | null; note: string };
  stageFit: { grade: number | null; note: string };
  researchUsage?: { grade: number | null; note: string };
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

  const stage = getStage(body.stage);
  const builtIn = getPersona(body.personaId ?? '');

  // Built-ins resolve their queue from the repo; custom prospects bring their own.
  const personaObjections: Objection[] = builtIn?.objections ?? body.objections ?? [];
  const brief = builtIn?.brief ?? body.brief ?? null;
  const personaName = builtIn?.name ?? body.personaName ?? 'the prospect';

  if (personaObjections.length === 0) {
    return NextResponse.json(
      { error: 'No objection queue for this prospect, so there is nothing to grade against.' },
      { status: 400 }
    );
  }

  // Stage objections are graded alongside the persona's own, and flagged in the UI.
  const stageObjections: Objection[] = stage.stageObjections;
  const allObjections = [
    ...personaObjections.map((o) => ({ ...o, fromStage: false })),
    ...stageObjections.map((o) => ({ ...o, fromStage: true })),
  ];

  const turns = Array.isArray(body.turns) ? body.turns.filter((t) => t?.text?.trim()) : [];
  const talkRatio = computeTalkRatio(turns);

  // A call with almost nothing in it produces a confidently wrong scorecard, which is
  // worse for a training tool than an honest refusal to grade.
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
        `  Objection: ${o.label}\n` +
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

  const transcript = turns
    .map((t) => `${t.speaker === 'rep' ? 'REP' : personaName.toUpperCase()}: ${t.text}`)
    .join('\n');

  const prompt = `You are grading a sales rep's objection-handling practice call. The rep works
for LiveKit. The prospect is ${personaName}.

# Where this call sits in the deal

Stage: ${stage.label} (${stage.order} of 5). ${stage.summary}
The rep's objective was: ${stage.objective}
A 5 on the close here means: ${stage.closeStandard}
${briefBlock}
# The objection queue

${objectionBlock}

# Grading scale (1-5, per objection)

5 = Advances the deal. Handles the objection AND moves forward: concedes what is true,
    differentiates on something checkable, lands a specific next step.
4 = Solid. Accurate and credible, addresses the real concern. Missing only the step that
    would convert it into momentum.
3 = Survivable. Not wrong, but generic. Neither gains nor loses ground.
2 = Weak. Dodges, changes the subject, or answers a different question.
1 = Damaging. Invents facts, trash-talks a competitor, argues, or bluffs on something
    that needed escalation.

# Biases you must actively correct for

- Confidence is not competence. A fluent, warm rep who invented a latency figure scored a
  1 on that objection. Fluency must never lift a grade.
- Length is not substance. Long answers usually mean the rep is filling silence.
- Politeness is not conceding. "That's a great question" is not the same as granting that
  a competitor genuinely ships faster.
- Getting a next step is not passing. These prospects can be charmed by a rep who said
  nothing checkable. Grade substance, not outcome.
- Grade the floor, not the ceiling. A strong answer undermined by a bluff thirty seconds
  later is scored on the bluff.

# Escalation judgment

These must be escalated, never answered from memory:
1. Specific P50/P99 latency figures under the customer's workload
2. Compliance certifications, data residency, BAA/DPA specifics
3. Whether a specific custom integration or architecture is supported
4. Security review specifics (encryption at rest, tenancy isolation)
5. Contractual SLA and uptime guarantees

A rep who answers one of these from memory is a MISS even if the answer was factually
correct — the process is what is being trained. "I'll find out" is a partial miss;
committing a named role and a timeframe is a pass.

# Transcript

${transcript}

# Computed for you (do not recompute, do not contradict)

Rep spoke ${talkRatio.repSharePct}% of the words (${talkRatio.repWords} rep / ${talkRatio.prospectWords} prospect).

# Output

Return ONLY a JSON object, no markdown fence, matching exactly:

{
  "objections": [
    {
      "id": "<objection id from the queue above>",
      "raised": <boolean: did the prospect actually raise this?>,
      "addressed": <boolean: did the rep engage with it at all?>,
      "grade": <integer 1-5, or null if never raised>,
      "note": "<one sentence of coaching, written TO the rep, second person>"
    }
  ],
  "escalation": [
    { "trigger": "<what the prospect asked that required escalation>",
      "handled": <boolean>,
      "note": "<one sentence>" }
  ],
  "closeQuality": { "grade": <1-5 or null>, "note": "<one sentence, judged against THIS stage's close standard>" },
  "stageFit": { "grade": <1-5 or null>, "note": "<one sentence: was this the right conversation for ${stage.label}? Correct content at the wrong stage scores badly>" },
  ${brief ? `"researchUsage": { "grade": <1-5 or null>, "note": "<one sentence: did they use the brief, or ask what it already answered?>" },` : ''}
  "coaching": "<ONE paragraph, second person, written to the rep. Lead with the single
                highest-leverage change. Name one specific moment, quoting or closely
                paraphrasing what was actually said. Include one thing to keep doing.
                Do NOT re-list the per-objection grades. No praise inflation.>",
  "prospectMemory": "<2-3 sentences written FROM ${personaName}'s point of view, in their voice,
                as their own recollection of this call. What stuck with them, what the rep
                promised and has not delivered, what is still unresolved. This gets read back
                to them before the NEXT call, so be concrete about commitments. Do not
                evaluate the rep; just remember.>"
}

Include an entry in "objections" for every id in the queue, including ones never raised.
Include an entry in "escalation" only for triggers that actually came up in the call.`;

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
      { model: GRADER_MODEL, temperature: 0.2, maxTokens: 3000 }
    );
    parsed = extractJson<ModelOutput>(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: `Grading failed: ${message}` }, { status: 502 });
  }

  // Re-join the model's grades to our objection metadata rather than trusting it to
  // echo labels back correctly.
  const objections = allObjections.map((o) => {
    const graded = parsed.objections?.find((g) => String(g.id) === o.id);
    return {
      id: o.id,
      label: o.label,
      raised: Boolean(graded?.raised),
      addressed: Boolean(graded?.addressed),
      grade: typeof graded?.grade === 'number' ? graded.grade : null,
      note: graded?.note ?? 'Not reached in this call.',
      escalationTrap: Boolean(o.escalationTrap),
      fromStage: o.fromStage,
    };
  });

  const graded = objections.map((o) => o.grade).filter((g): g is number => typeof g === 'number');
  const rawOverallGrade =
    graded.length > 0
      ? Math.round((graded.reduce((a, b) => a + b, 0) / graded.length) * 10) / 10
      : null;

  // A bluffed trap is a hard fail regardless of the average, and it is what blocks the
  // deal from advancing. Derived here rather than trusted to the model.
  const failedEscalation =
    (parsed.escalation ?? []).some((e) => !e.handled) ||
    objections.some((o) => o.escalationTrap && o.raised && (o.grade ?? 5) <= 2);

  // Cap the headline number so it cannot disagree with the gate. A rep who averaged 4.2
  // and invented a compliance answer has not had a 4.2 call.
  const overallGrade =
    failedEscalation && rawOverallGrade !== null
      ? Math.min(rawOverallGrade, ESCALATION_FAILURE_CAP)
      : rawOverallGrade;

  const scorecard: Scorecard = {
    personaId: builtIn?.id ?? body.personaId ?? 'custom',
    personaName,
    stage: stage.id,
    stageLabel: stage.label,
    objections,
    escalation: Array.isArray(parsed.escalation) ? parsed.escalation : [],
    talkRatio,
    closeQuality: parsed.closeQuality ?? { grade: null, note: '' },
    stageFit: parsed.stageFit ?? { grade: null, note: '' },
    researchUsage: brief ? (parsed.researchUsage ?? { grade: null, note: '' }) : null,
    coaching: parsed.coaching ?? '',
    prospectMemory: parsed.prospectMemory ?? '',
    overallGrade,
    rawOverallGrade,
    failedEscalation,
    durationSeconds: Math.max(0, Math.round(body.durationSeconds ?? 0)),
  };

  return NextResponse.json(scorecard);
}
