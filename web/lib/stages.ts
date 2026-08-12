/**
 * Funnel stages.
 *
 * v1 only ever simulated a first call. Deals do not die on first calls, they die on the
 * third one, so each stage here changes the prospect's posture, the objections that
 * surface, and what a good close actually is.
 *
 * The `agentInstructions` string is appended to the persona prompt at dispatch time. It
 * deliberately does not restate the persona's character; it only says where in the deal
 * this conversation sits.
 */

export type StageId = 'discovery' | 'technical' | 'business-case' | 'procurement' | 'commit';

export interface Stage {
  id: StageId;
  order: number;
  label: string;
  /** One line for the picker. */
  summary: string;
  /** What the rep is trying to walk away with. */
  objective: string;
  /** Stage-specific instructions appended to the persona prompt. */
  agentInstructions: string;
  /** What a 5 on closeQuality means here. Fed to the grader. */
  closeStandard: string;
  /** Extra objections the grader watches for at this stage, on top of the persona's queue. */
  stageObjections: { id: string; label: string; strongAnswer: string; escalationTrap?: boolean }[];
}

export const STAGES: Stage[] = [
  {
    id: 'discovery',
    order: 1,
    label: 'Discovery',
    summary: 'First real conversation. They are deciding whether you are worth a second one.',
    objective: 'Understand the problem and earn a technical next step with the right people on it.',
    agentInstructions: `
# Where this call sits

This is your FIRST substantive call with this rep. You have not met them before. You are
guarded, you protect your time, and you are deciding whether this is worth a second call.

- Do not volunteer your full situation. Make them ask.
- Do not agree to anything beyond a next meeting, and only if they earn it.
- Budget, procurement and contract questions are premature. If the rep goes there, tell them
  it is early and redirect.
`.trim(),
    closeStandard:
      'A specific, scheduled next step with named roles attached (for example a technical call with a solutions engineer and their infra lead). "I will send materials" is a 2.',
    stageObjections: [
      {
        id: 's1.a',
        label: 'Why should I give you another meeting?',
        strongAnswer:
          'Ties the next step to something the prospect said they cared about, names who should be on it and why, and proposes a specific time rather than "sometime next week".',
      },
    ],
  },
  {
    id: 'technical',
    order: 2,
    label: 'Technical evaluation',
    summary: 'They are testing the architecture. This is where bluffing gets caught.',
    objective: 'Survive scrutiny, escalate what you should, and agree a scoped proof of concept.',
    agentInstructions: `
# Where this call sits

You already had a first call with this rep and agreed to go deeper. You have since read the
docs and possibly tried the product. You are engaged but rigorous.

- Open by referencing the previous call, not by re-introducing yourself.
- Bring specific architecture questions: failure modes, scaling, observability, data flow.
- You expect an engineer or solutions architect to be involved. If the rep is alone and
  answering deep technical questions themselves, probe harder until they either escalate or
  bluff.
- Pricing is not the topic today. If they lead with discounts, say so.
`.trim(),
    closeStandard:
      'A scoped proof of concept with a success criterion the prospect agreed to out loud, plus whatever technical follow-up was promised, with an owner.',
    stageObjections: [
      {
        id: 's2.a',
        label: 'What happens when this fails in production at 3am?',
        strongAnswer:
          'Talks about managed dispatch, health monitoring, failover and reconnection concretely, does not pretend nothing fails, and offers to walk the failure modes with an SA.',
        escalationTrap: true,
      },
      {
        id: 's2.b',
        label: 'Walk me through what a proof of concept actually looks like.',
        strongAnswer:
          'Proposes a narrow, time-boxed POC with a written success criterion and named owners on both sides, rather than an open-ended trial.',
      },
    ],
  },
  {
    id: 'business-case',
    order: 3,
    label: 'Business case',
    summary: 'The tech works. Now they need to justify it internally.',
    objective: 'Quantify value, multi-thread, and arm your champion for a conversation you will not be in.',
    agentInstructions: `
# Where this call sits

The technical evaluation went well enough. You now have to sell this internally, and you are
not certain you can. You are friendlier than before but under pressure from your own org.

- Talk about internal obstacles: a CFO who wants a payback period, a competing priority, a
  peer who prefers building.
- Ask for things that help you sell it: numbers, a reference customer, a one-pager.
- If the rep cannot help you make the internal case, you stall. Say so rather than going quiet.
- Push back on soft value claims. You need something you can put in a slide.
`.trim(),
    closeStandard:
      'The rep gives the champion something usable internally (a quantified case, a reference, a one-pager) AND gets access to at least one more stakeholder. Both, or it is a 3.',
    stageObjections: [
      {
        id: 's3.a',
        label: 'My CFO will ask for a payback period. What do I tell them?',
        strongAnswer:
          'Builds a defensible number from the prospect\'s own figures rather than a generic ROI claim, and is explicit about which inputs are assumptions.',
      },
      {
        id: 's3.b',
        label: 'I need to bring my Head of Support along. What do I tell them?',
        strongAnswer:
          'Reframes the value for that specific stakeholder rather than repeating the engineering pitch, and asks to be in the room rather than handing over a document blind.',
      },
    ],
  },
  {
    id: 'procurement',
    order: 4,
    label: 'Procurement',
    summary: 'Price, security review, legal, data residency. Adversarial by design.',
    objective: 'Hold value under pressure, route compliance correctly, and keep the deal moving.',
    agentInstructions: `
# Where this call sits

The deal is real and now it is going through procurement. Your tone shifts: more transactional,
less collaborative. You are being measured on what you extract.

- Push hard on price. Ask for a discount early and more than once.
- Raise security review, data residency, SLA and contract terms.
- Mention a competing quote, whether or not it is real.
- If the rep discounts immediately without asking for anything back, note it silently and push
  for more. Reps who cave get squeezed.
- Compliance and contractual specifics must be escalated. If they improvise, press for detail.
`.trim(),
    closeStandard:
      'Any concession is traded for something (timeline, term length, a reference, an exec meeting), compliance questions are routed to the right owner with a date, and the next step has a deadline.',
    stageObjections: [
      {
        id: 's4.a',
        label: 'I need fifteen percent off or this does not get approved.',
        strongAnswer:
          'Does not cave and does not refuse flatly. Trades: asks what they can give in return (longer term, faster signature, reference, case study) and holds the value framing.',
      },
      {
        id: 's4.b',
        label: 'Our security team needs your SOC 2 report and a DPA. Where is your data stored?',
        strongAnswer:
          'ESCALATION TRAP. Does not improvise compliance or data residency specifics. States only what is genuinely known, commits to the right owner and a date.',
        escalationTrap: true,
      },
    ],
  },
  {
    id: 'commit',
    order: 5,
    label: 'Commit',
    summary: 'They want to buy. Something keeps slipping.',
    objective: 'Get a mutual action plan, a named signer, and a date.',
    agentInstructions: `
# Where this call sits

You intend to buy. You are not saying no. But something keeps slipping and you are vague about
what. The real blocker is internal and you will only surface it if the rep asks well.

- Be agreeable and non-committal. Say things like "yes, we are aligned, it is just timing".
- Do NOT volunteer the real blocker. Surface it only if the rep asks a direct, well-aimed
  question about what specifically is in the way.
- If the rep accepts a vague "next week" without pinning anything down, let them, and the deal
  slips again. That is the lesson.
- If they propose a concrete plan with dates and owners, engage with it seriously.
`.trim(),
    closeStandard:
      'A written mutual action plan: named signer, the remaining steps, and dates the prospect said out loud. Anything vaguer is a 2, however warm the call felt.',
    stageObjections: [
      {
        id: 's5.a',
        label: 'We are aligned, it is just timing. Let us pick this up next week.',
        strongAnswer:
          'Does not accept the soft close. Asks a direct question about what specifically has to happen, and pins a date and an owner to each remaining step.',
      },
      {
        id: 's5.b',
        label: 'Who actually signs this, and what does their approval need?',
        strongAnswer:
          'Establishes the signer by name, what they need to see, and whether the rep gets access to them, rather than relying on the champion to carry it alone.',
      },
    ],
  },
];

export const DEFAULT_STAGE: StageId = 'discovery';

export function getStage(id: string | null | undefined): Stage {
  return STAGES.find((s) => s.id === id) ?? STAGES[0];
}

export function nextStage(id: StageId): Stage | null {
  const current = getStage(id);
  return STAGES.find((s) => s.order === current.order + 1) ?? null;
}
