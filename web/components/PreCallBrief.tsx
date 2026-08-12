import type { PersonaBrief } from '@/lib/personas';

/**
 * Pre-call research, shown before the rep dials.
 *
 * The brief is deliberately incomplete. It holds what research would surface; the rest is
 * what discovery is for. Reps who ask questions this brief already answers lose credibility
 * with the prospect and points on the scorecard.
 */
export default function PreCallBrief({ brief, accent }: { brief: PersonaBrief; accent: string }) {
  const sections: { title: string; facts: PersonaBrief['company'] }[] = [
    { title: 'Company', facts: brief.company },
    { title: 'Person', facts: brief.person },
    { title: 'Deal', facts: brief.deal },
  ];

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="mono text-faint text-[11px] tracking-widest uppercase">Pre-call brief</h2>
        <span className="text-faint text-[10px]">Fictional account</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {sections.map((section) => (
          <div key={section.title} className="border-border bg-surface rounded-xl border p-4">
            <h3
              className="mono mb-3 text-[10px] tracking-widest uppercase"
              style={{ color: accent }}
            >
              {section.title}
            </h3>
            <dl className="space-y-2.5">
              {section.facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-faint text-[11px]">{fact.label}</dt>
                  <dd className="mt-0.5 text-[13px] leading-snug">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {brief.hooks.length > 0 && (
        <div className="border-accent/25 bg-accent/5 mt-3 rounded-xl border p-4">
          <h3 className="mono text-accent mb-2.5 text-[10px] tracking-widest uppercase">
            What the research is worth
          </h3>
          <ul className="space-y-2">
            {brief.hooks.map((hook) => (
              <li key={hook} className="text-muted flex gap-2.5 text-[13px] leading-snug">
                <span className="text-accent shrink-0">→</span>
                <span>{hook}</span>
              </li>
            ))}
          </ul>
          <p className="text-faint mt-3 text-[11px] leading-relaxed">
            The brief is not complete. Everything else has to come from discovery, and asking
            what is already written here costs you.
          </p>
        </div>
      )}
    </div>
  );
}
