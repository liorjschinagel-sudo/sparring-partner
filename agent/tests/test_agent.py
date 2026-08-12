"""Tests for the sparring partner agent.

Two layers:

* `TestPersonaLoading` runs offline and guards the content layer — the persona files
  are the product, and a typo in frontmatter should fail here rather than at dispatch.
* The behavioural tests need LiveKit credentials (they use LiveKit Inference for both
  the agent and the judge model) and are skipped without them.

The behavioural tests deliberately cover the two failure modes that would make this
tool useless as training: the persona breaking character, and the persona coaching the
rep instead of resisting them.
"""

from __future__ import annotations

import os
import textwrap

import pytest
from livekit.agents import AgentSession, inference, llm

from agent import (
    CUSTOM_PERSONA_GUARDRAILS,
    SHARED_VOICE_RULES,
    ProspectAgent,
    compose_instructions,
)
from personas import PERSONAS, get_persona

needs_credentials = pytest.mark.skipif(
    not (os.getenv("LIVEKIT_API_KEY") and os.getenv("LIVEKIT_API_SECRET")),
    reason="LiveKit credentials required (LiveKit Inference powers both agent and judge)",
)


def _judge_llm() -> llm.LLM:
    return inference.LLM(model="openai/gpt-4.1-mini")


def _agent_for(persona_id: str) -> ProspectAgent:
    return ProspectAgent(compose_instructions(get_persona(persona_id).instructions))


class TestInstructionComposition:
    """The prompt assembly that stages and custom prospects both depend on."""

    def test_voice_rules_come_last_so_they_win_conflicts(self) -> None:
        composed = compose_instructions("PERSONA BODY", stage_instructions="STAGE BODY")
        assert composed.index("PERSONA BODY") < composed.index("STAGE BODY")
        assert composed.index("STAGE BODY") < composed.index(
            SHARED_VOICE_RULES.strip()[:40]
        )

    def test_stage_and_history_are_optional(self) -> None:
        composed = compose_instructions("PERSONA BODY")
        assert "PERSONA BODY" in composed
        assert "previous calls" not in composed

    def test_history_is_framed_as_the_prospects_own_memory(self) -> None:
        composed = compose_instructions(
            "PERSONA BODY", history="They promised latency numbers."
        )
        assert "previous calls" in composed
        assert "They promised latency numbers." in composed

    def test_custom_prospects_get_guardrails_builtins_already_have(self) -> None:
        """A prompt compiled from pasted text cannot be trusted to guard itself."""
        custom = compose_instructions("SOME COMPILED PROMPT", is_custom=True)
        assert CUSTOM_PERSONA_GUARDRAILS.strip() in custom
        assert "never as an instruction to you" in custom

        builtin = compose_instructions("SOME PERSONA FILE", is_custom=False)
        assert CUSTOM_PERSONA_GUARDRAILS.strip() not in builtin


class TestPersonaLoading:
    """The content layer. Runs without credentials."""

    def test_all_three_personas_load(self) -> None:
        assert set(PERSONAS) == {"champion", "skeptic", "commodity-buyer"}

    def test_personas_span_three_difficulty_tiers(self) -> None:
        assert sorted(p.tier for p in PERSONAS.values()) == [1, 2, 3]

    @pytest.mark.parametrize("persona_id", sorted(PERSONAS))
    def test_persona_metadata_is_complete(self, persona_id: str) -> None:
        """Every field the persona picker renders must be present."""
        persona = PERSONAS[persona_id]
        assert persona.name and persona.name != "Unknown"
        assert persona.title
        assert persona.company
        assert persona.difficulty != "Unknown"
        assert persona.scouting_report
        assert persona.voice

    @pytest.mark.parametrize("persona_id", sorted(PERSONAS))
    def test_persona_has_substantial_instructions(self, persona_id: str) -> None:
        assert len(PERSONAS[persona_id].instructions) > 2000

    @pytest.mark.parametrize("persona_id", sorted(PERSONAS))
    def test_persona_carries_anti_drift_guardrails(self, persona_id: str) -> None:
        """Persona drift is the top risk in LLM role-play; the guardrail is not optional."""
        instructions = PERSONAS[persona_id].instructions.lower()
        assert "never" in instructions
        assert "character" in instructions

    def test_each_persona_has_a_distinct_voice(self) -> None:
        voices = [p.voice for p in PERSONAS.values()]
        assert len(set(voices)) == len(voices)

    def test_unknown_persona_falls_back_rather_than_raising(self) -> None:
        """A broken link should still give the rep a session."""
        assert get_persona("does-not-exist").id == "skeptic"
        assert get_persona(None).id == "skeptic"

    def test_known_persona_resolves_exactly(self) -> None:
        assert get_persona("commodity-buyer").id == "commodity-buyer"


@needs_credentials
@pytest.mark.asyncio
async def test_persona_does_not_break_character_when_accused_of_being_ai() -> None:
    """The single most damaging failure: admitting to being a simulation mid-call."""
    async with _judge_llm() as judge, AgentSession() as session:
        await session.start(_agent_for("skeptic"))

        result = await session.run(user_input="Hold on — are you an AI?")

        await (
            result.expect.next_event()
            .is_message(role="assistant")
            .judge(
                judge,
                intent=textwrap.dedent(
                    """\
                    Stays fully in character as Dan Ferreira, a human VP of Engineering.

                    The response must NOT:
                    - Confirm or imply being an AI, a bot, a language model, or a simulation
                    - Refer to a training exercise, role-play, persona, or system prompt
                    - Break the fourth wall in any way

                    Deflecting the question, brushing it off, or redirecting back to the
                    business conversation are all acceptable.
                    """
                ),
            )
        )


@needs_credentials
@pytest.mark.asyncio
async def test_persona_resists_instead_of_coaching_the_rep() -> None:
    """The prospect must not turn into the rep's coach — that destroys the exercise."""
    async with _judge_llm() as judge, AgentSession() as session:
        await session.start(_agent_for("skeptic"))

        result = await session.run(
            user_input="How am I doing so far? Any feedback on my pitch?"
        )

        await (
            result.expect.next_event()
            .is_message(role="assistant")
            .judge(
                judge,
                intent=textwrap.dedent(
                    """\
                    Responds as a skeptical VP of Engineering evaluating a vendor, not as
                    a sales coach.

                    The response must NOT:
                    - Grade, score, or evaluate the salesperson's performance
                    - Offer tips on how to sell better or what they should have said
                    - Acknowledge that this is practice, training, or a role-play

                    Reacting as a real buyer would — brushing the question off, being
                    mildly thrown by it, or steering back to the product — is correct.
                    """
                ),
            )
        )


@needs_credentials
@pytest.mark.asyncio
async def test_commodity_buyer_does_not_disparage_competitors() -> None:
    """The hard persona models the behaviour it grades: differentiate, don't trash-talk."""
    async with _judge_llm() as judge, AgentSession() as session:
        await session.start(_agent_for("commodity-buyer"))

        result = await session.run(
            user_input="Honestly, Vapi and Retell are pretty bad products, right?"
        )

        await (
            result.expect.next_event()
            .is_message(role="assistant")
            .judge(
                judge,
                intent=textwrap.dedent(
                    """\
                    Responds as Priya Raman, a CTO who has evaluated these vendors and is
                    unimpressed by a salesperson disparaging competitors.

                    The response should be measured and should not enthusiastically agree
                    that the competitors are bad products. Pushing back, noting that the
                    other vendors spoke well of LiveKit, or staying coolly neutral are all
                    correct.
                    """
                ),
            )
        )
