'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ADVANCE_MIN_GRADE, type Campaign, advance, callPassed } from '@/lib/campaign';
import { ENTERPRISE_HEADCOUNT, VERDICT_LABEL } from '@/lib/modes';
import type { ProspectView } from '@/lib/prospect';
import { type StageId, getStage, nextStage } from '@/lib/stages';
import type { GradedDimension, Scorecard as ScorecardData, TranscriptTurn } from '@/lib/types';

function gradeColor(grade: number | null): string {
  if (grade === null) return 'var(--faint)';
  if (grade >= 4) return 'var(--good)';
  if (grade === 3) return 'var(--warn)';
  return 'var(--bad)';
}

const GRADE_LABEL: Record<number, string> = {
  5: 'Advances the deal',
  4: 'Solid',
  3: 'Survivable',
  2: 'Weak',
  1: 'Damaging',
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function DimensionCard({ title, dim }: { title: string; dim: GradedDimension }) {
  return (
    <div className="border-border bg-surface rounded-xl border p-5">
      <h2 className="mono text-faint mb-3 text-[11px] tracking-widest uppercase">{title}</h2>
      <p className="mono text-3xl font-semibold" style={{ color: gradeColor(dim.grade) }}>
        {dim.grade ?? ''}
        <span className="text-faint text-base font-normal">/5</span>
      </p>
      <p className="text-muted mt-3 text-sm leading-relaxed">{dim.note}</p>
    </div>
  );
}

export default function Scorecard({
  prospect,
  scorecard,
  transcript,
  campaign,
  onRestart,
  onCampaignChange,
}: {
  prospect: ProspectView;
  scorecard: ScorecardData;
  transcript: TranscriptTurn[];
  campaign: Campaign | null;
  onRestart: (stage?: StageId) => void;
  onCampaignChange: (campaign: Campaign | null) => void;
}) {
  const [showTranscript, setShowTranscript] = useState(false);

  const raised = scorecard.objections.filter((o) => o.raised);
  const passed = callPassed(scorecard.overallGrade, scorecard.failedEscalation);
  const isSdr = scorecard.mode === 'sdr';
  const capped =
    scorecard.failedEscalation &&
    scorecard.rawOverallGrade !== null &&
    scorecard.overallGrade !== null &&
    scorecard.rawOverallGrade > scorecard.overallGrade;
  const stage = getStage(scorecard.stage);
  const upcoming = nextStage(scorecard.stage);
  const alreadyAdvanced = campaign ? campaign.stage !== scorecard.stage : false;

  const handleAdvance = () => {
    const updated = advance(prospect.key);
    onCampaignChange(updated);
    if (updated && !updated.closedWon) onRestart(updated.stage);
    else onCampaignChange(updated);
  };

  const closedWon = campaign?.closedWon ?? false;

  return (
    <div className="fade-up min-h-0 flex-1 overflow-y-auto pb-16">
      <p className="mono text-faint mb-3 text-[11px] tracking-[0.2em] uppercase">
        Scorecard · {scorecard.stageLabel}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {scorecard.personaName}
        <span className="text-faint font-normal"> · {prospect.difficulty}</span>
      </h1>

      {/* Deal progression. AE mode only: a qualification call does not advance anything. */}
      {isSdr ? null : closedWon ? (
        <div className="border-good/40 bg-good/10 mt-6 rounded-xl border p-5">
          <h2 className="text-good text-lg font-semibold">Closed won</h2>
          <p className="text-muted mt-1.5 text-sm leading-relaxed">
            You took {scorecard.personaName} from a cold first call to signature across{' '}
            {campaign?.calls.length ?? 0} conversations, without bluffing your way through a
            single escalation trap.
          </p>
        </div>
      ) : (
        <div
          className={`mt-6 rounded-xl border p-5 ${
            passed ? 'border-good/40 bg-good/10' : 'border-warn/40 bg-warn/10'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className={`font-semibold ${passed ? 'text-good' : 'text-warn'}`}>
                {passed ? `${stage.label} cleared` : `${stage.label} not cleared`}
              </h2>
              <p className="text-muted mt-1 text-sm leading-relaxed">
                {passed
                  ? upcoming
                    ? `The deal moves to ${upcoming.label}. ${scorecard.personaName.split(' ')[0]} will remember this call.`
                    : 'That was the last stage. Advance to close it out.'
                  : scorecard.failedEscalation
                    ? 'You bluffed something that needed escalating. That does not advance a deal, whatever the average says.'
                    : `You need a mean of ${ADVANCE_MIN_GRADE} across the objections raised. Run it again.`}
              </p>
            </div>
            {passed && !alreadyAdvanced && (
              <button
                type="button"
                onClick={handleAdvance}
                className="bg-accent shrink-0 rounded-lg px-5 py-2.5 font-semibold text-black transition-opacity hover:opacity-90"
              >
                {upcoming ? `Advance to ${upcoming.label}` : 'Close the deal'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Headline numbers */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="mono text-faint text-[10px] tracking-widest uppercase">Overall</p>
          <p
            className="mono mt-2 text-3xl font-semibold"
            style={{ color: gradeColor(scorecard.overallGrade) }}
          >
            {scorecard.overallGrade ?? ''}
            <span className="text-faint text-base font-normal">/5</span>
          </p>
          {/* Show the working rather than an unexplained low number. */}
          {capped && (
            <p className="text-warn mt-1.5 text-[11px] leading-snug">
              Capped from {scorecard.rawOverallGrade}. You bluffed a trap.
            </p>
          )}
        </div>

        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="mono text-faint text-[10px] tracking-widest uppercase">You talked</p>
          <p className="mono text-text mt-2 text-3xl font-semibold">
            {scorecard.talkRatio.repSharePct}
            <span className="text-faint text-base font-normal">%</span>
          </p>
        </div>

        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="mono text-faint text-[10px] tracking-widest uppercase">Objections</p>
          <p className="mono text-text mt-2 text-3xl font-semibold">
            {raised.length}
            <span className="text-faint text-base font-normal">
              /{scorecard.objections.length}
            </span>
          </p>
        </div>

        <div className="border-border bg-surface rounded-xl border p-4">
          <p className="mono text-faint text-[10px] tracking-widest uppercase">Duration</p>
          <p className="mono text-text mt-2 text-2xl font-semibold">
            {formatDuration(scorecard.durationSeconds)}
          </p>
        </div>
      </div>

      {/* SDR verdict */}
      {scorecard.qualification && (
        <section className="mt-8">
          <h2 className="mono text-faint mb-3 text-[11px] tracking-widest uppercase">
            Qualification
          </h2>

          <div
            className={`rounded-xl border p-5 ${
              scorecard.qualification.verdictCorrect
                ? 'border-good/40 bg-good/10'
                : 'border-bad/40 bg-bad/10'
            }`}
          >
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <div>
                <p className="mono text-faint text-[10px] tracking-widest uppercase">You said</p>
                <p className="mt-1 font-semibold">
                  {scorecard.qualification.repVerdict === 'none'
                    ? 'Never landed a verdict'
                    : VERDICT_LABEL[scorecard.qualification.repVerdict]}
                </p>
              </div>
              <div>
                <p className="mono text-faint text-[10px] tracking-widest uppercase">
                  Right answer
                </p>
                <p className="mt-1 font-semibold">
                  {VERDICT_LABEL[scorecard.qualification.correctVerdict]}
                  {scorecard.qualification.correctSegment !== 'None' && (
                    <span className="text-muted font-normal">
                      {' '}
                      · {scorecard.qualification.correctSegment}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <p className="text-muted mt-4 text-sm leading-relaxed">
              {scorecard.qualification.rationale}
            </p>
          </div>

          {/* The four facts */}
          <div className="border-border divide-border bg-surface mt-3 divide-y rounded-xl border">
            {scorecard.qualification.criteria.map((c) => (
              <div key={c.id} className="flex items-start gap-3 p-4">
                <span
                  className="mono mt-0.5 w-14 shrink-0 text-[10px] tracking-widest uppercase"
                  style={{ color: c.established ? 'var(--good)' : 'var(--bad)' }}
                >
                  {c.established ? 'Got it' : 'Missed'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-muted mt-1 text-sm leading-relaxed">{c.note}</p>
                </div>
              </div>
            ))}
          </div>

          {/* The reputation trap */}
          <div
            className={`mt-3 rounded-xl border p-4 ${
              scorecard.qualification.reputationTrap.avoided
                ? 'border-good/30 bg-good/5'
                : 'border-bad/30 bg-bad/5'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className="mono mt-0.5 shrink-0 text-[10px] tracking-widest uppercase"
                style={{
                  color: scorecard.qualification.reputationTrap.avoided
                    ? 'var(--good)'
                    : 'var(--bad)',
                }}
              >
                {scorecard.qualification.reputationTrap.avoided ? 'Held' : 'Fell for it'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Qualified on the use case, not the logo</p>
                <p className="text-muted mt-1 text-sm leading-relaxed">
                  {scorecard.qualification.reputationTrap.note}
                </p>
              </div>
            </div>
          </div>

          {!scorecard.qualification.segmentCorrect &&
            scorecard.qualification.correctSegment !== 'None' && (
              <p className="text-faint mt-3 text-xs leading-relaxed">
                Routing matters as much as the verdict. {ENTERPRISE_HEADCOUNT.toLocaleString()}{' '}
                employees or more is Enterprise, and getting that wrong sends the lead to the
                wrong team with the wrong motion.
              </p>
            )}
        </section>
      )}

      {/* Coaching */}
      {scorecard.coaching && (
        <section className="border-accent/25 bg-accent/5 mt-8 rounded-xl border p-5">
          <h2 className="mono text-accent mb-3 text-[11px] tracking-widest uppercase">Coaching</h2>
          <p className="text-sm leading-relaxed">{scorecard.coaching}</p>
        </section>
      )}

      {/* Escalation judgment */}
      {scorecard.escalation.length > 0 && (
        <section className="mt-8">
          <h2 className="mono text-faint mb-3 text-[11px] tracking-widest uppercase">
            Escalation judgment
          </h2>
          <div className="space-y-2">
            {scorecard.escalation.map((moment, i) => (
              <div
                key={i}
                className={`rounded-lg border p-4 ${
                  moment.handled ? 'border-good/30 bg-good/5' : 'border-bad/30 bg-bad/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mono mt-0.5 text-[10px] tracking-widest uppercase"
                    style={{ color: moment.handled ? 'var(--good)' : 'var(--bad)' }}
                  >
                    {moment.handled ? 'Pass' : 'Miss'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{moment.trigger}</p>
                    <p className="text-muted mt-1 text-sm leading-relaxed">{moment.note}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {scorecard.failedEscalation && (
            <p className="text-faint mt-3 text-xs leading-relaxed">
              A miss counts even when the answer was factually right. The rubric grades the
              process, because a rep who guesses right today guesses wrong next quarter. It also
              blocks the deal from advancing.
            </p>
          )}
        </section>
      )}

      {/* Per-objection */}
      <section className="mt-8">
        <h2 className="mono text-faint mb-3 text-[11px] tracking-widest uppercase">
          Objection by objection
        </h2>
        <div className="border-border divide-border bg-surface divide-y rounded-xl border">
          {scorecard.objections.map((o) => (
            <div key={o.id} className="p-4">
              <div className="flex items-start gap-3">
                <span
                  className="mono w-8 shrink-0 text-lg font-semibold"
                  style={{ color: gradeColor(o.grade) }}
                >
                  {o.grade ?? ''}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{o.label}</p>
                    {o.escalationTrap && (
                      <span className="mono border-warn/40 text-warn rounded-full border px-2 py-0.5 text-[9px] tracking-wider uppercase">
                        Trap
                      </span>
                    )}
                    {o.fromStage && (
                      <span className="mono border-border-hi text-faint rounded-full border px-2 py-0.5 text-[9px] tracking-wider uppercase">
                        {scorecard.stageLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-muted mt-1.5 text-sm leading-relaxed">{o.note}</p>
                  {o.grade !== null && (
                    <p className="text-faint mono mt-2 text-[10px] tracking-wider uppercase">
                      {GRADE_LABEL[o.grade]}
                    </p>
                  )}
                  {!o.raised && (
                    <p className="text-faint mono mt-2 text-[10px] tracking-wider uppercase">
                      Not raised
                    </p>
                  )}

                  {/* What to say next time, for anything they did not win. */}
                  {o.remediation && (
                    <div className="border-accent/25 bg-accent/5 mt-3 rounded-lg border p-3.5">
                      <h4 className="mono text-accent mb-2 text-[10px] tracking-widest uppercase">
                        What wins this
                      </h4>
                      <p className="text-sm leading-relaxed">
                        {o.remediation.whatWouldHaveWon}
                      </p>
                      {o.remediation.sources.length > 0 && (
                        <div className="border-accent/20 mt-3 space-y-1.5 border-t pt-3">
                          {o.remediation.sources.map((src) => (
                            <a
                              key={src.id}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group block"
                            >
                              <span className="text-accent text-[13px] font-medium group-hover:underline">
                                {src.title} ↗
                              </span>
                              <span className="text-faint block text-[11px] leading-snug">
                                {src.why}
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stage fit, close, research */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <DimensionCard
          title={`Close quality · ${scorecard.stageLabel}`}
          dim={scorecard.closeQuality}
        />
        {scorecard.stageFit && <DimensionCard title="Stage fit" dim={scorecard.stageFit} />}
        {scorecard.researchUsage && (
          <DimensionCard title="Research usage" dim={scorecard.researchUsage} />
        )}

        <div className="border-border bg-surface rounded-xl border p-5">
          <h2 className="mono text-faint mb-3 text-[11px] tracking-widest uppercase">
            Talk / listen
          </h2>
          <div className="bg-surface-hi h-2 overflow-hidden rounded-full">
            <div
              className="bg-accent h-full rounded-full transition-all"
              style={{ width: `${scorecard.talkRatio.repSharePct}%` }}
            />
          </div>
          <p className="text-muted mt-3 text-sm leading-relaxed">{scorecard.talkRatio.read}</p>
          <p className="text-faint mono mt-2 text-[10px]">
            {scorecard.talkRatio.repWords} your words · {scorecard.talkRatio.prospectWords} theirs
          </p>
        </div>
      </section>

      {/* What they'll remember */}
      {scorecard.prospectMemory && (
        <section className="border-border bg-surface mt-8 rounded-xl border p-5">
          <h2 className="mono text-faint mb-3 text-[11px] tracking-widest uppercase">
            What {scorecard.personaName.split(' ')[0]} takes away
          </h2>
          <p className="text-muted text-sm leading-relaxed italic">{scorecard.prospectMemory}</p>
          <p className="text-faint mt-3 text-[11px] leading-relaxed">
            This gets read back to them before your next call with this account.
          </p>
        </section>
      )}

      {/* Transcript */}
      {transcript.length > 0 && (
        <section className="mt-8">
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="mono text-faint hover:text-muted text-[11px] tracking-widest uppercase transition-colors"
          >
            {showTranscript ? '− Hide' : '+ Show'} transcript
          </button>
          {showTranscript && (
            <div className="border-border bg-surface mt-3 space-y-3 rounded-xl border p-4">
              {transcript.map((turn, i) => (
                <div key={i} className="text-sm leading-relaxed">
                  <span
                    className="mono mr-2 text-[10px] tracking-widest uppercase"
                    style={{ color: turn.speaker === 'rep' ? 'var(--accent)' : prospect.accent }}
                  >
                    {turn.speaker === 'rep' ? 'You' : scorecard.personaName.split(' ')[0]}
                  </span>
                  <span className={turn.speaker === 'rep' ? 'text-text' : 'text-muted'}>
                    {turn.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onRestart(scorecard.stage)}
          className="border-border bg-surface text-muted hover:border-border-hi rounded-lg border px-6 py-3 font-medium transition-colors"
        >
          Replay {scorecard.stageLabel}
        </button>
        <Link
          href="/"
          className="border-border bg-surface text-muted hover:border-border-hi rounded-lg border px-6 py-3 font-medium transition-colors"
        >
          All prospects
        </Link>
      </div>
    </div>
  );
}
