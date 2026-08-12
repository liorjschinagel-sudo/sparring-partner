/**
 * Compiles pasted research into a playable, gradeable prospect.
 *
 * Inputs are a LinkedIn profile, CRM notes, free-text direction, or a Gong transcript, in
 * any combination. Output is a Brief: identity, pre-call cards, an ordered objection queue
 * with a grading criterion per objection, and a system prompt.
 *
 * The objection queue is the part that matters. Without it a custom prospect is just a
 * chat partner; with it the same scorecard that grades the built-in personas works
 * unchanged.
 *
 * STATELESS BY DESIGN. A Gong transcript is real customer speech, usually naming a real
 * person, often under NDA. This route reads the body, makes one model call, returns the
 * result, and keeps nothing. The transcript is never logged, never stored, and never
 * reaches the agent — only the compiled Brief does.
 */

import { NextResponse } from 'next/server';
import { chatCompletion, extractJson } from '@/lib/inference';
import type { CompiledProspect } from '@/lib/customProspects';

export const maxDuration = 60;

const COMPILER_MODEL = 'openai/gpt-4.1';

// Generous enough for a long discovery call, bounded so one paste cannot blow the context.
const MAX_INPUT_CHARS = 60_000;

/** A prospect where half the queue must be escalated trains the wrong reflex. */
const MAX_ESCALATION_TRAPS = 2;

// Inworld voices LiveKit documents by name. The compiler picks one that suits the person.
const VOICES = ['Ashley', 'Edward', 'Olivia', 'Diego'] as const;
const ACCENTS: Record<string, string> = {
  Easy: '#4ade80',
  Medium: '#fbbf24',
  Hard: '#f87171',
};

interface CompileRequest {
  linkedin?: string;
  crm?: string;
  freeText?: string;
  gongTranscript?: string;
}

function buildPrompt(input: CompileRequest): string {
  const isGong = Boolean(input.gongTranscript?.trim());

  const sources = [
    input.linkedin?.trim() && `## LinkedIn profile\n\n${input.linkedin.trim()}`,
    input.crm?.trim() && `## CRM / account notes\n\n${input.crm.trim()}`,
    input.freeText?.trim() && `## Direction from the rep\n\n${input.freeText.trim()}`,
    input.gongTranscript?.trim() && `## Recorded call transcript\n\n${input.gongTranscript.trim()}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const gongGuidance = isGong
    ? `
This includes a transcript of a REAL call that already happened. Your job is to build the
prospect for the FOLLOW-UP conversation. Specifically:

- Extract what this person actually objected to, in their own words and their own manner.
- Extract what the rep promised and has presumably not yet delivered.
- Extract what was left unresolved when the call ended.
- Set "openingPosture" and the persona's opening so the follow-up call OPENS on the biggest
  unresolved thing. Do not have them re-introduce themselves; they have met.
- Match their speech patterns: how blunt they are, how much they interrupt, what they say
  when they are unconvinced.
- Objections should be the ones they actually raised, plus the natural next ones given how
  the call ended.
`
    : `
Build a prospect from the research provided. Where the research is thin, invent details that
are plausible and internally consistent, and keep them consistent between the cards and the
system prompt.
`;

  return `You are compiling a sales role-play prospect for an AE training tool. The rep sells
LiveKit, a WebRTC infrastructure and voice-AI agents platform. The prospect is the buyer.

${gongGuidance}

# Source material

${sources}

# What makes a good prospect here

- They resist. Concessions are earned by accurate, specific, checkable answers, never by
  confidence or rapport.
- They raise objections ORGANICALLY, one at a time, as openings appear. They never recite a list.
- They hold at least one important fact back, so the rep has to run real discovery to find it.

# Escalation traps: tag these precisely

Exactly ONE or TWO objections should be marked "escalationTrap": true. An objection qualifies
only if BOTH of these are true:

1. Answering it correctly needs a specific fact a rep could not reliably hold in their head
   (a measured latency figure under this customer's workload, a certification status, where
   data physically sits, an encryption or tenancy detail, a contractual SLA number).
2. Being wrong creates real commercial, legal or security exposure — the kind that surfaces
   later, in writing, in front of somebody who checks.

The correct rep behaviour for these is to decline to guess and commit to bringing the right
person by a specific date. Answering from memory is a failure EVEN IF the answer is right.

These are NOT escalation traps, and must be tagged false. They are objections the rep is
supposed to handle themselves, on the spot:

- Trust and accountability ("you never sent what you promised", "why should I believe you")
- Price, discounting, and budget pushback
- Competitor comparisons and "why not just build it ourselves"
- Product philosophy, positioning, or "what makes you different"
- Anything answerable from public documentation or the rep's own product knowledge

Tagging one of these as a trap teaches the rep to escalate things they should own, which is
the opposite of the lesson.

# Output

Return ONLY a JSON object, no markdown fence, matching exactly:

{
  "name": "<full name>",
  "title": "<job title>",
  "company": "<company name and a short qualifier, e.g. 'Northwind Logistics · late-stage'>",
  "difficulty": "<Easy | Medium | Hard>",
  "voice": "<one of: ${VOICES.join(', ')} — pick one that suits how this person speaks>",
  "scoutingReport": "<one sentence a rep reads before dialling: how this person behaves>",
  "openingPosture": "<one sentence: where their head is at when the call starts>",
  "brief": {
    "company": [{"label": "<short label>", "value": "<fact>"}],
    "person":  [{"label": "<short label>", "value": "<fact>"}],
    "deal":    [{"label": "<short label>", "value": "<fact>"}],
    "hooks":   ["<something the rep should DO with this research>"]
  },
  "objections": [
    {
      "id": "<short id like 'o1'>",
      "label": "<the objection as this person would say it>",
      "strongAnswer": "<what a 5-out-of-5 answer looks like, specifically>",
      "escalationTrap": <true only if BOTH tests above pass. One or two per prospect, never more>
    }
  ],
  "systemPrompt": "<the full second-person system prompt that makes the model BE this person>"
}

Rules for the fields:
- 4 to 6 objections, ordered as they would naturally surface.
- Each "brief" array gets 3 to 5 facts. Facts must be things RESEARCH would reveal. Do NOT
  put the withheld fact in the brief — that is what discovery is for.
- "systemPrompt" is the substantial one. Write it in second person ("You are..."), covering:
  identity and company, temperament and speech patterns, how they open the call, the ordered
  objection queue with instructions to raise them organically, what specifically softens them,
  what they hold back and what would make them reveal it, and their win condition. It should
  read like a character brief, not a summary. Aim for 500 to 900 words.
- Do NOT include voice-channel or anti-AI-disclosure rules in the systemPrompt. Those are
  added separately.`;
}

export async function POST(request: Request) {
  let body: CompileRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const combinedLength = [body.linkedin, body.crm, body.freeText, body.gongTranscript]
    .filter(Boolean)
    .join('').length;

  if (combinedLength === 0) {
    return NextResponse.json(
      { error: 'Give the compiler something to work with: a profile, notes, a transcript, or a description.' },
      { status: 400 }
    );
  }

  if (combinedLength > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: `That is a lot of text (${combinedLength.toLocaleString()} characters). Trim it to about 60,000 and try again.` },
      { status: 413 }
    );
  }

  let parsed: Omit<CompiledProspect, 'accent' | 'source'>;
  try {
    const raw = await chatCompletion(
      [
        {
          role: 'system',
          content:
            'You build sales role-play characters. You return only valid JSON. The characters ' +
            'you build resist salespeople and concede only to substance.',
        },
        { role: 'user', content: buildPrompt(body) },
      ],
      { model: COMPILER_MODEL, temperature: 0.7, maxTokens: 4000 }
    );
    parsed = extractJson(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: `Could not build that prospect: ${message}` }, { status: 502 });
  }

  // Normalise anything the model got loose with, rather than trusting it blindly.
  const difficulty = ['Easy', 'Medium', 'Hard'].includes(parsed.difficulty)
    ? parsed.difficulty
    : 'Medium';

  const compiled: CompiledProspect = {
    source: body.gongTranscript?.trim() ? 'gong' : 'research',
    name: parsed.name?.slice(0, 80) || 'Unnamed Prospect',
    title: parsed.title?.slice(0, 120) || '',
    company: parsed.company?.slice(0, 120) || '',
    difficulty,
    accent: ACCENTS[difficulty] ?? '#fbbf24',
    voice: VOICES.includes(parsed.voice as (typeof VOICES)[number]) ? parsed.voice : 'Ashley',
    scoutingReport: parsed.scoutingReport ?? '',
    openingPosture: parsed.openingPosture ?? '',
    brief: {
      company: parsed.brief?.company ?? [],
      person: parsed.brief?.person ?? [],
      deal: parsed.brief?.deal ?? [],
      hooks: parsed.brief?.hooks ?? [],
    },
    // Defensive cap on traps. The prompt asks for one or two; a model that tags four has
    // misunderstood the definition, and a prospect where everything must be escalated
    // teaches the rep to escalate things they should own.
    objections: (() => {
      let traps = 0;
      return (parsed.objections ?? []).map((o, i) => {
        const isTrap = Boolean(o.escalationTrap) && traps < MAX_ESCALATION_TRAPS;
        if (isTrap) traps += 1;
        return {
          id: o.id || `o${i + 1}`,
          label: o.label,
          strongAnswer: o.strongAnswer,
          escalationTrap: isTrap,
        };
      });
    })(),
    systemPrompt: parsed.systemPrompt ?? '',
  };

  if (!compiled.systemPrompt || compiled.objections.length === 0) {
    return NextResponse.json(
      { error: 'The compiler returned an incomplete prospect. Try again, or add more detail.' },
      { status: 502 }
    );
  }

  return NextResponse.json(compiled, { headers: { 'Cache-Control': 'no-store' } });
}
