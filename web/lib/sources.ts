/**
 * Every source the scorecard is allowed to cite.
 *
 * The grader never writes URLs. It picks ids from this registry and we resolve them here,
 * which means a coaching note cannot invent a link to a page that does not exist. Unknown
 * ids are dropped rather than rendered.
 *
 * All URLs verified to resolve in August 2026. If LiveKit reorganises their docs, this is
 * the one file to fix, and `pnpm check:sources` will tell you which entries broke.
 */

export interface Source {
  id: string;
  title: string;
  url: string;
  /** Why a rep would open it, shown as the link's subtitle. */
  why: string;
}

export const SOURCES: Record<string, Source> = {
  pricing: {
    id: 'pricing',
    title: 'LiveKit pricing',
    url: 'https://livekit.com/pricing',
    why: 'Plan limits and the per-minute rates for agent, telephony, STT, TTS and LLM.',
  },
  turns: {
    id: 'turns',
    title: 'Turn detection and interruptions',
    url: 'https://docs.livekit.io/agents/build/turns/',
    why: 'How end-of-turn uses semantics and acoustics on top of VAD, and how adaptive interruption ignores backchannels.',
  },
  audio: {
    id: 'audio',
    title: 'Audio, preemptive generation and latency',
    url: 'https://docs.livekit.io/agents/build/audio/',
    why: 'The architectural levers on perceived latency, and what they trade off.',
  },
  realtime: {
    id: 'realtime',
    title: 'OpenAI Realtime integration',
    url: 'https://docs.livekit.io/agents/integrations/openai/realtime/',
    why: 'What Realtime does natively and what still has to be built around it.',
  },
  voiceAi: {
    id: 'voiceAi',
    title: 'Voice AI quickstart',
    url: 'https://docs.livekit.io/agents/start/voice-ai/',
    why: 'The shape of a working pipeline, useful when a prospect asks what building on LiveKit involves.',
  },
  modelsLlm: {
    id: 'modelsLlm',
    title: 'LLM models available',
    url: 'https://docs.livekit.io/agents/models/llm/',
    why: 'The model roster, which is the concrete answer to portability and lock-in questions.',
  },
  modelsStt: {
    id: 'modelsStt',
    title: 'STT models available',
    url: 'https://docs.livekit.io/agents/models/stt/',
    why: 'Speech-to-text options and how they differ on accuracy and cost.',
  },
  modelsTts: {
    id: 'modelsTts',
    title: 'TTS models available',
    url: 'https://docs.livekit.io/agents/models/tts/',
    why: 'Voice options, and the line item that usually dominates a cost model.',
  },
  dispatch: {
    id: 'dispatch',
    title: 'Agent dispatch',
    url: 'https://docs.livekit.io/agents/server/agent-dispatch/',
    why: 'How agents are assigned to rooms, health-monitored and failed over.',
  },
  sip: {
    id: 'sip',
    title: 'SIP and telephony',
    url: 'https://docs.livekit.io/sip/',
    why: 'How LiveKit sits alongside existing telephony instead of replacing it.',
  },
  selfHost: {
    id: 'selfHost',
    title: 'Self-hosting LiveKit',
    url: 'https://docs.livekit.io/home/self-hosting/deployment/',
    why: 'The honest answer to lock-in questions: the server is open source and you can run it.',
  },
  deploy: {
    id: 'deploy',
    title: 'Agent deployment',
    url: 'https://docs.livekit.io/deploy/agents/quickstart/',
    why: 'What the managed plane actually operates on your behalf.',
  },
  ossServer: {
    id: 'ossServer',
    title: 'livekit/livekit on GitHub',
    url: 'https://github.com/livekit/livekit',
    why: 'The WebRTC SFU itself, Apache licensed. Useful when someone claims you are closed source.',
  },
  ossAgents: {
    id: 'ossAgents',
    title: 'livekit/agents on GitHub',
    url: 'https://github.com/livekit/agents',
    why: 'The framework source and release cadence, for questions about maturity and pace of change.',
  },
  openaiPartnership: {
    id: 'openaiPartnership',
    title: 'LiveKit and OpenAI partnership',
    url: 'https://livekit.com/blog/openai-livekit-partnership-advanced-voice-realtime-api',
    why: 'LiveKit is the transport behind ChatGPT Advanced Voice Mode. The strongest single proof point at consumer scale.',
  },
};

export const SOURCE_IDS = Object.keys(SOURCES);

/** Resolve ids to sources, silently dropping anything not in the registry. */
export function resolveSources(ids: string[] | undefined): Source[] {
  if (!ids?.length) return [];
  const seen = new Set<string>();
  return ids
    .filter((id) => {
      if (seen.has(id) || !SOURCES[id]) return false;
      seen.add(id);
      return true;
    })
    .map((id) => SOURCES[id]);
}

/** Compact catalogue for the grader prompt, so it can only pick real ids. */
export function sourceCatalogue(): string {
  return Object.values(SOURCES)
    .map((s) => `- ${s.id}: ${s.title}. ${s.why}`)
    .join('\n');
}
