'use client';

import {
  BarVisualizer,
  useLocalParticipant,
  useTranscriptions,
  useVoiceAssistant,
} from '@livekit/components-react';
import { useCallback, useEffect, useRef } from 'react';
import PreCallBrief from '@/components/PreCallBrief';
import type { Campaign } from '@/lib/campaign';
import type { ProspectView } from '@/lib/prospect';
import { STAGES, type Stage, type StageId } from '@/lib/stages';
import type { TranscriptTurn } from '@/lib/types';

type Phase = 'briefing' | 'connecting' | 'live' | 'grading' | 'scored' | 'error';

interface Props {
  prospect: ProspectView;
  stage: Stage;
  campaign: Campaign | null;
  onSelectStage: (stage: StageId) => void;
  phase: Phase;
  error: string | null;
  elapsed: number;
  sessionSeconds: number;
  localIdentity: string;
  turns: TranscriptTurn[];
  onTurns: (turns: TranscriptTurn[]) => void;
  onStart: () => void;
  onEnd: () => void;
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Lifts live captions out of the room and up to SparRoom, which owns the transcript
 * that gets graded. Captions are needed on screen anyway, so this is the same data
 * serving both purposes rather than a second capture path.
 */
function TranscriptCapture({
  localIdentity,
  onTurns,
}: {
  localIdentity: string;
  onTurns: (turns: TranscriptTurn[]) => void;
}) {
  const transcriptions = useTranscriptions();
  const lastSerialized = useRef('');

  useEffect(() => {
    const next: TranscriptTurn[] = transcriptions
      .map((t) => ({
        speaker: (t.participantInfo.identity === localIdentity ? 'rep' : 'prospect') as
          | 'rep'
          | 'prospect',
        text: t.text.trim(),
      }))
      .filter((t) => t.text.length > 0);

    // The hook re-emits on every partial; only push upward when content actually moved.
    const serialized = JSON.stringify(next);
    if (serialized === lastSerialized.current) return;
    lastSerialized.current = serialized;
    onTurns(next);
  }, [transcriptions, localIdentity, onTurns]);

  return null;
}

function LiveIndicator() {
  const { state, audioTrack } = useVoiceAssistant();

  const label =
    state === 'speaking'
      ? 'Speaking'
      : state === 'listening'
        ? 'Listening'
        : state === 'thinking'
          ? 'Thinking'
          : 'Connecting';

  return (
    <div className="flex flex-col items-center gap-3 sm:gap-4">
      <div className="relative">
        <div
          className={`bg-surface-hi border-border-hi relative flex h-20 w-20 items-center justify-center rounded-full border sm:h-24 sm:w-24 ${
            state === 'speaking' ? 'pulse-ring' : ''
          }`}
        >
          <BarVisualizer
            state={state}
            barCount={5}
            trackRef={audioTrack}
            className="flex h-10 items-center gap-1"
            options={{ minHeight: 8 }}
          />
        </div>
      </div>
      <span className="mono text-faint text-[11px] tracking-widest uppercase">{label}</span>
    </div>
  );
}

function MicToggle() {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

  return (
    <button
      type="button"
      onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
      className={`border-border hover:border-border-hi rounded-lg border px-3 py-2 text-sm font-medium transition-colors sm:px-4 sm:py-2.5 ${
        isMicrophoneEnabled ? 'bg-surface text-muted' : 'bg-bad/15 border-bad/40 text-bad'
      }`}
    >
      {isMicrophoneEnabled ? 'Mute' : 'Unmute'}
    </button>
  );
}

export default function CallStage({
  prospect,
  stage,
  campaign,
  onSelectStage,
  phase,
  error,
  elapsed,
  sessionSeconds,
  localIdentity,
  turns,
  onTurns,
  onStart,
  onEnd,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);

  // Follow the conversation by default, but stop yanking the rep back to the bottom if
  // they have scrolled up to re-read something the prospect said.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    pinnedToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  }, []);

  useEffect(() => {
    if (!pinnedToBottom.current) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  const remaining = Math.max(0, sessionSeconds - elapsed);
  const nearlyDone = remaining <= 75;
  const priorCalls = campaign?.calls ?? [];
  const traps = prospect.objections.filter((o) => o.escalationTrap).length;

  if (phase === 'grading') {
    return (
      <div className="fade-up flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="border-border border-t-accent h-8 w-8 animate-spin rounded-full border-2" />
        <p className="text-muted text-sm">Scoring the call against the rubric…</p>
      </div>
    );
  }

  if (phase === 'briefing' || phase === 'error') {
    return (
      <div className="fade-up min-h-0 flex-1 overflow-y-auto pb-8">
        <p
          className="mono mb-3 text-[11px] tracking-[0.2em] uppercase"
          style={{ color: prospect.accent }}
        >
          {prospect.isCustom ? 'Your prospect' : 'Built-in'} · {prospect.difficulty}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{prospect.name}</h1>
        <p className="text-muted mt-1.5">
          {prospect.title} · {prospect.company}
        </p>

        {/* Stage picker */}
        <div className="mt-7">
          <h2 className="mono text-faint mb-2.5 text-[11px] tracking-widest uppercase">
            Where in the deal
          </h2>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s) => {
              const active = s.id === stage.id;
              const done = priorCalls.some((c) => c.stage === s.id && c.passed);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectStage(s.id)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    active
                      ? 'border-accent/50 bg-accent/10 text-accent'
                      : 'border-border bg-surface text-muted hover:border-border-hi'
                  }`}
                >
                  <span className="mono mr-1.5 opacity-60">{s.order}</span>
                  {s.label}
                  {done && <span className="text-good ml-1.5">✓</span>}
                </button>
              );
            })}
          </div>
          <p className="text-muted mt-3 text-sm leading-relaxed">{stage.summary}</p>
          <p className="text-faint mt-1.5 text-sm leading-relaxed">
            <span className="text-muted">Your objective:</span> {stage.objective}
          </p>
        </div>

        {/* What the prospect remembers */}
        {priorCalls.length > 0 && (
          <div className="border-border bg-surface mt-6 rounded-xl border p-4">
            <h2 className="mono text-faint mb-3 text-[11px] tracking-widest uppercase">
              What {prospect.name.split(' ')[0]} remembers
            </h2>
            <div className="space-y-3">
              {priorCalls.map((call, i) => (
                <div key={i} className="text-sm leading-relaxed">
                  <span className="mono text-faint mr-2 text-[10px] tracking-wider uppercase">
                    {call.stageLabel}
                  </span>
                  <span className={call.passed ? 'text-muted' : 'text-warn'}>
                    {call.prospectMemory}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-faint mt-3 text-[11px] leading-relaxed">
              They will hold you to anything you promised.
            </p>
          </div>
        )}

        <div className="border-border bg-surface mt-6 rounded-xl border p-5">
          <h2 className="mono text-faint mb-3 text-[11px] tracking-widest uppercase">
            Scouting report
          </h2>
          <p className="text-sm leading-relaxed">{prospect.scoutingReport}</p>
          {prospect.openingPosture && (
            <p className="text-muted mt-4 text-sm leading-relaxed">{prospect.openingPosture}</p>
          )}
        </div>

        <PreCallBrief brief={prospect.brief} accent={prospect.accent} />

        <div className="text-muted mt-6 space-y-2 text-sm">
          <p>
            <span className="text-text font-medium">They open the call.</span> Seven minute hard
            stop, then they wrap up whether you have closed or not.
          </p>
          {traps > 0 && (
            <p>
              <span className="text-text font-medium">
                {traps} of {prospect.objections.length} objections
              </span>{' '}
              are traps you should refuse to answer. Bringing an engineer scores better than a
              confident guess.
            </p>
          )}
        </div>

        {error && (
          <div className="border-bad/40 bg-bad/10 text-bad mt-6 rounded-lg border p-4 text-sm">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={onStart}
          className="bg-accent mt-8 w-full rounded-lg px-6 py-3.5 font-semibold text-black transition-opacity hover:opacity-90 sm:w-auto"
        >
          {phase === 'error' ? 'Try again' : `Start ${stage.label.toLowerCase()} call`}
        </button>
        <p className="text-faint mt-3 text-xs">
          Your browser will ask for microphone access. Headphones recommended.
        </p>
      </div>
    );
  }

  return (
    <div className="fade-up flex min-h-0 flex-1 flex-col">
      <TranscriptCapture localIdentity={localIdentity} onTurns={onTurns} />

      {/* Controls stay pinned at the top: the end of a call is exactly when a rep is
          least inclined to go hunting for a button at the bottom of a growing page. */}
      <div className="border-border flex shrink-0 items-center justify-between gap-3 border-b pb-4">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold sm:text-lg">{prospect.name}</h1>
          <p className="text-faint truncate text-xs">
            {stage.label} · {prospect.company}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="mr-0.5 text-right sm:mr-1">
            <p className={`mono text-base leading-none ${nearlyDone ? 'text-warn' : 'text-muted'}`}>
              {formatClock(remaining)}
            </p>
            {/* The label is the first thing to go when the bar gets tight. */}
            <p className="text-faint mono mt-1 hidden text-[9px] tracking-widest uppercase sm:block">
              {nearlyDone ? 'Hard stop' : 'Left'}
            </p>
          </div>
          <MicToggle />
          <button
            type="button"
            onClick={onEnd}
            className="bg-bad/15 border-bad/40 text-bad hover:bg-bad/25 rounded-lg border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors sm:px-4"
          >
            End call
          </button>
        </div>
      </div>

      <div className="shrink-0 py-4 sm:py-6">
        {phase === 'connecting' ? (
          <div className="flex flex-col items-center gap-3">
            <div className="border-border border-t-accent h-7 w-7 animate-spin rounded-full border-2" />
            <p className="text-muted text-sm">Connecting…</p>
          </div>
        ) : (
          <LiveIndicator />
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="transcript-scroll border-border bg-surface min-h-0 flex-1 overflow-y-auto rounded-xl border p-4"
      >
        {turns.length === 0 ? (
          <p className="text-faint py-8 text-center text-sm">
            {prospect.name.split(' ')[0]} will open the call.
          </p>
        ) : (
          <div className="space-y-3">
            {turns.map((turn, i) => (
              <div key={i} className="text-sm leading-relaxed">
                <span
                  className="mono mr-2 text-[10px] tracking-widest uppercase"
                  style={{ color: turn.speaker === 'rep' ? 'var(--accent)' : prospect.accent }}
                >
                  {turn.speaker === 'rep' ? 'You' : prospect.name.split(' ')[0]}
                </span>
                <span className={turn.speaker === 'rep' ? 'text-text' : 'text-muted'}>
                  {turn.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* The button label is short so it fits the top bar; this carries the meaning. */}
      <p className="text-faint mt-3 shrink-0 text-center text-[11px]">
        Ending the call scores it. {prospect.name.split(' ')[0]} will wrap up on their own at
        the hard stop.
      </p>
    </div>
  );
}
