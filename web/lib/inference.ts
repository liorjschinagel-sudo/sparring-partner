/**
 * Minimal client for LiveKit Inference.
 *
 * LiveKit Inference exposes an OpenAI-compatible chat completions endpoint at
 * `agent-gateway.livekit.cloud/v1`, authenticated with a short-lived LiveKit JWT
 * carrying an inference grant. That means the grading route needs no OpenAI key of
 * its own — the whole project runs on LIVEKIT_API_KEY / LIVEKIT_API_SECRET.
 *
 * Verified against livekit-agents 1.6.9's `inference/_utils.py`, which is where the
 * gateway URL and the `InferenceGrants(perform=True)` token shape come from.
 */

import { AccessToken } from 'livekit-server-sdk';

const DEFAULT_GATEWAY = 'https://agent-gateway.livekit.cloud/v1';
const STAGING_GATEWAY = 'https://agent-gateway.staging.livekit.cloud/v1';

/** Mirrors get_default_inference_url() in the Python SDK. */
export function inferenceBaseUrl(): string {
  if (process.env.LIVEKIT_INFERENCE_URL) return process.env.LIVEKIT_INFERENCE_URL;
  if ((process.env.LIVEKIT_URL ?? '').includes('.staging.livekit.cloud')) {
    return STAGING_GATEWAY;
  }
  return DEFAULT_GATEWAY;
}

async function inferenceToken(): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error('LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set');
  }

  const at = new AccessToken(apiKey, apiSecret, { identity: 'sparring-grader', ttl: '10m' });
  at.addInferenceGrant({ perform: true });
  return at.toJwt();
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * One chat completion against LiveKit Inference, returning raw text.
 *
 * `responseFormat: 'json_object'` is not requested because the gateway's support for
 * it varies by upstream model; the caller extracts JSON from the response instead,
 * which is the more robust path for a single-shot grading call.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  opts: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const token = await inferenceToken();

  const res = await fetch(`${inferenceBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model ?? 'openai/gpt-4.1',
      messages,
      temperature: opts.temperature ?? 0.2,
      max_completion_tokens: opts.maxTokens ?? 2000,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`inference gateway ${res.status}: ${detail.slice(0, 400)}`);
  }

  const body = await res.json();
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('inference gateway returned no message content');
  }
  return content;
}

/**
 * Pull a JSON object out of a model response, tolerating markdown fences and any
 * preamble the model decided to add.
 */
export function extractJson<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : raw).trim();

  try {
    return JSON.parse(candidate) as T;
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1)) as T;
    }
    throw new Error('could not parse JSON from model response');
  }
}
