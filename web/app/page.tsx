'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { type Campaign, listCampaigns } from '@/lib/campaign';
import { type CustomProspect, deleteCustomProspect, listCustomProspects } from '@/lib/customProspects';
import { PERSONAS } from '@/lib/personas';
import { STAGES, getStage } from '@/lib/stages';

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy: 'text-good border-good/30 bg-good/10',
  Medium: 'text-warn border-warn/30 bg-warn/10',
  Hard: 'text-bad border-bad/30 bg-bad/10',
};

function DealProgress({ campaign }: { campaign: Campaign }) {
  if (campaign.closedWon) {
    return (
      <span className="mono text-good text-[10px] tracking-wider uppercase">Closed won</span>
    );
  }
  const stage = getStage(campaign.stage);
  return (
    <span className="mono text-accent text-[10px] tracking-wider uppercase">
      {stage.label} · {stage.order}/{STAGES.length}
    </span>
  );
}

export default function Home() {
  const [campaigns, setCampaigns] = useState<Record<string, Campaign>>({});
  const [custom, setCustom] = useState<CustomProspect[]>([]);

  // localStorage is client-only, so both load after mount.
  useEffect(() => {
    setCampaigns(Object.fromEntries(listCampaigns().map((c) => [c.prospectKey, c])));
    setCustom(listCustomProspects());
  }, []);

  function removeCustom(id: string) {
    deleteCustomProspect(id);
    setCustom(listCustomProspects());
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
      <header className="max-w-2xl">
        <p className="mono text-accent mb-4 text-xs tracking-[0.2em] uppercase">Sparring Partner</p>
        <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
          Practice objection handling against a prospect who fights back.
        </h1>
        <p className="text-muted mt-5 text-base leading-relaxed sm:text-lg">
          Pick a prospect, read the brief, and have a real voice conversation. They are evaluating
          LiveKit, they have read the pricing page, and they have already talked to your
          competitors. Work a deal from first call to closed won, and they remember every
          conversation in between.
        </p>
      </header>

      {/* Your prospects */}
      <section className="mt-12 sm:mt-16">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="mono text-faint text-[11px] tracking-widest uppercase">Your prospects</h2>
          <Link
            href="/build"
            className="border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors"
          >
            + Build a prospect
          </Link>
        </div>

        {custom.length === 0 ? (
          <div className="border-border bg-surface rounded-xl border border-dashed p-6">
            <p className="text-muted text-sm leading-relaxed">
              Build one from a LinkedIn profile, CRM notes, or a call recording. Paste a Gong
              transcript and you get a follow-up conversation with that person, opening on whatever
              you left unresolved.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {custom.map((p) => {
              const campaign = campaigns[`custom:${p.id}`];
              return (
                <div
                  key={p.id}
                  className="card-hover border-border bg-surface hover:border-border-hi group relative flex flex-col rounded-xl border p-5"
                >
                  <Link href={`/spar/${p.id}`} className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className="mono text-[10px] tracking-widest uppercase"
                        style={{ color: p.accent }}
                      >
                        {p.source === 'gong' ? 'From a call' : 'From research'}
                      </span>
                      <span
                        className={`mono rounded-full border px-2 py-0.5 text-[10px] tracking-wider uppercase ${
                          DIFFICULTY_STYLES[p.difficulty]
                        }`}
                      >
                        {p.difficulty}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{p.name}</h3>
                    <p className="text-muted mt-1 text-sm">
                      {p.title} · {p.company}
                    </p>
                    <p className="text-faint mt-4 flex-1 text-sm leading-relaxed">
                      {p.scoutingReport}
                    </p>
                    <div className="border-border mt-5 flex items-center justify-between border-t pt-4">
                      {campaign ? (
                        <DealProgress campaign={campaign} />
                      ) : (
                        <span className="text-faint mono text-[11px]">
                          {p.objections.length} objections
                        </span>
                      )}
                      <span className="text-accent text-sm font-medium">Call →</span>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeCustom(p.id)}
                    className="text-faint hover:text-bad absolute top-3 right-3 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label={`Delete ${p.name}`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Built-ins */}
      <section className="mt-12">
        <h2 className="mono text-faint mb-4 text-[11px] tracking-widest uppercase">
          The competitive board
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PERSONAS.map((persona) => {
            const campaign = campaigns[persona.id];
            return (
              <Link
                key={persona.id}
                href={`/spar/${persona.id}`}
                className="card-hover group border-border bg-surface hover:border-border-hi hover:bg-surface-hi flex flex-col rounded-xl border p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="mono text-[10px] tracking-widest uppercase"
                    style={{ color: persona.accent }}
                  >
                    Tier {persona.tier}
                  </span>
                  <span
                    className={`mono rounded-full border px-2 py-0.5 text-[10px] tracking-wider uppercase ${
                      DIFFICULTY_STYLES[persona.difficulty]
                    }`}
                  >
                    {persona.difficulty}
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-semibold">{persona.name}</h3>
                <p className="text-muted mt-1 text-sm">
                  {persona.title} · {persona.company}
                </p>

                <p className="text-faint mt-4 flex-1 text-sm leading-relaxed">
                  {persona.scoutingReport}
                </p>

                <div className="border-border mt-5 flex items-center justify-between border-t pt-4">
                  {campaign ? (
                    <DealProgress campaign={campaign} />
                  ) : (
                    <span className="text-faint mono text-[11px]">
                      {persona.objections.length} objections
                    </span>
                  )}
                  <span className="text-accent text-sm font-medium transition-transform group-hover:translate-x-0.5">
                    {campaign ? 'Continue →' : 'Start call →'}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-border text-muted mt-16 grid gap-8 border-t pt-10 text-sm sm:grid-cols-3">
        <div>
          <h3 className="text-text mb-2 font-medium">Real objections</h3>
          <p className="leading-relaxed">
            Mined from LiveKit&apos;s pricing page, docs, and the competitive field — Vapi, Retell,
            Pipecat, raw OpenAI Realtime. Not invented for the demo.
          </p>
        </div>
        <div>
          <h3 className="text-text mb-2 font-medium">A deal, not a drill</h3>
          <p className="leading-relaxed">
            Five stages from discovery to signature. Clear a stage to advance, and the prospect
            carries what you promised into the next call. Bluffing never advances a deal.
          </p>
        </div>
        <div>
          <h3 className="text-text mb-2 font-medium">Escalation judgment</h3>
          <p className="leading-relaxed">
            Some objections are traps you should refuse to answer. Knowing when to bring an
            engineer is scored — answering correctly from memory still counts as a miss.
          </p>
        </div>
      </section>

      <footer className="text-faint mt-14 text-xs">
        Best with headphones. Deals and prospects you build are stored in this browser only —
        nothing is saved to a server.
      </footer>
    </main>
  );
}
