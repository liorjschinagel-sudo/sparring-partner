'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { type CompiledProspect, saveCustomProspect } from '@/lib/customProspects';

type Mode = 'research' | 'gong';

const FIELDS = {
  linkedin: {
    label: 'LinkedIn profile',
    hint: 'Paste the profile text. Role, tenure, background, anything they have posted.',
    rows: 6,
  },
  crm: {
    label: 'CRM / account notes',
    hint: 'Account context, open opportunity, what has happened so far, who else is involved.',
    rows: 6,
  },
  freeText: {
    label: 'Direction',
    hint: 'Tell it how to behave: "hostile about SOC 2", "we churned them once", "she loves Pipecat".',
    rows: 4,
  },
} as const;

export default function BuildPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('research');
  const [linkedin, setLinkedin] = useState('');
  const [crm, setCrm] = useState('');
  const [freeText, setFreeText] = useState('');
  const [gongTranscript, setGongTranscript] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CompiledProspect | null>(null);

  const hasInput =
    mode === 'gong'
      ? gongTranscript.trim().length > 0
      : [linkedin, crm, freeText].some((v) => v.trim().length > 0);

  async function compile() {
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch('/api/compile-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'gong'
            ? { gongTranscript, freeText: freeText.trim() || undefined }
            : { linkedin, crm, freeText }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Could not build that prospect');
      setPreview(data as CompiledProspect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build that prospect');
    } finally {
      setBusy(false);
    }
  }

  function saveAndCall() {
    if (!preview) return;
    const saved = saveCustomProspect(preview);
    router.push(`/spar/${saved.id}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        href="/"
        className="text-faint hover:text-muted mono mb-6 block w-fit text-xs transition-colors"
      >
        ← All prospects
      </Link>

      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Build a prospect</h1>
      <p className="text-muted mt-3 leading-relaxed">
        The three built-ins are LiveKit&apos;s competitive board. This is for the account you are
        actually calling on Tuesday.
      </p>

      {/* Mode */}
      <div className="mt-8 flex gap-2">
        {(
          [
            ['research', 'From research'],
            ['gong', 'From a call recording'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              mode === value
                ? 'border-accent/50 bg-accent/10 text-accent'
                : 'border-border bg-surface text-muted hover:border-border-hi'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'research' ? (
        <div className="mt-6 space-y-5">
          {(Object.keys(FIELDS) as (keyof typeof FIELDS)[]).map((key) => {
            const field = FIELDS[key];
            const value = key === 'linkedin' ? linkedin : key === 'crm' ? crm : freeText;
            const setter =
              key === 'linkedin' ? setLinkedin : key === 'crm' ? setCrm : setFreeText;
            return (
              <div key={key}>
                <label className="mb-1.5 block text-sm font-medium">{field.label}</label>
                <p className="text-faint mb-2 text-xs leading-relaxed">{field.hint}</p>
                <textarea
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  rows={field.rows}
                  className="border-border bg-surface focus:border-accent/50 w-full rounded-lg border p-3 text-sm leading-relaxed outline-none transition-colors"
                  placeholder="Paste here. All fields optional, but give it something."
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Call transcript</label>
            <p className="text-faint mb-2 text-xs leading-relaxed">
              Paste a transcript from Gong, Chorus, Fathom, or anywhere else. You get a follow-up
              conversation with that person, opening on whatever was left unresolved.
            </p>
            <textarea
              value={gongTranscript}
              onChange={(e) => setGongTranscript(e.target.value)}
              rows={14}
              className="border-border bg-surface focus:border-accent/50 w-full rounded-lg border p-3 font-mono text-xs leading-relaxed outline-none transition-colors"
              placeholder={'Speaker names and turns, e.g.\n\nDan Ferreira: We already prototyped on Realtime...\nRep: That is fair, and Realtime is genuinely good at...'}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Anything to add <span className="text-faint font-normal">(optional)</span>
            </label>
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              rows={3}
              className="border-border bg-surface focus:border-accent/50 w-full rounded-lg border p-3 text-sm leading-relaxed outline-none transition-colors"
              placeholder="What happened since the call, what you need to get out of the follow-up."
            />
          </div>

          <div className="border-warn/30 bg-warn/5 rounded-lg border p-4">
            <h2 className="text-warn mb-2 text-sm font-medium">Before you paste a real call</h2>
            <p className="text-muted text-xs leading-relaxed">
              This is real customer speech, usually naming a real person. Nothing is written to a
              server: the transcript is turned into a prospect in one stateless request, kept in
              this browser only, and never sent to the voice agent. Even so, do not paste anything
              you would not put in a shared doc. A production version of this would need auth,
              tenant isolation, and a retention policy first.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="border-bad/40 bg-bad/10 text-bad mt-6 rounded-lg border p-4 text-sm">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={compile}
        disabled={!hasInput || busy}
        // Explicit conditional classes rather than the `disabled:` variant, which is not
        // reliably generated here and left the button looking active while inert.
        className={`bg-accent mt-7 rounded-lg px-6 py-3 font-semibold text-black transition-opacity ${
          !hasInput || busy ? 'cursor-not-allowed opacity-30' : 'hover:opacity-90'
        }`}
      >
        {busy ? 'Building…' : preview ? 'Rebuild' : 'Build prospect'}
      </button>

      {busy && (
        <p className="text-faint mt-3 text-xs">
          Writing their character, objection queue, and grading criteria. About fifteen seconds.
        </p>
      )}

      {/* Preview */}
      {preview && (
        <section className="fade-up border-border bg-surface mt-10 rounded-xl border p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold">{preview.name}</h2>
              <p className="text-muted mt-1 text-sm">
                {preview.title} · {preview.company}
              </p>
            </div>
            <span
              className="mono shrink-0 rounded-full border px-2.5 py-1 text-[10px] tracking-wider uppercase"
              style={{ color: preview.accent, borderColor: `${preview.accent}55` }}
            >
              {preview.difficulty}
            </span>
          </div>

          <p className="text-muted mt-4 text-sm leading-relaxed">{preview.scoutingReport}</p>
          {preview.openingPosture && (
            <p className="text-faint mt-2 text-sm leading-relaxed">{preview.openingPosture}</p>
          )}

          <h3 className="mono text-faint mt-6 mb-2.5 text-[11px] tracking-widest uppercase">
            Objection queue ({preview.objections.length})
          </h3>
          <ul className="space-y-2">
            {preview.objections.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted">{o.label}</span>
                {o.escalationTrap && (
                  <span className="mono border-warn/40 text-warn rounded-full border px-2 py-0.5 text-[9px] tracking-wider uppercase">
                    Trap
                  </span>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveAndCall}
              className="bg-accent rounded-lg px-6 py-3 font-semibold text-black transition-opacity hover:opacity-90"
            >
              Save &amp; call them
            </button>
            <button
              type="button"
              onClick={compile}
              className="border-border text-muted hover:border-border-hi rounded-lg border px-6 py-3 font-medium transition-colors"
            >
              Try again
            </button>
          </div>
          <p className="text-faint mt-3 text-xs">
            Saved to this browser only. Nothing is stored on a server.
          </p>
        </section>
      )}
    </main>
  );
}
