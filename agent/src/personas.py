"""Persona loading.

Personas are markdown files in `agent/personas/` with a small YAML-ish frontmatter
block. They are the content layer of the product: editing a persona file changes the
training program, with no code change and no redeploy of anything but the agent.

The frontmatter is parsed by hand rather than with PyYAML. The schema is five flat
string fields and one integer; adding a YAML dependency to read it would be the
larger of the two costs.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

PERSONAS_DIR = Path(__file__).resolve().parent.parent / "personas"

# Voice assignments use LiveKit Inference's Inworld voices. The four voices below are
# the ones LiveKit documents by name; the full roster lives in the Inworld playground.
# Swapping a voice is a one-line change here.
#   Ashley - warm, natural American female
#   Edward - fast-talking, emphatic American male
#   Olivia - upbeat, friendly British female
#   Diego  - soothing, gentle Mexican male
DEFAULT_TTS_MODEL = "inworld/inworld-tts-2"
VOICES: dict[str, str] = {
    "champion": "Ashley",
    "skeptic": "Edward",
    "commodity-buyer": "Olivia",
}
FALLBACK_VOICE = "Ashley"


@dataclass(frozen=True)
class Persona:
    """A synthetic prospect: who they are, and the prompt that makes them behave."""

    id: str
    name: str
    title: str
    company: str
    difficulty: str
    tier: int
    scouting_report: str
    instructions: str

    @property
    def voice(self) -> str:
        return VOICES.get(self.id, FALLBACK_VOICE)

    @property
    def display(self) -> str:
        return f"{self.name} — {self.title}, {self.company}"


def _parse_frontmatter(raw: str) -> tuple[dict[str, str], str]:
    """Split a `---` delimited frontmatter block from the markdown body.

    Returns ({}, raw) for files with no frontmatter so a malformed persona still
    loads as a usable prompt rather than crashing the worker at dispatch time.
    """
    if not raw.startswith("---"):
        return {}, raw

    parts = raw.split("---", 2)
    if len(parts) < 3:
        return {}, raw

    meta: dict[str, str] = {}
    for line in parts[1].strip().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip().strip("\"'")

    return meta, parts[2].strip()


def _load_one(path: Path) -> Persona:
    meta, body = _parse_frontmatter(path.read_text(encoding="utf-8"))

    try:
        tier = int(meta.get("tier", "0"))
    except ValueError:
        tier = 0

    return Persona(
        id=meta.get("id", path.stem),
        name=meta.get("name", "Unknown"),
        title=meta.get("title", ""),
        company=meta.get("company", ""),
        difficulty=meta.get("difficulty", "Unknown"),
        tier=tier,
        scouting_report=meta.get("voice_scouting_report", ""),
        instructions=body,
    )


def load_personas() -> dict[str, Persona]:
    """Load every persona file, keyed by id. Called once at worker startup."""
    if not PERSONAS_DIR.is_dir():
        raise FileNotFoundError(f"personas directory not found: {PERSONAS_DIR}")

    personas = {}
    for path in sorted(PERSONAS_DIR.glob("*.md")):
        persona = _load_one(path)
        personas[persona.id] = persona

    if not personas:
        raise FileNotFoundError(f"no persona files found in {PERSONAS_DIR}")

    return personas


PERSONAS = load_personas()
DEFAULT_PERSONA_ID = "skeptic"


def get_persona(persona_id: str | None) -> Persona:
    """Resolve a persona id, falling back to the default rather than failing a call.

    A rep who lands on a broken link should still get a sparring session.
    """
    if persona_id and persona_id in PERSONAS:
        return PERSONAS[persona_id]
    return PERSONAS.get(DEFAULT_PERSONA_ID) or next(iter(PERSONAS.values()))
