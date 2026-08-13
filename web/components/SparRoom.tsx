'use client';

import { RoomAudioRenderer, RoomContext } from '@livekit/components-react';
import { Room, RoomEvent } from 'livekit-client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CallStage from '@/components/CallStage';
import Scorecard from '@/components/Scorecard';
import {
  type Campaign,
  buildHistoryPrompt,
  callPassed,
  getCampaign,
  recordCall,
} from '@/lib/campaign';
import type { ProspectView } from '@/lib/prospect';
import { type StageId, getStage } from '@/lib/stages';
import type { Scorecard as ScorecardData, TranscriptTurn } from '@/lib/types';

type Phase = 'briefing' | 'connecting' | 'live' | 'grading' | 'scored' | 'error';

/** Matches the agent's clock in agent/src/agent.py. */
const SESSION_SECONDS = 7 * 60;

export default function SparRoom({
  prospect,
  initialStage,
}: {
  prospect: ProspectView;
  initialStage: StageId;
}) {
  // Bumped to start a fresh session: a disconnected Room is not reused, and every
  // piece of per-call state is reset with it.
  const [sessionKey, setSessionKey] = useState(0);
  const room = useMemo(
    () => new Room({ adaptiveStream: true, dynacast: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionKey]
  );

  const [phase, setPhase] = useState<Phase>('briefing');
  const [stageId, setStageId] = useState<StageId>(initialStage);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scorecard, setScorecard] = useState<ScorecardData | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [localIdentity, setLocalIdentity] = useState<string>('');

  // Held in a ref as well as state: the grading POST fires from an event handler that
  // would otherwise close over a stale transcript.
  const turnsRef = useRef<TranscriptTurn[]>([]);
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const startedAt = useRef<number>(0);
  const graded = useRef(false);
  const stageRef = useRef<StageId>(initialStage);

  // localStorage is client-only, so campaign state loads after mount.
  useEffect(() => {
    const existing = getCampaign(prospect.key);
    setCampaign(existing);
    if (existing && !existing.closedWon) {
      setStageId(existing.stage);
      stageRef.current = existing.stage;
    }
  }, [prospect.key]);

  const selectStage = useCallback((next: StageId) => {
    setStageId(next);
    stageRef.current = next;
  }, []);

  const handleTurns = useCallback((next: TranscriptTurn[]) => {
    turnsRef.current = next;
    setTurns(next);
  }, []);

  const grade = useCallback(async () => {
    if (graded.current) return;
    graded.current = true;

    const durationSeconds = startedAt.current
      ? Math.round((Date.now() - startedAt.current) / 1000)
      : 0;

    setPhase('grading');
    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: prospect.isCustom ? undefined : prospect.id,
          personaName: prospect.name,
          mode: prospect.mode,
          stage: stageRef.current,
          turns: turnsRef.current,
          durationSeconds,
          // Custom prospects bring their own queue and brief; built-ins resolve server-side.
          objections: prospect.isCustom ? prospect.objections : undefined,
          brief: prospect.isCustom ? prospect.brief : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Grading failed');

      const card = data as ScorecardData;
      setScorecard(card);

      // Deals progress; a qualification call does not. SDR mode keeps no campaign.
      if (prospect.mode !== 'sdr') {
        const passed = callPassed(card.overallGrade, card.failedEscalation);
        setCampaign(
          recordCall(prospect.key, prospect.name, {
            stage: card.stage,
            stageLabel: card.stageLabel,
            overallGrade: card.overallGrade,
            passed,
            prospectMemory: card.prospectMemory,
            at: Date.now(),
          })
        );
      }

      setPhase('scored');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grading failed');
      setPhase('error');
    }
  }, [prospect]);

  const endCall = useCallback(async () => {
    await room.disconnect();
    await grade();
  }, [room, grade]);

  const startCall = useCallback(async () => {
    setPhase('connecting');
    setError(null);
    try {
      const res = await fetch('/api/connection-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: prospect.isCustom ? undefined : prospect.id,
          mode: prospect.mode,
          stage: stageRef.current,
          history:
            prospect.mode === 'sdr' ? undefined : buildHistoryPrompt(getCampaign(prospect.key)),
          customPrompt: prospect.systemPrompt,
          displayName: prospect.name,
          voice: prospect.voice,
        }),
      });
      const details = await res.json();
      if (!res.ok) throw new Error(details?.error ?? 'Could not get connection details');

      setLocalIdentity(details.participantIdentity);
      await room.connect(details.serverUrl, details.participantToken);
      await room.localParticipant.setMicrophoneEnabled(true);

      startedAt.current = Date.now();
      setPhase('live');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not start the call. Check your microphone.'
      );
      setPhase('error');
    }
  }, [prospect, room]);

  // The agent hangs up at its own hard stop; grade whatever we have when it does.
  useEffect(() => {
    const onDisconnected = () => {
      if (startedAt.current) void grade();
    };
    room.on(RoomEvent.Disconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
  }, [room, grade]);

  useEffect(() => {
    return () => {
      void room.disconnect();
    };
  }, [room]);

  useEffect(() => {
    if (phase !== 'live') return;
    const id = setInterval(() => {
      setElapsed(Math.round((Date.now() - startedAt.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [phase]);

  const restart = useCallback(
    (stage?: StageId) => {
      turnsRef.current = [];
      startedAt.current = 0;
      graded.current = false;
      setTurns([]);
      setScorecard(null);
      setError(null);
      setElapsed(0);
      setLocalIdentity('');
      if (stage) selectStage(stage);
      setPhase('briefing');
      setSessionKey((k) => k + 1);
    },
    [selectStage]
  );

  if (phase === 'scored' && scorecard) {
    return (
      <Scorecard
        prospect={prospect}
        scorecard={scorecard}
        transcript={turns}
        campaign={campaign}
        onRestart={restart}
        onCampaignChange={setCampaign}
      />
    );
  }

  return (
    <RoomContext.Provider value={room}>
      <RoomAudioRenderer />
      <CallStage
        prospect={prospect}
        stage={getStage(stageId)}
        campaign={campaign}
        onSelectStage={selectStage}
        phase={phase}
        error={error}
        elapsed={elapsed}
        sessionSeconds={SESSION_SECONDS}
        localIdentity={localIdentity}
        turns={turns}
        onTurns={handleTurns}
        onStart={startCall}
        onEnd={endCall}
      />
    </RoomContext.Provider>
  );
}
