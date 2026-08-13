# Sparring Partner Rubric. What Good Looks Like

This file is both things it needs to be: the grading specification the scorecard runs on,
and a standalone enablement artifact a rep can read *before* their first call to know what
they are being measured against. Nothing here is secret from the rep. That is deliberate. A rubric a rep can't see is a performance review, not a training tool.

---

## The five-point scale

Applied per objection. The anchor points are behavioural, not vibes.

| Grade | Name | What it looks like |
|---|---|---|
| **5** | Advances the deal | Handles the objection *and* moves the conversation forward. Concedes what's true, differentiates on something checkable, and lands a specific next step. The prospect's position measurably softens. |
| **4** | Solid | Accurate and credible. Addresses the real concern rather than a nearby easier one. Missing only the extra step that would convert it into momentum. |
| **3** | Survivable | Not wrong, but generic. Reframes without substance, or gives a correct answer the prospect could have read on the pricing page. Neither gains nor loses ground. |
| **2** | Weak | Dodges, changes the subject, or answers a different question. Prospect's concern is left standing. Credibility slightly damaged. |
| **1** | Damaging | Invents facts, trash-talks a competitor, argues with the prospect, or bluffs on a topic that needs escalation. Actively worse than saying nothing. |

**Not raised** is scored separately from **raised and handled badly**. An objection the
prospect never got to is not the rep's failure, but if the rep spent six minutes talking
and the prospect never got an objection in, that shows up in the talk/listen ratio instead.

---

## The scored dimensions

### 1. Objection handling (per objection, 1 to 5)

The core score. Graded against the persona's queue in `objection-bank.md`.

What earns a **5** on almost any objection in this bank:

- **Concede first, then differentiate.** Every objection in the bank contains something
  true. Reps who deny the true part lose the room; reps who grant it earn the right to
  draw a distinction.
- **Be checkable.** "We're more flexible" is a 3 at best. "Realtime is a WebSocket
  interface built for server-to-server use, so shipping to phones means you build WebRTC
  transport yourself" is a 5, because the prospect can go verify it.
- **Answer the question actually asked.** The most common way a good rep scores a 2 is by
  answering the objection they prepared for rather than the one they received.

### 2. Escalation judgment (pass / miss / not triggered)

**The dimension this tool exists to train.**

Certain questions must not be answered from memory, even correctly:

1. Specific P50/P99 latency figures under the customer's workload
2. Compliance certifications, data residency, BAA/DPA specifics
3. Whether a specific custom integration or architecture is supported
4. Security review specifics (encryption at rest, tenancy isolation)
5. Contractual SLA and uptime guarantees

For each of these raised in the call:

- **Pass**. The rep declines to guess, says plainly what they do and don't know, and
  commits to bringing the right person, ideally with a specific role and timeframe.
- **Miss**. The rep answers from memory. **A miss is scored as a miss even if the answer
  was factually correct.** The process is what's being trained. A rep who guesses right
  today guesses wrong next quarter, in a deal that matters, on a claim that ends up in a
  contract.

Vagueness is a partial miss: "I'll find out" is meaningfully weaker than "let me get our
solutions engineer on Thursday with your infra team."

### 3. Talk / listen ratio (computed, not judged)

Measured from transcript word counts, not by the model. It's arithmetic, and arithmetic
should not be delegated to a language model that might round it into a narrative.

| Rep share of words | Read |
|---|---|
| **under 40%** | Excellent. The prospect is doing the work of selling to themselves. |
| **40 to 55%** | Healthy discovery-call balance. |
| **55 to 70%** | Pitching more than listening. Common and correctable. |
| **over 70%** | The rep is presenting, not discovering. Almost always correlates with low objection scores, because objections never get room to surface. |

Read against the persona: the Skeptic interrupts, so a rep sparring with him should
naturally land lower than one with the Champion, who is happy to listen.

### 4. Close quality (1 to 5), judged against the stage

Scored on the last ninety seconds, once the prospect signals a hard stop. **What counts as a
good close depends entirely on where the deal is.** A second meeting is a 5 in Discovery and a
2 in Commit.

| Stage | A 5 looks like |
|---|---|
| Discovery | A scheduled next step with named roles attached |
| Technical evaluation | A scoped POC with a success criterion they agreed to out loud |
| Business case | Something the champion can use internally, *and* access to one more stakeholder |
| Procurement | Every concession traded for something, compliance routed with a date |
| Commit | A written mutual action plan: named signer, remaining steps, dates they said |

### 5. Stage fit (1 to 5)

Was this the right conversation for this point in the deal? Correct content at the wrong stage
still scores badly. Pitching architecture in Procurement, or discounting in Discovery, both
signal a rep running their own script rather than reading the deal.

### 6. Research usage (1 to 5)

Only scored when a pre-call brief exists. Did the rep use it, or burn discovery on questions
the brief already answered? Asking Dan what his company does, when it is on the card in front
of you, is a 1, and the prospect notices.

---

## The overall grade, and why it is not just an average

The headline number is the mean of the objections that were actually raised, with one
exception: **if the rep bluffed an escalation trap, the overall grade is capped at 2.5.**

This matters more than it looks. Three strong answers and one invented compliance claim
averages to a 4, and a 4 at the top of a scorecard tells the rep the call went well. It did
not. The scorecard shows both numbers ("capped from 4.2") so the rep can see exactly what the
one answer cost, rather than being handed a low number with no explanation.

## The advance gate

In campaign mode, a call advances the deal only if **both** hold:

1. Overall grade ≥ **3.5**
2. **No failed escalation trap**

The cap above sits below this bar on purpose, so the number and the gate can never disagree.
A rep who averages 4.2 but invented a compliance answer has not earned the next conversation,
because in a real deal that answer surfaces later, in writing, in front of someone who checks.
Bluffing does not advance deals here.

## SDR mode: qualification

An SDR is scored on something different, because the job is different. The question is not how
well they handled an objection, it is whether they left the call actually knowing anything.

**The four facts.** Each is established or it is not; there is no partial credit for a vibe.

| Fact | What counts as established |
|---|---|
| Use case | A specific thing being built or already running, not "exploring" |
| Timeline | Live, or a committed launch date. "First half of next year, maybe" is not a timeline |
| Volume | An actual number, compared out loud against the self-serve ceiling (about 50,000 agent minutes a month) |
| Headcount | Company size, and the routing that follows from it (1,000+ is Enterprise) |

**The verdict.** Qualify, self-serve, or disqualify. Reaching no verdict at all is its own
failure, and it is the most common one: the call ends warmly with a meeting booked and nothing
decided.

**The reputation trap.** Scored separately from the verdict, on purpose. A rep can reach the
right answer for the wrong reason, and that habit will fail them on the next lead. If they got
warmer because of the funding, the brand or the title, it is marked even when the verdict is
correct.

The bar worth internalising: a qualified prospect is running voice agents today or launching
imminently, at volume that clears self-serve. Money raised is not a use case, and a job title
is not volume.

## What is not an escalation trap

The counterpart mistake is escalating things a rep should own. These are objections to handle
on the spot, and marking them as escalations trains exactly the wrong reflex:

- Trust and accountability ("you never sent what you promised")
- Price, discounting, budget pushback
- Competitor comparisons and build-versus-buy
- Positioning, differentiation, product philosophy
- Anything answerable from public docs or ordinary product knowledge

A trap is narrower than it feels: answering correctly must require a specific fact the rep
could not reliably hold in their head, **and** being wrong must create real commercial, legal
or security exposure.

---

## What the coaching paragraph must do

One paragraph, written **to the rep**, second person. It must:

- Lead with the single highest-leverage change, not a summary of the call
- Name one specific moment, quoting or closely paraphrasing what was actually said
- Give one thing to keep doing. Reps discard feedback that is purely corrective
- Avoid praise inflation. "Good energy" is not coaching.

It must **not** re-list the per-objection grades. Those are already on the scorecard.

---

## Scoring biases to correct for

Written down because an LLM grader drifts toward all of these:

- **Confidence is not competence.** A fluent, warm, articulate rep who invented a latency
  number scored a 1 on that objection. Fluency should never lift a grade.
- **Length is not substance.** Long answers frequently score lower; they usually mean the
  rep is filling silence.
- **Politeness is not conceding.** "That's a great question" is not the same as granting
  that Vapi genuinely ships faster for simple use cases.
- **Getting the deal is not passing.** These personas can be talked into a next step by a
  charming rep who said nothing checkable. Grade the substance, not the outcome.
- **Grade the floor, not the ceiling.** If a rep gave a strong answer and then undermined
  it with a bluff thirty seconds later, the objection is scored on the bluff.
