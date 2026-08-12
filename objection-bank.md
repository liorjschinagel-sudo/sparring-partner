# Objection Bank — LiveKit AE Enablement

**Mined August 2026** from livekit.com/pricing, docs.livekit.io, the LiveKit blog, and third-party
comparison write-ups. Every number below has a source. This file is the input to the three persona
prompts in `agent/personas/` and to the grading rubric in `rubric.md`.

The point of maintaining this as a versioned file: **objections have a half-life**. When LiveKit ships
Turn Detector v2, or a competitor cuts prices, you edit this file and the whole training program moves
with it. That is the difference between an enablement *program* and an enablement *deck*.

---

## 1. Ground truth: LiveKit pricing (as of Aug 2026)

| Plan | Price | Agent session min | Concurrent sessions | Deployments | WebRTC min | Inference credits |
|---|---|---|---|---|---|---|
| Build | $0 | 1,000 | 5 | 1 | 5,000 | $2.50 (~50 min) |
| Ship | from $50/mo | 5,000 | 20 | 2 | 150,000 | $5 |
| Scale | from $500/mo | 50,000 | up to 600 | 4 | 1.5M | $50 |
| Enterprise | custom | — | — | — | — | — |

**Per-minute overage rates (Build/Ship):**

| Component | Rate |
|---|---|
| Agent session | $0.01/min |
| Telephony (SIP) | $0.01/min |
| STT (e.g. Deepgram Nova-3) | $0.0048–0.0058/min |
| TTS (e.g. Cartesia Sonic 3) | $0.03/min |
| LLM (e.g. GPT-4o mini) | $0.0006/min |
| Downstream data | $0.12/GB (Build/Ship), $0.10/GB (Scale) |

**The load-bearing insight for reps:** a realistic all-in voice minute on LiveKit lands around
**$0.045–0.05/min** (agent + STT + TTS + LLM), and **TTS is the single biggest line item** — roughly
60% of the cost. A rep who has internalized this can redirect a pricing fight away from LiveKit's
$0.01 and toward the customer's voice-model choice, which is where their money actually goes.

---

## 2. Competitive board

| Platform | Shape | Public pricing | Where it genuinely wins |
|---|---|---|---|
| **Vapi** | Managed orchestrator | $0.05/min platform fee; **$0.20–0.33/min** realistic with BYOK models | Fastest path for simple outbound/inbound call bots; strong Twilio integration |
| **Retell** | Managed, visual builder | flat ~$0.07/min | Ops-team-led buyers; HIPAA/SOC 2/GDPR included on every plan |
| **Pipecat** | OSS Python framework (Daily) | free / Daily transport | Lighter footprint, fast prototyping, maximum processor composability |
| **OpenAI Realtime** | Direct API | ~$0.30/min | Single-vendor simplicity, strong conversational quality |
| **Build in-house** | — | eng salaries | Full control; the honest answer for a team with real-time infra expertise already |

**Concessions reps must be willing to make** (the rubric rewards these):
- Vapi and Retell *are* faster to a working demo for a simple phone bot. That is true, and denying it
  costs credibility.
- Retell's flat rate *is* more predictable than a component-priced bill.
- Pipecat *is* genuinely open source and genuinely good.
- HIPAA on Vapi costs **+$1,000/mo**; Retell includes it. This is a real, checkable differentiator —
  but it cuts *against* LiveKit in deals where Retell's compliance packaging is the buying criterion.

---

## 3. LiveKit's actual technical differentiators

These are the claims a rep is allowed to make, because they are documented:

- **Turn Detector v1.0** (shipped June 2026): predicts end-of-turn from *both semantic meaning and
  acoustic properties* (intonation, pitch, rhythm), layered on top of VAD — not silence-threshold
  detection.
- **Adaptive interruptions**: distinguishes a real interruption from a backchannel ("mhm", "right"),
  so the agent keeps talking through the latter. VAD-only systems treat all speech as interruption.
- **Preemptive generation**: the LLM begins generating before end-of-turn is confirmed, cutting
  perceived latency. Tradeoff: wasted compute on discarded responses.
- **WebRTC-native transport.** LiveKit was built for real-time video first. OpenAI's Realtime API is a
  **WebSocket** interface, best suited to server-to-server use — not direct consumption by end-user
  devices on lossy mobile networks.
- **LiveKit Inference**: STT/LLM/TTS across OpenAI, Google, Deepgram, AssemblyAI, Cartesia, ElevenLabs,
  Inworld, Rime and more, through *one* set of LiveKit credentials. No per-provider keys, one bill.
  (This project is itself proof: it runs on `LIVEKIT_API_KEY` alone.)
- **Managed dispatch and failover**: agents register with LiveKit servers; on user connect, a nearby
  agent is dispatched, health-monitored, with failover and reconnection handled.
- **Breadth of client SDKs**: web, Swift, Android, Flutter, React Native, Unity, C++, embeddable web.
- **OpenAI partnership**: LiveKit is the infrastructure behind ChatGPT's Advanced Voice Mode. The
  strongest available proof point that the transport layer holds up at consumer scale.

### What a rep must NOT claim

> **LiveKit does not publish specific end-to-end latency benchmarks in its public docs.**

I checked. The docs describe *architectural* latency work (preemptive generation, instant connect)
without committing to millisecond figures. A rep who answers "what's your P50 latency?" with a
confident number is inventing it. **The correct move is to scope the question and bring an engineer.**
This is deliberately built into all three personas as an escalation trap, and the rubric scores it.

---

## 4. The objection queues

Each objection has: the prospect's line, what a weak answer looks like, and what a strong answer looks
like. The grading rubric scores against the "strong" column.

### Tier 1 — The Champion (Maya Osei, Sr. Engineer, Series B)

| # | Objection | Weak answer | Strong answer |
|---|---|---|---|
| 1.1 | "What's your actual latency? We need it to feel instant." | Invents a number ("about 300ms"). | Distinguishes transport latency from model latency; names the levers (preemptive generation, model choice, region); offers to benchmark *their* stack with an SA. Does not invent a figure. |
| 1.2 | "What does this cost us at 50k minutes a month?" | "It's about a penny a minute." | Builds the stack: $0.01 agent + STT + TTS + LLM ≈ $0.045–0.05/min all-in; flags TTS as the dominant term and a lever they control. |
| 1.3 | "Do we self-host or use Cloud? My CTO will ask." | Pushes Cloud only. | Genuinely open source and self-hostable; Cloud buys managed dispatch, failover, global transport, observability. Frames it as a real choice, names when self-host is right. |
| 1.4 | "How stable is the framework? It seems to move fast." | "It's very stable." | Concedes the pace honestly; points to versioned SDKs and the deprecation path; reframes velocity as category-appropriate (voice AI is ~2 years old) and points at the OpenAI partnership as a stability signal. |
| 1.5 | "We might want video later. Does that change anything?" | "Sure, we support video." | This is LiveKit's home field — WebRTC-native, video-first origins; same room primitive, no re-platform. Strongest structural answer in the deck. |

### Tier 2 — The Skeptic (Dan Ferreira, VP Engineering, mid-market SaaS)

Default position: *"We'll build directly on the OpenAI Realtime API. Why do we need you?"*

| # | Objection | Weak answer | Strong answer |
|---|---|---|---|
| 2.1 | "Realtime API already does voice. You're a wrapper." | Attacks OpenAI or hand-waves "we're much more". | Concedes Realtime is genuinely good at conversation. Then: it's a **WebSocket server-to-server** interface; shipping it to phones/browsers means building WebRTC transport, reconnection, jitter buffering yourself. |
| 2.2 | "We have two strong infra engineers. We'll build the transport." | "That'll take forever." | Doesn't insult the team. Enumerates the actual scope: WebRTC transport, turn detection, interruption/barge-in, dispatch, failover, observability, telephony. Asks what those engineers are *not* doing if they build it. |
| 2.3 | "Turn-taking is a solved problem — it's just VAD." | Agrees, or bluffs. | The specific differentiator: semantic + acoustic end-of-turn on top of VAD, and adaptive interruption that ignores backchannels. Concrete, checkable, not marketing. |
| 2.4 | "What's your P50 and P99 latency? Give me numbers." | **Invents numbers.** | **Escalation trap.** Correct: decompose into transport / STT / LLM / TTS, say plainly which figures are model-dependent, and get an SA on a call to measure against their workload. Bluffing here should fail the objection outright. |
| 2.5 | "Adding you adds a hop. You make it slower, not faster." | Dismisses it. | Legitimate concern, engaged seriously: the agent runs adjacent to the media path, not as an extra round trip to the client; preemptive generation and instant connect *reduce* perceived latency. Offers measurement rather than assertion. |
| 2.6 | "What happens when OpenAI ships the rest of this themselves?" | "They won't." | Platform-risk question deserving a real answer: LiveKit is model-agnostic by design and is the transport layer *underneath* OpenAI's own consumer voice product. Being infrastructure is the hedge. |

### Tier 3 — The Commodity Buyer (Priya Raman, CTO, late-stage)

Procurement mindset. Runs the full competitive board.

| # | Objection | Weak answer | Strong answer |
|---|---|---|---|
| 3.1 | "Pipecat is open source and free. You're a paid version of that." | Trash-talks Pipecat. | LiveKit Agents is *also* open source and self-hostable — the comparison isn't OSS vs paid. Difference is the managed transport/dispatch/failover plane and global media network. Compliments Pipecat honestly. |
| 3.2 | "Vapi and Retell ship faster for simple use cases." | Denies it. | **Concede it — it's true.** Then qualify: where does *their* roadmap go? Video, custom pipeline logic, self-host/data residency, model portability are where managed orchestrators become the constraint. |
| 3.3 | "Twilio already handles our telephony. Why re-plumb?" | "Rip out Twilio." | Doesn't ask them to. SIP integration means LiveKit sits alongside existing telephony; the room bridges the call and the agent. Migration is additive, not a rip-and-replace. |
| 3.4 | "At our volume, per-minute pricing is a rounding error. Convince me." | Leans harder on price. | **Accepts the reframe.** If price is immaterial, the decision is switching cost, model portability, engineering leverage, and reliability at scale. Moves to quantified value: engineer-months saved, cost of one bad launch. |
| 3.5 | "Retell includes HIPAA and SOC 2 on every plan. What do you include?" | Bluffs about compliance. | **Second escalation trap.** Compliance specifics must not be improvised. Correct: state what's known, refuse to guess, commit to a written answer from the right person. |
| 3.6 | "Give me one reason that isn't 'we're more flexible'." | Repeats "flexible". | Forces a single sharp claim. Best available: LiveKit is the WebRTC infrastructure behind ChatGPT Advanced Voice Mode — proof the transport layer holds at consumer scale, which no managed orchestrator can match. |

---

## 5. Escalation triggers (scored across all three personas)

The single most valuable rep behavior this tool trains: **knowing what you don't know, out loud.**
Each of these should produce "let me bring an engineer/SA into the next call" rather than an answer:

1. Specific P50/P99 latency numbers under the customer's workload.
2. Compliance certifications, data residency, BAA/DPA specifics.
3. Custom pipeline architecture and whether a specific integration is supported.
4. Security review questions (encryption at rest, tenancy isolation).
5. Contractual SLA and uptime guarantees.

A rep who confidently answers any of these from memory should be marked down **even if the answer
happens to be correct** — the process is what's being trained, not the recall.

---

## Sources

- [LiveKit pricing](https://livekit.com/pricing)
- [LiveKit docs — turn detection](https://docs.livekit.io/agents/build/turns/)
- [LiveKit docs — audio & preemptive generation](https://docs.livekit.io/agents/build/audio/)
- [LiveKit docs — OpenAI Realtime integration](https://docs.livekit.io/agents/integrations/openai/realtime/)
- [LiveKit blog](https://livekit.com/blog)
- [OpenAI + LiveKit partnership](https://livekit.com/blog/openai-livekit-partnership-advanced-voice-realtime-api)
- [Voice AI agents in production 2026 — Reactify](https://www.reactify-solutions.com/articles/voice-ai-agents-production-2026)
- [Vapi vs Retell vs LiveKit vs Pipecat — Particula](https://particula.tech/blog/vapi-vs-retell-vs-livekit-vs-pipecat-voice-agent-platform)
- [Pipecat vs LiveKit — Cekura](https://www.cekura.ai/blogs/pipecat-vs-livekit-the-real-difference)
