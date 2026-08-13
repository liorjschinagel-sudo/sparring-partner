'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { type Campaign, listCampaigns } from '@/lib/campaign';
import {
  type CustomProspect,
  deleteCustomProspect,
  listCustomProspects,
} from '@/lib/customProspects';
import { MODES, type ModeId } from '@/lib/modes';
import { type Persona, personasForMode } from '@/lib/personas';
import { STAGES, getStage } from '@/lib/stages';

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy: 'text-good border-good/30 bg-good/10',
  Medium: 'text-warn border-warn/30 bg-warn/10',
  Hard: 'text-bad border-bad/30 bg-bad/10',
};

function DealProgress({ campaign }: { campaign: Campaign }) {
  if (campaign.closedWon) {
    return <span className="mono text-good text-[10px] tracking-wider uppercase">Closed won</span>;
  }
  const stage = getStage(campaign.stage);
  return (
    <span className="mono text-accent text-[10px] tracking-wider uppercase">
      {stage.label} · {stage.order}/{STAGES.length}
    </span>
  );
}

function ProspectCard({
  href,
  eyebrow,
  eyebrowColor,
  difficulty,
  name,
  subtitle,
  scoutingReport,
  footerLeft,
  cta,
}: {
  href: string;
  eyebrow: string;
  eyebrowColor: string;
  difficulty: string;
  name: string;
  subtitle: string;
  scoutingReport: string;
  footerLeft: React.ReactNode;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="card-hover group border-border bg-surface hover:border-border-hi hover:bg-surface-hi flex flex-col rounded-xl border p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="mono text-[10px] tracking-widest uppercase"
          style={{ color: eyebrowColor }}
        >
          {eyebrow}
        </span>
        <span
          className={`mono rounded-full border px-2 py-0.5 text-[10px] tracking-wider uppercase ${DIFFICULTY_STYLES[difficulty]}`}
        >
          {difficulty}
        </span>
      </div>

      <h3 className="mt-4 text-lg font-semibold">{name}</h3>
      <p className="text-muted mt-1 text-sm">{subtitle}</p>
      <p className="text-faint mt-4 flex-1 text-sm leading-relaxed">{scoutingReport}</p>

      <div className="border-border mt-5 flex items-center justify-between border-t pt-4">
        {footerLeft}
        <span className="text-accent text-sm font-medium transition-transform group-hover:translate-x-0.5">
          {cta} →
        </span>
      </div>
    </Link>
  );
}

export default function Home() {
  const [mode, setMode] = useState<ModeId>('ae');
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

  const personas: Persona[] = personasForMode(mode);
  const isAe = mode === 'ae';

  return (
    <main className="mx-auto max-w-5xl px-5 py-14 pb-24 sm:px-8 sm:py-20">
      <header className="max-w-2xl">
        <p className="mono text-accent mb-4 text-xs tracking-[0.2em] uppercase">Sparring Partner</p>
        <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
          Practice on a prospect who pushes back.
        </h1>
        <p className="text-muted mt-5 text-base leading-relaxed sm:text-lg">
          Pick someone, read the brief, and have an actual voice conversation. They have read the
          pricing page, they have already taken a call from Vapi, and they concede nothing you
          have not earned. When you hang up you get scored, and for anything you did not win, the
          answer that would have won it (with the doc to go read).
        </p>
      </header>

      {/* Mode */}
      <div className="mt-9 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`rounded-lg border px-4 py-2.5 text-left transition-colors ${
              mode === m.id
                ? 'border-accent/50 bg-accent/10'
                : 'border-border bg-surface hover:border-border-hi'
            }`}
          >
            <span
              className={`mono block text-[10px] tracking-widest uppercase ${
                mode === m.id ? 'text-accent' : 'text-faint'
              }`}
            >
              {m.label}
            </span>
            <span className={`text-sm font-medium ${mode === m.id ? 'text-text' : 'text-muted'}`}>
              {m.role}
            </span>
          </button>
        ))}
      </div>
      <p className="text-muted mt-3 max-w-2xl text-sm leading-relaxed">
        {MODES.find((m) => m.id === mode)?.blurb}
      </p>

      {/* Built-ins for the selected mode */}
      <section className="mt-8">
        <h2 className="mono text-faint mb-4 text-[11px] tracking-widest uppercase">
          {isAe ? 'The competitive board' : 'Three inbound leads'}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {personas.map((persona) => {
            const campaign = campaigns[persona.id];
            return (
              <ProspectCard
                key={persona.id}
                href={`/spar/${persona.id}`}
                eyebrow={`Tier ${persona.tier}`}
                eyebrowColor={persona.accent}
                difficulty={persona.difficulty}
                name={persona.name}
                subtitle={`${persona.title} · ${persona.company}`}
                scoutingReport={persona.scoutingReport}
                cta={isAe && campaign ? 'Continue' : isAe ? 'Start call' : 'Take the call'}
                footerLeft={
                  isAe && campaign ? (
                    <DealProgress campaign={campaign} />
                  ) : (
                    <span className="text-faint mono text-[11px]">
                      {persona.objections.length} to get through
                    </span>
                  )
                }
              />
            );
          })}
        </div>
      </section>

      {/* Authored prospects, AE only */}
      {isAe && (
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="mono text-faint text-[11px] tracking-widest uppercase">
              Prospects you built
            </h2>
            <Link
              href="/build"
              className="border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors"
            >
              + Build one
            </Link>
          </div>

          {custom.length === 0 ? (
            <div className="border-border bg-surface rounded-xl border border-dashed p-6">
              <p className="text-muted text-sm leading-relaxed">
                Paste a LinkedIn profile, your CRM notes, or a call recording, and you get a
                prospect built from it. Feed it a Gong transcript and you can rehearse the
                follow-up you are actually about to have, opening on whatever you left hanging.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {custom.map((p) => {
                const campaign = campaigns[`custom:${p.id}`];
                return (
                  <div key={p.id} className="group relative">
                    <ProspectCard
                      href={`/spar/${p.id}`}
                      eyebrow={p.source === 'gong' ? 'From a call' : 'From research'}
                      eyebrowColor={p.accent}
                      difficulty={p.difficulty}
                      name={p.name}
                      subtitle={`${p.title} · ${p.company}`}
                      scoutingReport={p.scoutingReport}
                      cta="Call"
                      footerLeft={
                        campaign ? (
                          <DealProgress campaign={campaign} />
                        ) : (
                          <span className="text-faint mono text-[11px]">
                            {p.objections.length} to get through
                          </span>
                        )
                      }
                    />
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
      )}

      <section className="border-border text-muted mt-16 grid gap-8 border-t pt-10 text-sm sm:grid-cols-3">
        <div>
          <h3 className="text-text mb-2 font-medium">Objections that actually get raised</h3>
          <p className="leading-relaxed">
            Mined from the pricing page, the docs, and the competitive field (Vapi, Retell,
            Pipecat, raw OpenAI Realtime), with sources kept in the repo so they can be corrected
            when the product moves.
          </p>
        </div>
        <div>
          <h3 className="text-text mb-2 font-medium">Feedback you can use on the next call</h3>
          <p className="leading-relaxed">
            Every objection you drop comes back with the answer that would have won it and a link
            to the page it came from. Grades on their own tell you where you stand, which is only
            half of what you needed.
          </p>
        </div>
        <div>
          <h3 className="text-text mb-2 font-medium">Knowing what not to answer</h3>
          <p className="leading-relaxed">
            Some questions (latency under their workload, compliance, data residency) are traps.
            Getting one right from memory still counts as a miss, because the process is what
            survives contact with the next deal.
          </p>
        </div>
      </section>

      <footer className="text-faint mt-14 text-xs leading-relaxed">
        Best with headphones. Deals and prospects you build live in this browser only (clear your
        site data and they are gone), and nothing is stored on a server.
      </footer>
    </main>
  );
}
