/**
 * Mints a LiveKit access token for a sparring session.
 *
 * Everything the agent needs about *this particular call* travels in explicit dispatch
 * metadata: which prospect, where in the funnel, and what they remember from previous
 * calls. Stage prompts live here rather than in the agent so that adding a stage is a
 * web-only change with no agent redeploy.
 *
 * Metadata is capped at 512 KiB by LiveKit. A compiled persona is a few KB; the raw
 * source a rep pasted (a Gong transcript, say) is distilled before it ever gets here.
 */

import { AccessToken, RoomAgentDispatch, RoomConfiguration } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';
import { getPersona } from '@/lib/personas';
import { getStage } from '@/lib/stages';

// Tokens are per-session and must never be cached.
export const revalidate = 0;

const AGENT_NAME = 'sparring-partner';
const TOKEN_TTL = '20m';

// Well under LiveKit's 512 KiB metadata cap, but low enough to catch a caller trying to
// push a whole transcript through instead of a compiled prompt.
const MAX_PROMPT_CHARS = 40_000;
const MAX_HISTORY_CHARS = 8_000;

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

interface ConnectionRequest {
  personaId?: string;
  stage?: string;
  /** Prior-call summaries, already condensed by the campaign store. */
  history?: string;
  /** Set for runtime-authored prospects; replaces the persona file entirely. */
  customPrompt?: string;
  displayName?: string;
  voice?: string;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  return createConnectionDetails({
    personaId: params.get('persona') ?? undefined,
    stage: params.get('stage') ?? undefined,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return createConnectionDetails(body ?? {});
}

async function createConnectionDetails(body: ConnectionRequest) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !serverUrl) {
    return NextResponse.json(
      {
        error:
          'Server is missing LiveKit credentials. Set LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET.',
      },
      { status: 500 }
    );
  }

  const stage = getStage(body.stage);
  const customPrompt = body.customPrompt?.trim();

  // Resolve who the rep is about to talk to.
  let slug: string;
  let metadata: Record<string, string>;

  if (customPrompt) {
    if (customPrompt.length > MAX_PROMPT_CHARS) {
      return NextResponse.json(
        { error: 'Custom prospect prompt is too large. Compile it before starting a call.' },
        { status: 413 }
      );
    }
    slug = 'custom';
    metadata = {
      custom_prompt: customPrompt,
      display_name: body.displayName?.slice(0, 120) ?? 'Prospect',
      voice: body.voice ?? 'Ashley',
    };
  } else {
    const persona = getPersona(body.personaId ?? '');
    if (!persona) {
      return NextResponse.json({ error: `Unknown persona: ${body.personaId}` }, { status: 400 });
    }
    slug = persona.id;
    metadata = { persona_id: persona.id, display_name: persona.name };
  }

  metadata.stage = stage.id;
  metadata.stage_instructions = stage.agentInstructions;
  if (body.history?.trim()) {
    metadata.history = body.history.trim().slice(0, MAX_HISTORY_CHARS);
  }

  const roomName = `sp_${slug}_${randomSuffix()}`;
  const identity = `rep_${randomSuffix()}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: 'Rep',
    ttl: TOKEN_TTL,
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  // Explicit dispatch: this is what carries the whole brief to the agent.
  at.roomConfig = new RoomConfiguration({
    agents: [
      new RoomAgentDispatch({
        agentName: AGENT_NAME,
        metadata: JSON.stringify(metadata),
      }),
    ],
  });

  return NextResponse.json(
    {
      serverUrl,
      roomName,
      participantToken: await at.toJwt(),
      participantIdentity: identity,
      personaId: slug,
      stage: stage.id,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
