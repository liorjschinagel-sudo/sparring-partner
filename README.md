# Sparring Partner

An objection-handling and qualification trainer, built on LiveKit Agents. A rep has a live
voice conversation with a synthetic prospect evaluating LiveKit, then gets scored on how they
handled it, with the answer they needed for anything they dropped.

Six personas across two modes (three AEs working a deal, three inbound leads to qualify).
The objections are mined from LiveKit's pricing page, the docs, and the competitive field
(Vapi, Retell, Pipecat, raw OpenAI Realtime) rather than invented. The whole thing runs on one
set of LiveKit credentials, because every model in it goes through LiveKit Inference.

**[Live demo](https://sparring-partner-rosy.vercel.app)**. Pick a prospect and talk to them.

---

## Why this exists

Two reasons, and both are worth saying plainly.

**To show the kind of work I would produce.** Most enablement ships a deck, a certification and
a wiki page that rots by Q3. I wanted to build the other thing: something a rep opens on a
Tuesday because it is useful that day, that gets better when the product moves instead of
staler, and that produces data a manager can coach against. This is one small example of that,
built end to end rather than described in a doc.

**To learn the product by building on it.** I am interviewing to enable a team selling LiveKit,
and reading the docs is a thin substitute for shipping something. Building this is how I found
out that the Agents API had moved under me (`AgentServer` and `inference.*` postdate anything I
had read), that Inference collapses five provider keys into one credential, that turn detection
is semantic and acoustic rather than silence thresholds, that dispatch metadata is how you get
context to an agent, and that the free tier's real constraint is inference credits (about fifty
minutes) rather than the thousand session minutes on the pricing page. Those are month-three
facts that I would rather know in week one.

The caveat worth naming: I built this without ever sitting in a LiveKit pipeline review. The
objections are researched, not heard. Some of them are probably not the ones that actually
cost deals.

## Where it fits

This tool is one cell of how I think about an enablement program. The full mental model:

**Spanning layers**, because they touch everything below them:

- New hire onboarding and ramp
- A self-maintaining LMS (content that updates from the source rather than from a calendar reminder)
- A Claude project and skill library

**The pillars:**

| Anatomy of a sale | Product mastery | Competitive intel | Tech stack | FAQs |
|---|---|---|---|---|
| Sales cycle deep dive | Product map | Battle cards | Tool launcher and how to access | Living Q&A |
| Prospect and broad-based skills | How to demo | CI skills | Tool request form | Drill downs by product, strategy, etc |
| Objection handling | Resource library (release notes, demo Looms, informed campaigns) | News and heard-from-the-field | | |
| Asset library and content factory | | Master matrix, stacked against the majors | | |
| **AE/SDR sparring tool** (this repo) | | | | |

**The skill library**, which is where most of a rep's day actually gets faster:

| Skill | What it does |
|---|---|
| `/prospect-prep` | Takes a CRM id and builds an actionable checklist and strategy for that prospect, wired to their Slack channel where one exists. Reusable through the cycle, anchored to a specific step (a discovery call, say) |
| `/prospect-strat` | Takes a CRM id and documents a full-cycle approach for that specific prospect |
| `/prospect-objection-handle` | Walks an AE or SDR through objections with that prospect's context loaded |
| `/CI-sweep` | Walks a rep through recent competitive updates that touch their pipe specifically |
| `/content-factory` | Produces a custom asset for a given cycle step from approved brand assets plus CRM-pulled context |

The sparring tool is the starred cell. One of about seventeen, which is the honest scale of the
thing and the reason I built one properly instead of sketching all of them.

## What I would actually build

The diagram is a mental model, not a plan. A plan needs things I do not have yet: the objections
that actually show up on calls, how the team really segments Commercial against Enterprise, where
reps lose deals rather than where I guess they do, and which questions the SEs are tired of being
handed. I would expect the first stretch to be mostly listening (call reviews, ride-alongs, and
asking the two reps who are already good what they do differently), and I would expect this
diagram to change once I did.

If I joined, I would harden this tool rather than rebuild it: auth, a real store, aggregate
scorecards so a manager can see that nine of twelve reps drop the same objection, and the
objection bank owned by someone with a review cadence. But it would sit inside the program above
rather than being the program.

### Where I would expect this to be wrong

Three things I would want to pressure-test before betting anything real on it:

- **Synthetic prospects are softer than real ones in one specific way.** They cannot smell fear,
  and they reward a written-down "correct" answer. A rep could learn to satisfy the rubric
  without getting better on live calls. The mitigation is that manager role-play stays in the
  program, with this as the reps rather than the replacement.
- **An LLM grader has a confidence bias.** It rewards fluent answers. I wrote explicit
  counter-instructions into the rubric ("confidence is not competence", "grade the floor, not
  the ceiling"), and I would want to calibrate those against human-graded transcripts before
  trusting the numbers at team level.
- **The objection bank is only as good as its maintenance.** If nobody owns it, this becomes a
  deck with extra steps in about four months.

---

## The tool

Two modes, because AEs and SDRs are being trained on different things.

### SDR mode: qualification

One inbound call, one question. Most LiveKit leads arrive through "talk to sales", and the
failure I would bet is most common is qualifying on reputation (the raise, the logo, the
title) instead of on whether they are running voice agents at volume. So the three inbound
leads are built so that reputation and qualification point in opposite directions:

| Lead | Looks like | Actually is |
|---|---|---|
| **Jordan Vance**, Chief of Staff, $180M raised | The best lead of the month | No project, no owner, no volume. Correct answer is self-serve and a trigger to reconnect |
| **Ana Ruiz**, Eng Lead, bootstrapped, 180 people | Small, skip it | Live in production, ninety thousand minutes a month, rebuilding in six weeks. Qualify, Commercial |
| **Tobias Lindqvist**, Director, 11,000 staff | Obvious enterprise deal | It is, and the call is really about whether you improvise about HIPAA |

The scorecard grades the four facts you should leave with (use case, timeline, volume,
headcount), whether you reached the right verdict, whether you routed Commercial against
Enterprise correctly, and separately whether you qualified on the use case or on the logo.
A rep can reach the right verdict for the wrong reason, and that still shows up.

Qualification is checkable rather than vibes: self-serve tops out around fifty thousand agent
minutes a month, and a thousand employees is the Commercial/Enterprise line.

### AE mode: work the cycle

Three personas at ascending difficulty, each a prompt file in
[`agent/personas/`](agent/personas/):

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

### Feedback you can actually use

A grade tells a rep where they stand and nothing about what to do next, so for every objection
they did not win the scorecard also shows the answer that would have won it, with a link to the
page it came from.

The links are the part worth explaining. The grader never writes a URL. It picks ids from a
fixed registry in [`web/lib/sources.ts`](web/lib/sources.ts) and the server resolves them,
dropping anything it does not recognise. A model asked to cite sources will happily invent a
plausible docs URL, and a coaching note that sends a rep to a 404 is worse than one with no
link at all. Every entry in that registry was checked to resolve when it was added, which also
means there is exactly one file to fix when LiveKit reorganises their docs.

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
- **Voices are the weakest part.** LiveKit documents four Inworld voices by name and I have six
  personas, so they are distinct within a mode rather than globally. Priya reads as "upbeat and
  friendly", which fights her written temperament. The full roster is in the Inworld playground
  and swapping is one line in [`agent/src/personas.py`](agent/src/personas.py). Voice quality was
  not the point, so I timeboxed it.
- **The qualification thresholds are inferred, not given.** Self-serve topping out around fifty
  thousand agent minutes comes from reading the published Scale plan, and the thousand-employee
  Commercial/Enterprise line comes from how the segments are described publicly. If the real
  cutoffs differ, they are two constants in [`web/lib/modes.ts`](web/lib/modes.ts).
- **Nothing is stored.** No auth, no accounts, no database. The transcript lives in the browser
  session and is posted once for grading. For a demo this is the right call, and it also means
  nothing sits between a visitor and the experience.
- **Cost is trivial at demo volume,** roughly $0.045 to $0.05 per minute of conversation across
  STT, LLM, and TTS, with TTS as about 60% of it.

Built over a couple of evenings, partly to have something to show and partly because building on
a product is the fastest way to learn it. The quickest way to judge it is to open the demo, pick
the Skeptic, and try to bluff him on latency. He will not let you.

Happy to walk through any of it live, including the parts I would do differently.
