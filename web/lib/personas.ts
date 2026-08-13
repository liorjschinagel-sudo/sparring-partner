/**
 * Persona metadata for the web app: what the picker renders, and what the grader
 * scores against.
 *
 * Deliberate duplication: the behavioural prompts live in `agent/personas/*.md` and
 * are owned by the agent; this file owns display copy and the grading criteria. They
 * are separate concerns that happen to share ids, and keeping them separate is what
 * lets the web app deploy to Vercel with `web/` as its root directory.
 *
 * The `id` values MUST match the agent's persona files. `agent/tests/test_agent.py`
 * asserts the agent side; `npm run check:personas` asserts they still line up.
 *
 * Source of truth for the objection content itself is `objection-bank.md` at the repo
 * root. Edit that first, then reflect changes here and in the persona prompts.
 */

import type { ModeId, Qualification } from '@/lib/modes';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Objection {
  /** Stable id, matches the numbering in objection-bank.md */
  id: string;
  /** How the prospect tends to phrase it, for the grader to recognise */
  label: string;
  /** What a 5 looks like. This is the grading criterion. */
  strongAnswer: string;
  /** Marks the objections that must be escalated rather than answered */
  escalationTrap?: boolean;
  /**
   * Curated source ids from lib/sources.ts. Optional: where this is empty the grader picks
   * from the same registry, so remediation is always linked either way.
   */
  sources?: string[];
}

export interface BriefFact {
  label: string;
  value: string;
}

/**
 * Pre-call research.
 *
 * Everything here is what a rep could reasonably have found before dialling: the company
 * website, LinkedIn, the CRM, a news alert. It deliberately does NOT contain the facts the
 * persona is written to withhold (Dan has not tested on a phone, Priya has an EU data
 * residency requirement), because uncovering those is the discovery being trained.
 *
 * Every fact here must match what the persona will confirm out loud. They are drawn from
 * the same persona files the agent runs on.
 */
export interface PersonaBrief {
  company: BriefFact[];
  person: BriefFact[];
  deal: BriefFact[];
  /** Openings a good rep should use. Scored as "research usage" on the scorecard. */
  hooks: string[];
}

export interface Persona {
  id: string;
  name: string;
  title: string;
  company: string;
  difficulty: Difficulty;
  tier: 1 | 2 | 3;
  /** `ae` works a deal across stages, `sdr` is one inbound qualification call. */
  mode: ModeId;
  /** SDR personas only: the facts that decide the verdict, and the reputation trap. */
  qualification?: Qualification;
  /** One-line scouting report shown on the persona card */
  scoutingReport: string;
  /** The prospect's opening posture, shown on the call screen for context */
  openingPosture: string;
  accent: string;
  brief: PersonaBrief;
  objections: Objection[];
}

export const PERSONAS: Persona[] = [
  {
    id: 'champion',
    name: 'Maya Osei',
    title: 'Senior Engineer',
    company: 'Threadline · Series B',
    difficulty: 'Easy',
    tier: 1,
    mode: 'ae',
    scoutingReport:
      'Friendly, technically curious, already sold on the category. Will hand you the deal if you are accurate and do not oversell.',
    openingPosture: 'Wants a voice agent for tier-1 support. Genuinely evaluating build vs buy.',
    accent: '#4ade80',
    brief: {
      company: [
        { label: 'What they do', value: 'Customer-support SaaS for mid-market e-commerce brands' },
        { label: 'Size & stage', value: '~80 people, Series B, raised 14 months ago' },
        { label: 'Stack', value: 'Python backend, React front end, Postgres. No real-time infra today' },
        { label: 'Volume', value: 'About forty thousand support calls a month' },
        { label: 'Recent', value: 'Announced a support-automation roadmap at their user conference' },
      ],
      person: [
        { label: 'Role', value: 'Senior engineer, owns the new voice agent project' },
        { label: 'Tenure', value: 'Three years at Threadline, promoted into the lead role this year' },
        { label: 'Background', value: 'Backend and infra. Weekend-hacked with the OpenAI Realtime API' },
        { label: 'Disposition', value: 'Already sold on the category. Wants accuracy, not enthusiasm' },
        { label: 'Reports to', value: 'CTO, who is cost-sensitive but not cheap' },
      ],
      deal: [
        { label: 'Source', value: 'Inbound. Signed up for a LiveKit Cloud account two weeks ago' },
        { label: 'So far', value: 'Read the docs and the pricing page before this call' },
        { label: 'Others involved', value: 'CTO will need to approve. Two engineers available to build' },
        { label: 'Timeline', value: 'Wants something in production this quarter' },
      ],
      hooks: [
        'She has already read the pricing page. Quoting the list price back at her wastes the call.',
        'Two engineers are available. Ask what else those two are meant to be shipping.',
        'The CTO is the real approver and is not on this call. Ask how he evaluates.',
      ],
    },
    objections: [
      {
        id: '1.1',
        label: 'What is your actual latency? It needs to feel instant.',
        strongAnswer:
          'Distinguishes transport latency from model latency, names the levers (preemptive generation, model choice, region), and offers to benchmark against their stack with an SA. Critically, does NOT invent a number. LiveKit publishes no end-to-end latency benchmark.',
        escalationTrap: true,
      },
      {
        id: '1.2',
        label: 'What does this cost at fifty thousand minutes a month?',
        strongAnswer:
          'Builds the stack rather than quoting one number: ~$0.01/min agent session plus STT (~$0.005), TTS (~$0.03), LLM (~$0.0006), landing near five cents a minute all-in. Flags that TTS is the dominant line item and a lever the customer controls.',
      },
      {
        id: '1.3',
        label: 'Do we self-host or use Cloud? My CTO will ask about lock-in.',
        strongAnswer:
          'States honestly that LiveKit is genuinely open source and self-hostable, and that Cloud buys managed dispatch, failover, global media transport and observability. Frames it as a real choice and names when self-hosting is the right call.',
      },
      {
        id: '1.4',
        label: 'How stable is the framework? The changelog moves fast.',
        strongAnswer:
          'Concedes the pace honestly rather than claiming stability. Points to versioned SDKs and the deprecation path, reframes velocity as appropriate for a two-year-old category, and cites the OpenAI partnership as a maturity signal.',
      },
      {
        id: '1.5',
        label: 'We might want video later for screen-share support.',
        strongAnswer:
          "LiveKit's home field: WebRTC-native with video-first origins, the same room primitive covers both, so there is no re-platform later. The strongest structural answer available on this call.",
      },
    ],
  },
  {
    id: 'skeptic',
    name: 'Dan Ferreira',
    title: 'VP Engineering',
    company: 'Kelvin · mid-market SaaS',
    difficulty: 'Medium',
    tier: 2,
    mode: 'ae',
    scoutingReport:
      'Opens with "we will just build on the OpenAI Realtime API." Interrupts. Tests for hand-waving. Respects honesty more than polish.',
    openingPosture: 'Already prototyped on Realtime and it worked. Has not tested it on a phone.',
    accent: '#fbbf24',
    brief: {
      company: [
        { label: 'What they do', value: 'B2B SaaS for field-service scheduling, sold to mid-market' },
        { label: 'Size & stage', value: '~400 people, Series C, profitable-ish and cost-disciplined' },
        { label: 'Stack', value: 'Go and TypeScript. Strong in-house infrastructure culture' },
        { label: 'Project', value: 'Voice interface for customer onboarding, web and phone' },
        { label: 'Recent', value: 'Public engineering blog post about building their own websocket layer' },
      ],
      person: [
        { label: 'Role', value: 'VP Engineering, owns the build-vs-buy call outright' },
        { label: 'Tenure', value: 'Two years. Came in to professionalise the platform team' },
        { label: 'Background', value: 'Infrastructure and distributed systems. Ex-payments' },
        { label: 'Disposition', value: 'Has been pitched a lot of middleware. Assumes you are a thin wrapper' },
        { label: 'How he buys', value: 'Punishes hand-waving, rewards conceding what you cannot do' },
      ],
      deal: [
        { label: 'Source', value: 'CEO forwarded him a LiveKit link and asked him to take a look' },
        { label: 'So far', value: 'Nothing. This is the first conversation and he did not seek it out' },
        { label: 'Others involved', value: 'Two strong infrastructure engineers who would do the build' },
        { label: 'Timeline', value: 'None stated. He has fifteen minutes and no urgency' },
      ],
      hooks: [
        'The CEO sent him here, he did not come looking. He has no urgency you did not create.',
        'His team blogged about building their own websocket layer. They genuinely can build it.',
        'He prototyped on Realtime already. Ask where that prototype runs before you differentiate.',
      ],
    },
    objections: [
      {
        id: '2.1',
        label: 'Realtime already does voice. You are a wrapper.',
        strongAnswer:
          'Concedes Realtime is genuinely good at conversation BEFORE differentiating. Then makes the checkable point: Realtime is a WebSocket, server-to-server interface, so shipping to phones and browsers on lossy networks means building WebRTC transport, reconnection and jitter buffering yourself.',
      },
      {
        id: '2.2',
        label: 'We have two strong infra engineers. We will build the transport.',
        strongAnswer:
          'Does not insult the team or claim it is impossible. Enumerates the actual scope. Transport, turn detection, barge-in, dispatch, failover, observability, telephony. Then asks what those two engineers are NOT doing while they build it. Opportunity cost, not difficulty.',
      },
      {
        id: '2.3',
        label: 'Turn-taking is solved. It is just VAD.',
        strongAnswer:
          "Names the specific differentiator: LiveKit's turn detector predicts end-of-turn from semantic meaning AND acoustic properties on top of VAD, and adaptive interruption distinguishes a genuine interruption from a backchannel like 'mhm'. Specific and verifiable, not marketing.",
      },
      {
        id: '2.4',
        label: 'What is your P50 and P99 latency? Give me numbers.',
        strongAnswer:
          'ESCALATION TRAP. There is no published figure to give. Correct handling decomposes the question into transport / STT / LLM / TTS, states plainly which parts are model-dependent, refuses to invent a number, and proposes an SA measuring against their actual workload. Any specific number offered here is a fabrication and scores 1.',
        escalationTrap: true,
      },
      {
        id: '2.5',
        label: 'Adding you adds a hop. You make it slower.',
        strongAnswer:
          'Takes the concern seriously rather than dismissing it. Explains the agent runs adjacent to the media path rather than as an extra client round trip, and that preemptive generation and instant connect reduce perceived latency. Offers measurement instead of assertion.',
      },
      {
        id: '2.6',
        label: 'What happens when OpenAI ships the rest of this themselves?',
        strongAnswer:
          'Treats platform risk as a legitimate question. LiveKit is model-agnostic by design and is the transport layer underneath OpenAI\'s own consumer voice product. Being infrastructure is the hedge. Does not answer "they won\'t".',
      },
    ],
  },
  {
    id: 'commodity-buyer',
    name: 'Priya Raman',
    title: 'CTO',
    company: 'Northwind Logistics · late-stage',
    difficulty: 'Hard',
    tier: 3,
    mode: 'ae',
    scoutingReport:
      'Runs the full competitive board and a procurement playbook. Treats you as interchangeable until proven otherwise. Will not accept "we are more flexible."',
    openingPosture: 'Already talked to Vapi and Retell. An engineer has Pipecat working.',
    accent: '#f87171',
    brief: {
      company: [
        { label: 'What they do', value: 'Third-party logistics. Freight brokerage and last-mile dispatch' },
        { label: 'Size & stage', value: '~2,000 people, late-stage, PE-backed since 2024' },
        { label: 'Stack', value: 'Java monolith mid-migration. Twilio for all existing telephony' },
        { label: 'Volume', value: 'About three thousand driver calls a day, mostly inbound' },
        { label: 'Recent', value: 'Announced a cost-reduction programme on their last earnings call' },
      ],
      person: [
        { label: 'Role', value: 'CTO. Owns the decision but procurement owns the process' },
        { label: 'Tenure', value: 'Five years, promoted from VP Platform' },
        { label: 'Background', value: 'Enterprise architecture. Has run large vendor consolidations' },
        { label: 'Disposition', value: 'Not hostile, unimpressed. Uses silence deliberately' },
        { label: 'How she buys', value: 'Three-vendor evaluation minimum. Will not accept "more flexible"' },
      ],
      deal: [
        { label: 'Source', value: 'Outbound. Her VP of Support asked her to evaluate voice agents' },
        { label: 'So far', value: 'Already spoken to Vapi and Retell. An engineer has Pipecat running' },
        { label: 'Others involved', value: 'VP Support is the requester. Procurement will gate everything' },
        { label: 'Timeline', value: 'Procurement cycle runs four months regardless of urgency' },
      ],
      hooks: [
        'She has already seen Vapi and Retell. Disparaging them tells her you have nothing.',
        'Twilio handles their telephony today. Proposing a rip-and-replace ends the call.',
        'Her VP of Support is the actual requester and is not in the room. Ask to meet them.',
      ],
    },
    objections: [
      {
        id: '3.1',
        label: 'Pipecat is open source and free. You are a paid version of that.',
        strongAnswer:
          'Spots the false frame: LiveKit Agents is ALSO open source and self-hostable, so this is not OSS vs paid. Names what the managed plane actually adds (dispatch, failover, global media transport, observability) and compliments Pipecat accurately rather than disparaging it.',
      },
      {
        id: '3.2',
        label: 'Vapi and Retell ship faster for simple use cases.',
        strongAnswer:
          'CONCEDES IT. It is true, and denying it costs the deal. Then qualifies by asking where their roadmap goes: video, custom pipeline logic, data residency and model portability are where managed orchestrators become the constraint.',
      },
      {
        id: '3.3',
        label: 'Twilio already handles our telephony. Why re-plumb?',
        strongAnswer:
          'Does not propose ripping out Twilio. Explains SIP integration lets LiveKit sit alongside existing telephony, with the room bridging the call and the agent. Migration is additive, not rip-and-replace.',
      },
      {
        id: '3.4',
        label: 'At our volume, per-minute pricing is a rounding error. Convince me.',
        strongAnswer:
          'Recognises this as a gift and stops selling on price. Pivots to switching cost, model portability, engineering leverage and the cost of one bad launch, with quantified value framing. A rep who keeps discounting after this has failed a comprehension test.',
      },
      {
        id: '3.5',
        label: 'Retell includes HIPAA and SOC 2 on every plan. What do you include?',
        strongAnswer:
          'ESCALATION TRAP. Compliance must never be improvised. It creates real legal exposure. Correct handling states only what is actually known, explicitly declines to guess, and commits to a written answer from the right person by a specific date. Any confident compliance claim here scores 1.',
        escalationTrap: true,
      },
      {
        id: '3.6',
        label: 'Give me one reason that is not "we are more flexible".',
        strongAnswer:
          'Produces one sharp, checkable claim. The strongest available: LiveKit is the WebRTC infrastructure behind ChatGPT Advanced Voice Mode. Proof the transport holds at consumer scale, which no managed orchestrator can match. Repeating "flexible" fails outright.',
        sources: ['openaiPartnership'],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // SDR mode: inbound qualification
  //
  // Reputation and qualification point in opposite directions on purpose. The lead with
  // the big raise is not worth an AE call; the bootstrapped one nobody has heard of is
  // the best opportunity of the month.
  // ---------------------------------------------------------------------------

  {
    id: 'inbound-hype',
    name: 'Jordan Vance',
    title: 'Chief of Staff',
    company: 'Halcyon AI · Series C',
    difficulty: 'Easy',
    tier: 1,
    mode: 'sdr',
    accent: '#4ade80',
    scoutingReport:
      'Warm, fast and generous with company news. Will happily spend your whole call on the funding round if you let him.',
    openingPosture: 'CEO saw a competitor launch and asked "should we be doing this?". Jordan owns the answer.',
    qualification: {
      employees: 240,
      hasVoiceUseCase: false,
      timeline: 'First half of next year, maybe. Nothing committed.',
      monthlyMinutes: null,
      correctVerdict: 'self-serve',
      correctSegment: 'None',
      rationale:
        'No project, no owner, no timeline and no volume. Point them at the docs and the free tier, set a trigger to reconnect when something actually exists, and do not burn an AE hour on a browser tab.',
      reputationBait:
        'A $120M Series C, two TechCrunch pieces this year, and a title that sounds like authority.',
    },
    brief: {
      company: [
        { label: 'What they do', value: 'AI-native productivity suite, sold to mid-market' },
        { label: 'Size & stage', value: '~240 people, Series C, $180M raised in total' },
        { label: 'Recent', value: 'Closed a $120M round four months ago, covered widely' },
        { label: 'Voice today', value: 'Nothing shipped. No public voice product' },
      ],
      person: [
        { label: 'Role', value: 'Chief of Staff. Owns the question, not the engineering' },
        { label: 'Background', value: 'Strategy and ops. Not technical' },
        { label: 'Disposition', value: 'Warm, fast, generous with company news' },
      ],
      deal: [
        { label: 'Source', value: 'Inbound "talk to sales" form, submitted yesterday' },
        { label: 'Stated interest', value: '"Exploring voice AI"' },
        { label: 'Trigger', value: 'CEO forwarded a competitor launch video in Slack' },
      ],
      hooks: [
        'The form said "exploring". Find out what that word is doing before you invest the call.',
        'Chief of Staff is not an engineering owner. Ask who would actually build this.',
        'A raise is not a use case. Nothing about the round tells you whether there is a project.',
      ],
    },
    objections: [
      {
        id: 'q1.1',
        label: 'We are exploring the space and want to get smart on this.',
        strongAnswer:
          'Does not accept "exploring" as an answer. Asks what specifically they would build, for whom, and what happens if they do nothing. The vagueness is the signal.',
      },
      {
        id: 'q1.2',
        label: 'We just raised a hundred and twenty million, so budget is not the issue.',
        strongAnswer:
          'THE REPUTATION TRAP. Budget was never the question. Does not let the round stand in for a use case, and moves straight back to what is being built and when. A rep who gets visibly warmer here has failed.',
      },
      {
        id: 'q1.3',
        label: 'Timeline is probably first half of next year, depending what we learn.',
        strongAnswer:
          'Recognises a non-timeline. Establishes there is no committed project and no engineering owner, rather than booking a meeting against a maybe.',
      },
      {
        id: 'q1.4',
        label: 'Volume? Honestly I could not tell you. A few hundred calls to start?',
        strongAnswer:
          'Takes the answer at face value and does the arithmetic out loud: a few hundred calls sits far inside the free tier, so this is self-serve today. Says so plainly and helpfully.',
        sources: ['pricing'],
      },
      {
        id: 'q1.5',
        label: 'Should we set up time with someone more technical on your side?',
        strongAnswer:
          'Declines, kindly and with a reason. Points to the docs and the free tier, offers to reconnect when there is a project and an owner, and leaves the door genuinely open. Booking the AE call is the failure.',
        sources: ['voiceAi', 'pricing'],
      },
    ],
  },

  {
    id: 'inbound-sleeper',
    name: 'Ana Ruiz',
    title: 'Engineering Lead, Voice',
    company: 'Ferrovia Freight · bootstrapped',
    difficulty: 'Medium',
    tier: 2,
    mode: 'sdr',
    accent: '#fbbf24',
    scoutingReport:
      'Terse, slightly impatient, opens with a technical question. Answers exactly what you ask and then stops, so what you leave with depends entirely on what you thought to ask.',
    openingPosture: 'Has a specific SIP question and could not find the answer in the docs fast enough.',
    qualification: {
      employees: 180,
      hasVoiceUseCase: true,
      timeline: 'Live since January. Rebuilding in the next six weeks, choosing transport now.',
      monthlyMinutes: 90_000,
      correctVerdict: 'qualify',
      correctSegment: 'Commercial',
      rationale:
        'Live in production, ninety thousand minutes a month (well past self-serve), an imminent rebuild, and the decision-maker is on the phone. 180 employees puts it in Commercial. This is the best lead of the month and the only thing that hides it is the lack of a logo.',
      reputationBait:
        'Bootstrapped, no funding to name, 180 people and a dated website. Everything on the surface says "small, skip it".',
    },
    brief: {
      company: [
        { label: 'What they do', value: 'Freight brokerage and carrier management' },
        { label: 'Size & stage', value: '~180 people, bootstrapped, profitable' },
        { label: 'Recent', value: 'Nothing. They do not do press' },
        { label: 'Voice today', value: 'Something is running. Details unclear from outside' },
      ],
      person: [
        { label: 'Role', value: 'Engineering Lead, Voice' },
        { label: 'Background', value: 'Telephony and backend. Ten years in logistics' },
        { label: 'Disposition', value: 'Terse. Warms up for specifics, goes cold for scripts' },
      ],
      deal: [
        { label: 'Source', value: 'Inbound contact form' },
        { label: 'Stated interest', value: 'A specific question about SIP and existing telephony' },
        { label: 'Trigger', value: 'Could not find the answer in the docs quickly' },
      ],
      hooks: [
        'Her title is "Engineering Lead, Voice". Somebody is already paying for a voice team.',
        'She asked a specific SIP question. Answering it, or getting someone who can, buys the whole call.',
        'She will not volunteer her volume. If you do not ask for a number you will not get one.',
      ],
    },
    objections: [
      {
        id: 'q2.1',
        label: 'I have a question about SIP. Is this even the right conversation?',
        strongAnswer:
          'Engages the actual question rather than deflecting into discovery. Confirms LiveKit sits alongside existing telephony over SIP, or commits to getting someone who can answer properly. Earning the right to ask questions starts here.',
        sources: ['sip'],
      },
      {
        id: 'q2.2',
        label: 'We already have one running. Been live since January.',
        strongAnswer:
          'Recognises this as the single most qualifying sentence available and digs in: what is it doing, what is it built on, what breaks. A live production system is the difference between a lead and a prospect.',
      },
      {
        id: 'q2.3',
        label: 'Drops on bad connections. Our drivers are on the road.',
        strongAnswer:
          'Connects the symptom to transport rather than pitching features. Mobile-network packet loss is exactly the WebRTC argument, and this is the moment to make it concretely.',
        sources: ['ossServer', 'turns'],
      },
      {
        id: 'q2.4',
        label: 'About ninety thousand minutes a month. Doubles in Q1.',
        strongAnswer:
          'ONLY SURFACES IF ASKED. Gets a real number, compares it to self-serve out loud (this is roughly double the Scale plan ceiling), and treats it as the qualifying fact it is.',
        sources: ['pricing'],
      },
      {
        id: 'q2.5',
        label: 'Rebuilding in six weeks. Picking the transport layer this month.',
        strongAnswer:
          'Recognises a closing window and moves with urgency: gets a technical conversation booked in days, not "sometime next week". Slow follow-up loses this deal to whoever answers first.',
      },
    ],
  },

  {
    id: 'inbound-enterprise',
    name: 'Tobias Lindqvist',
    title: 'Director of Platform Engineering',
    company: 'Meridian Health Systems · ~11,000 staff',
    difficulty: 'Hard',
    tier: 3,
    mode: 'sdr',
    accent: '#f87171',
    scoutingReport:
      'Precise, unhurried, and comfortable with silence. Works in healthcare, so expect questions you may not be the right person to answer.',
    openingPosture: 'Pilot live in two facilities. Needs to know this can clear procurement before going further.',
    qualification: {
      employees: 11_000,
      hasVoiceUseCase: true,
      timeline: 'Pilot live now, decision this quarter, rollout next fiscal year.',
      monthlyMinutes: 200_000,
      correctVerdict: 'qualify',
      correctSegment: 'Enterprise',
      rationale:
        'Eleven thousand employees puts this over the Enterprise line on headcount alone, and two hundred thousand minutes a month is four times the self-serve ceiling. Qualifying is easy. The call is won or lost on whether the rep improvises about HIPAA.',
      reputationBait:
        'Healthcare, a recognisable network, and a live pilot. It looks so clean that a rep can relax into it and start answering compliance questions they should not touch.',
    },
    brief: {
      company: [
        { label: 'What they do', value: 'Hospital network, patient access and scheduling' },
        { label: 'Size & stage', value: '~11,000 employees across the network' },
        { label: 'Regulatory', value: 'Handles protected health information' },
        { label: 'Voice today', value: 'Pilot live in two facilities' },
      ],
      person: [
        { label: 'Role', value: 'Director of Platform Engineering. Owns the platform decision' },
        { label: 'Background', value: 'Enterprise architecture, large vendor evaluations' },
        { label: 'Disposition', value: 'Precise and unhurried. Uses silence. Unmoved by enthusiasm' },
      ],
      deal: [
        { label: 'Source', value: 'Inbound contact form' },
        { label: 'Stated interest', value: 'Whether LiveKit can clear their requirements at all' },
        { label: 'Gatekeepers', value: 'CIO owns budget. Procurement and security both gate it' },
      ],
      hooks: [
        'Healthcare and a live pilot means compliance questions are coming. Decide now what you will not answer.',
        'Eleven thousand employees settles the segment before you dial. Do not treat this as Commercial.',
        'He owns the platform decision but not the budget. Find out who does.',
      ],
    },
    objections: [
      {
        id: 'q3.1',
        label: 'We have a pilot live in two facilities. Patient access and prescription callbacks.',
        strongAnswer:
          'Establishes the shape of the pilot and what would have to be true to expand it, rather than treating "pilot" as a win in itself.',
      },
      {
        id: 'q3.2',
        label: 'Full rollout is around two hundred thousand minutes a month.',
        strongAnswer:
          'Gets the number, states plainly that it is far past self-serve, and pairs it with the eleven thousand headcount to route this to Enterprise rather than Commercial.',
        sources: ['pricing'],
      },
      {
        id: 'q3.3',
        label: 'We handle protected health information. Are you HIPAA compliant, and will you sign a BAA?',
        strongAnswer:
          'ESCALATION TRAP. An SDR must never answer this from memory. Correct handling states only what is genuinely known, declines to guess explicitly, and commits to the right owner by a specific date. Any confident yes fails the call outright, even if it happens to be true.',
        escalationTrap: true,
      },
      {
        id: 'q3.4',
        label: 'Where is call audio processed and stored, and for how long?',
        strongAnswer:
          'ESCALATION TRAP. Data residency and retention are not SDR territory. Routes it to a solutions architect or security contact with a date, rather than reasoning from the docs on a live call.',
        escalationTrap: true,
      },
      {
        id: 'q3.5',
        label: 'Who else needs to be involved on your side before we go further?',
        strongAnswer:
          'Maps the buying group honestly (AE, solutions architect, and whoever owns compliance answers) and sets a next step with named roles and a date, rather than promising to "get some information over".',
      },
    ],
  },
];

export function getPersona(id: string): Persona | undefined {
  return PERSONAS.find((p) => p.id === id);
}

export function personasForMode(mode: ModeId): Persona[] {
  return PERSONAS.filter((p) => p.mode === mode);
}

export const DIFFICULTY_ORDER: Difficulty[] = ['Easy', 'Medium', 'Hard'];
