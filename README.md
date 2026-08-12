# Sparring Partner

An objection-handling trainer for AEs, built on LiveKit Agents. A rep has a live voice
conversation with a synthetic prospect who is evaluating LiveKit, then gets a scorecard
grading how they handled each objection.

Three personas at ascending difficulty. Real objections mined from LiveKit's pricing page,
docs, and the competitive field (Vapi, Retell, Pipecat, raw OpenAI Realtime). Runs on one
set of LiveKit credentials, because every model in it goes through LiveKit Inference.

**[Live demo](https://sparring-partner-rosy.vercel.app) · [2-minute Loom](#)** (Loom link goes here)

---

## How I'd ramp LiveKit AEs

This is the actual point of the repo. The tool below is exhibit A.

### The problem, stated honestly

LiveKit is hiring its first enablement lead for a sales team selling deeply technical
infrastructure in a category that is roughly two years old. That combination breaks the
normal ramp playbook in three specific ways:

1. **The product moves faster than the content.** I verified this while building: the
   Agents Python API I had in my head was wrong, and the current one (`AgentServer`,
   `@server.rtc_session`, `inference.*`) landed after my training data. Any deck written
   in Q1 is stale by Q3. A certification program on a moving product trains recall of
   things that are no longer true.
2. **The buyers are engineers.** A VP of Engineering does not get handled. He tests you,
   and he can tell within about ninety seconds whether you know what a jitter buffer is.
   Slides do not prepare anyone for that.
3. **The competitive board is crowded and moves weekly.** Vapi, Retell, Pipecat, direct
   OpenAI Realtime, and "we'll build it ourselves" are all live objections, and the honest
   answer to several of them starts with a concession.

Traditional enablement (decks, docs, certifications) tests recall. It does not test whether
a rep can survive a skeptical VP of Engineering in real time. Manager role-play is the usual
fix, and it works, but it is expensive, inconsistent between managers, and almost never
scored against anything written down.

### The 30/60/90

**Days 1 to 30. Get them dangerous on the product, not on the pitch.**

Every rep ships a working voice agent in their first two weeks. Not a demo they watched, one
they built, deployed, and broke. The bar is low on purpose (a single persona answering
questions) but the experience is non-negotiable: they will have felt turn detection misfire,
watched latency get worse when they picked the wrong TTS model, and paid for their own
inference credits. That is the vocabulary they will use for the next two years.

In parallel: the objection bank ([`objection-bank.md`](objection-bank.md)) becomes a living
document with an owner and a review cadence, not a wiki page that rots. Every claim in it
carries a source link, and any claim we cannot source gets marked as something to escalate
rather than assert.

Certification gate at day 30: build and deploy an agent, and pass Tier 1 (the Champion) with
no bluffs.

**Days 31 to 60. Reps practice against resistance, on a schedule.**

Sparring Partner becomes weekly, not a one-time onboarding exercise. Tier 2 (the Skeptic)
opens with "we'll just build on the OpenAI Realtime API," which is the objection I would bet
is most common in the real pipeline, and it is the one where the correct answer requires
conceding that the Realtime API is genuinely good before differentiating on transport.

The scorecards aggregate. If eight of twelve reps score a 2 on "Pipecat is open source and
free," that is not eight coaching conversations, that is one missing piece of positioning and
my problem to fix. This is where the tool stops being a training exercise and starts being an
instrument for reading the team.

Managers stop running role-play from memory and start doing what they are actually good at:
reviewing a transcript that has already been scored, and coaching the two moments that matter.

Certification gate at day 60: pass Tier 2, with the latency question escalated rather than
answered.

**Days 61 to 90. Make them credible in front of engineers, and make the loop close.**

Tier 3 (the Commodity Buyer) runs the full competitive board with a procurement mindset, and
its win condition is the one I care most about: differentiate without trash-talking anyone,
quantify value instead of defending price, and know which claims to hand to an SA.

By day 90 a rep should be co-running a technical discovery call with an SA, and the pairing
should be deliberate: the rep knows exactly which five topics they hand over, because they
have been scored on those exact handoffs for two months.

The loop closes here. Every real call that produces a new objection goes back into
`objection-bank.md`, which regenerates the personas and the rubric. The training program
tracks the product because it is version-controlled next to it.

### The one belief underneath all of this

**The most valuable thing you can train into a rep selling technical infrastructure is knowing
what they don't know, out loud, in front of a buyer.**

That is why escalation judgment is a first-class scored dimension here, and why a rep who
answers a compliance question correctly from memory is still marked as a miss. The rubric says
so explicitly:

> A rep who guesses right today guesses wrong next quarter, in a deal that matters, on a claim
> that ends up in a contract.

Two of the objections in this tool are traps with no correct answer available. LiveKit does not
publish end-to-end latency benchmarks (I checked, and the docs describe architectural latency
work without committing to numbers), so a rep who answers "about 300 milliseconds" invented it.
The Skeptic pushes until it falls apart. That is the lesson, and it is much cheaper to learn
here than in a deal.

### Where I'd expect this to be wrong

Three things I would want to pressure-test before betting a ramp program on it:

- **Synthetic prospects are softer than real ones in one specific way:** they cannot smell fear,
  and they reward a written-down "correct" answer. A rep could learn to satisfy the rubric
  without getting better on live calls. The mitigation is that manager role-play stays in the
  program, with Sparring Partner as the reps, not the replacement.
- **An LLM grader has a confidence bias.** It rewards fluent answers. I wrote explicit
  counter-instructions into the rubric ("confidence is not competence," "grade the floor, not
  the ceiling"), and I would want to calibrate those against a set of human-graded transcripts
  before trusting the numbers at team level.
- **The objection bank is only as good as its maintenance.** If nobody owns it, this becomes a
  deck with extra steps in about four months.

---

## The tool

Three personas, each a prompt file in [`agent/personas/`](agent/personas/):

| Persona | Difficulty | Opens with |
|---|---|---|
| **Maya Osei**, Sr. Engineer, Series B | Easy | Friendly and curious, already sold on the category. Honest questions about latency, cost, self-host, and framework maturity. |
| **Dan Ferreira**, VP Engineering, mid-market | Medium | "We'll build directly on the OpenAI Realtime API. Why do we need you?" Interrupts, tests for hand-waving, respects honesty. |
| **Priya Raman**, CTO, late-stage | Hard | Full competitive board with a procurement mindset. Already talked to Vapi and Retell, has an engineer running Pipecat. |

Each persona has an ordered objection queue raised organically (never dumped as a list), win
conditions that soften them only when the rep earns it, and guardrails against the two failure
modes of LLM role-play: breaking character, and drifting agreeable.

### It is a deal, not a drill

Every call sits at one of five funnel stages, from Discovery to Commit, and each stage changes
the prospect's posture, the objections that surface, and what a good close is. Clear a stage
and the deal advances. Clearing requires a mean objection grade of 3.5 **and** no bluffed
escalation trap, so a rep cannot charm their way into procurement.

The part I care most about: after each call the grader writes two or three sentences from the
prospect's point of view, and those get injected into the next call's prompt. The prospect
remembers. Promise Dan latency numbers in stage two and he asks for them in stage four. No
role-play I have run does that, and it is the closest thing here to how deals actually go
wrong.

### Bring your own prospect

The three built-ins are LiveKit's competitive board. [`/build`](web/app/build/page.tsx) takes a
LinkedIn profile, CRM notes, free-text direction, or a call transcript, and compiles a playable
prospect: character, pre-call cards, and an objection queue with grading criteria, so the same
scorecard works on it unchanged.

Paste a Gong transcript and you get a follow-up conversation with that person, opening on
whatever you left unresolved. I tested it on a transcript where the rep promised HIPAA
documentation and never sent it, and the compiled prospect opened the follow-up on exactly
that.

On data handling, because this one matters: the compile route is stateless, nothing is written
to a server, prospects live in the rep's browser, and the raw transcript never reaches the
voice agent. That is the right posture for a prototype and it is not sufficient for a real
deployment. Before this touched genuine customer data it would need auth, tenant isolation, a
retention policy, and a conversation with whoever owns the Gong data.

The scorecard grades per objection (1 to 5 with behavioural anchors), flags escalation moments
as pass or miss, computes talk/listen ratio, and writes one coaching paragraph to the rep. The
rubric is in [`rubric.md`](rubric.md) and reps are meant to read it *before* their first call.
A rubric a rep cannot see is a performance review, not a training tool.

---

## How it works

```
Browser (Next.js on Vercel)                LiveKit Cloud
┌────────────────────────────┐            ┌──────────────────────────┐
│  persona picker            │            │                          │
│  /api/connection-details ──┼── token ──▶│  room + explicit agent   │
│    (mints JWT + dispatch)  │            │  dispatch (persona_id)   │
│                            │            │            │             │
│  call screen ◀─────── WebRTC audio ─────┼────────────┤             │
│    live captions           │            │      Agent (Python)      │
│                            │            │   Deepgram STT           │
│  /api/grade ───────────────┼── HTTPS ──▶│   GPT-4.1 (persona)      │
│    (rubric + transcript)   │            │   Inworld TTS            │
└────────────────────────────┘            │   turn detector          │
                                          └──────────────────────────┘
                                             all models via
                                             LiveKit Inference
```

The design decision worth calling out: **the grading route also runs on LiveKit Inference.**
The gateway at `agent-gateway.livekit.cloud/v1` is OpenAI-compatible and takes a short-lived
LiveKit JWT with an inference grant, so the whole project (voice pipeline and grader both)
authenticates with `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`. There is no OpenAI, Deepgram, or
ElevenLabs key anywhere in this repo. Three env vars total, which is most of why it deploys
quickly.

Talk/listen ratio is computed in code rather than asked of the model. It is arithmetic, and a
language model asked for a percentage will round it into whatever supports the narrative it
just wrote.

---

## Setup

Requires Python 3.10+ (via [uv](https://docs.astral.sh/uv/)), Node 20+, and a free
[LiveKit Cloud](https://cloud.livekit.io) project. The free tier covers this comfortably
(1,000 agent session minutes and $2.50 of inference credits, which is roughly 50 minutes of
conversation).

Get your three values from LiveKit Cloud under Settings, then Keys.

**1. Agent**

```bash
cd agent
cp .env.example .env.local   # fill in LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
uv sync
uv run src/agent.py dev
```

To talk to a persona straight from the terminal without the web app:

```bash
uv run src/agent.py console
```

**2. Web**

```bash
cd web
cp .env.example .env.local   # the same three values
pnpm install
pnpm dev
```

Open http://localhost:3000, pick a prospect, and talk. Headphones recommended, since the
turn detector will otherwise hear the prospect through your speakers and treat it as you
interrupting.

**3. Tests**

```bash
cd agent && uv run pytest          # 14 offline, 3 behavioural (need credentials)
cd web && pnpm check:personas      # guards agent/web persona id drift
```

The behavioural tests use an LLM judge to check the two things that would make this useless as
training: that the persona does not admit to being an AI, and that it does not break character
to coach the rep.

---

## Deploy

**Agent** to LiveKit Cloud. The Dockerfile is already set up, so `lk agent create` registers
the agent, uploads the build context, and rolls it out. It also writes a `livekit.toml` you
should commit.

```bash
brew install livekit-cli
lk cloud auth
cd agent && lk agent create
```

Subsequent updates are `lk agent deploy` from the same directory (`create` is first-time only).

**Web** to Vercel, with the repo root directory set to `web/` and the same three environment
variables set in the project settings:

```bash
cd web && vercel --prod
```

One thing to watch: the agent uses **explicit dispatch** (`agent_name="sparring-partner"`), so
the deployed agent's name has to match `AGENT_NAME` in
[`web/app/api/connection-details/route.ts`](web/app/api/connection-details/route.ts). If you
rename one, rename both, otherwise the room opens and nobody joins it.

---

## Repo map

```
objection-bank.md          mined objections with sources. edit this first
rubric.md                  grading spec, doubles as the "what good looks like" artifact
SPEC-v2.md                 why stages, briefs and custom prospects work the way they do
agent/
  src/agent.py             voice pipeline, prompt composition, 7-minute hard stop
  src/personas.py          persona file loading
  personas/*.md            the three personas. this is the content layer
  tests/test_agent.py      offline content tests + LLM-judge behavioural tests
web/
  app/page.tsx             prospect picker, deal progress, your custom prospects
  app/build/               compile a prospect from research or a call transcript
  app/spar/[personaId]/    call screen
  app/api/connection-details/  mints the token, carries the whole brief in dispatch metadata
  app/api/compile-persona/ stateless: pasted text in, playable prospect out
  app/api/grade/           talk ratio in code, one LLM call for judgment
  lib/stages.ts            the five funnel stages. adding one is a web-only change
  lib/campaign.ts          deal state and cross-call memory, localStorage only
  lib/personas.ts          display copy, pre-call briefs, grading criteria
  components/              call stage, pre-call brief, scorecard
```

Stage prompts live in `web/lib/stages.ts` rather than in the agent, and travel to it in
dispatch metadata. That is deliberate: adding or rewording a stage ships with a Vercel deploy
and never touches the agent.

Editing a persona is editing a markdown file. That is deliberate: the content layer should be
changeable by whoever owns enablement, without a code review.

---

## Notes and caveats

- **The API surface here was verified, not remembered.** LiveKit Agents moves fast enough that
  the SDK ships its own instruction telling coding agents not to trust their training data. I
  pulled model identifiers out of the installed package rather than the docs prose, because the
  docs list model families and the package has the actual strings.
- **Voices are the weakest part.** LiveKit documents four Inworld voices by name and I used
  three of them. Priya reads as "upbeat and friendly," which fights her written temperament. The
  full roster is in the Inworld playground and swapping is one line in
  [`agent/src/personas.py`](agent/src/personas.py). Voice quality was not the point of the demo,
  so I timeboxed it.
- **Nothing is stored.** No auth, no accounts, no database. The transcript lives in the browser
  session and is posted once for grading. For a demo this is the right call, and it also means
  nothing sits between a visitor and the experience.
- **Cost is trivial at demo volume,** roughly $0.045 to $0.05 per minute of conversation across
  STT, LLM, and TTS, with TTS as about 60% of it.

Built over a weekend as a working argument for how I'd ramp AEs on a technical product. If it
is useful, the fastest way to see it is the Loom above, and I'm happy to walk through any of it
live.
