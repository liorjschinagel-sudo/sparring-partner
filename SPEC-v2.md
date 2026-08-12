# Sparring Partner v2 — Spec

v1 shipped three fixed personas, each a prompt file, each good for one discovery call.
v2 turns that into a program you can actually run a rep through: research before the call,
a deal that progresses across calls, and prospects you author yourself.

## The one architectural idea

In v1 a persona **is** a markdown file, and `persona_id` is all that travels to the agent.
That breaks the moment a persona is authored at runtime.

In v2 the unit is a **Brief**: a compiled object holding identity, pre-call research cards, an
objection queue with grading criteria, and a system prompt. Built-in personas compile from
their markdown files; custom prospects compile from whatever the rep pastes in. Everything
downstream (agent, scorecard, UI) consumes a Brief and stops caring where it came from.

```
                 ┌── agent/personas/*.md  ────┐
LinkedIn text ───┤                            ├──▶ Brief ──▶ dispatch metadata ──▶ agent
CRM notes     ───┤   /api/compile-persona     │      │
Free text     ───┤   (one LLM call)           │      └────▶ /api/grade (objection queue)
Gong transcript ─┘                            │
                                              └──▶ pre-call cards in the UI
```

Dispatch metadata is capped at 512 KiB, which is why a Gong transcript is **distilled into a
Brief in the browser first** rather than shipped to the agent. That constraint turns out to be
the right design anyway: the compile step produces the objection queue the grader needs.

---

## Feature 1 — Pre-call context cards

**Why.** Good discovery starts from research. v1 gives a rep a one-line scouting report, which
trains them to wing it. Real reps walk in having read the account.

**What.** Before "Start call", show three cards. All facts are fictional and labelled as such.

- **Company** — industry, size, stage, tech stack, current vendors, why they are looking at
  voice AI now, a recent event (funding, launch, outage)
- **Person** — tenure, background, what they optimise for, how they buy, who they report to
- **Deal** — lead source, what has happened so far, who else is involved, compelling event

**The point is that the brief is loaded.** Facts in the cards are the same facts the persona
will confirm on the call, and several are hooks a good rep should use ("I saw you just closed
a Series C, is this tied to the support headcount plan?"). The rubric gains a dimension:
**did the rep use the research, or did they ask questions the brief already answered?**

Consistency requirement: a fact on a card must match what the persona says out loud. Cards are
generated from the same source as the prompt, never authored separately.

---

## Feature 2 — Funnel stage, and a deal that progresses

**Why.** Every role-play is a first call. Nobody practises the third one, which is where deals
actually die. "Closed won" is a sequence of different conversations, not a better first call.

**Stages.** Five, each with its own posture, objection sub-queue, and definition of a good close.

| # | Stage | Prospect posture | Passing looks like |
|---|---|---|---|
| 1 | Discovery | Guarded, evaluating whether you are worth a second call | Earn a technical next step with the right people on it |
| 2 | Technical evaluation | Engaged but rigorous, brings architecture questions | Survive scrutiny, escalate what you should, agree a scoped POC |
| 3 | Business case | Wants numbers and internal ammunition | Quantified value, multi-threading, arm the champion |
| 4 | Procurement | Adversarial on price, security, legal, data residency | Hold value, route compliance correctly, keep momentum |
| 5 | Commit | Ready but stalling on the last mile | Mutual action plan, named signer, a date |

**Campaign mode.** Pick a persona, start at Discovery. After each call the scorecard offers
**Advance** if you cleared the bar (mean objection grade ≥ 3.5 **and** no failed escalation
trap — bluffing does not advance a deal, which is the whole thesis). Deal state lives in
`localStorage`: current stage, per-stage scores, and a one-paragraph summary of each prior call.

That summary is the good part. It gets injected into the next call's prompt, so the prospect
**remembers**: "you told me last time you would get me latency numbers from an engineer." A rep
who bluffed in stage 2 gets that bluff handed back to them in stage 4. No other training tool
does this, and it is the strongest argument in the README.

Free play stays available: any stage, any time, no campaign.

---

## Feature 3 — Author your own prospect

**Why.** The three built-ins are LiveKit's competitive board. A rep preparing for a specific
account on Tuesday needs *that* account.

**Inputs** (any combination, all optional except one must be present):

- **LinkedIn profile** — pasted text, not scraped. Scraping violates LinkedIn's terms and adds
  a fragile dependency for no training benefit.
- **CRM context** — account notes, open opportunity, prior touchpoints
- **Free text** — the direct lever: "make her hostile about SOC 2", "he already churned once"
- **Gong transcript** — paste a real call, get a follow-up conversation with that person,
  carrying forward what was actually said and what was left open

**Compile step.** `POST /api/compile-persona` makes one LLM call and returns a Brief: identity,
the three cards, temperament, an ordered objection queue with a `strongAnswer` criterion per
objection, escalation traps, and win conditions. The queue is what makes a custom prospect
gradeable rather than just a chat partner.

**Gong-specific behaviour.** The compiler is instructed to extract what the prospect actually
objected to, what the rep promised, and what was left unresolved — then open the simulated call
on the unresolved thing. That is the highest-value rep in this entire spec: practising the
follow-up you are about to have, against the objections you already heard.

### Data handling, stated plainly

A Gong transcript is real customer speech, often under NDA, naming a real person. So:

- Nothing is written to a server. The compile route is stateless: transcript in, Brief out, no
  storage, no logs of the body.
- Briefs live in the rep's `localStorage`. Clearing the browser clears them.
- The raw transcript never reaches the agent. Only the compiled Brief does.
- The UI says this on the upload control, and warns against pasting anything the rep would not
  paste into a shared doc.

This is the correct posture for a prototype and it is not sufficient for a real deployment.
Before this touched genuine customer data at an employer, it would need auth, tenant isolation,
a retention policy, and a conversation with whoever owns the Gong data. Noted here rather than
discovered later.

---

## Rubric changes

Two new dimensions, both stage-aware:

- **Research usage** (1–5) — did the rep use the brief, or burn discovery on answered questions?
  Only scored when a brief exists.
- **Stage fit** (1–5) — was this the right conversation for the stage? Pitching architecture in
  Procurement scores badly even if the content is correct.

`closeQuality` becomes stage-relative: a good close in Discovery is a second meeting, in Commit
it is a signature date.

---

## Non-goals, still

- No auth, no accounts, no server-side storage. `localStorage` does campaign and custom-prospect
  persistence, which keeps the deploy at three environment variables.
- No admin UI for the built-in personas. They stay markdown in the repo.
- No CRM or Gong API integration. Paste only. An OAuth integration is a week of work that
  teaches nothing about whether the training loop is any good.
