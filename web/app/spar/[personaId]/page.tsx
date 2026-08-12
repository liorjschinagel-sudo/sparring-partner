'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import SparRoom from '@/components/SparRoom';
import { getCampaign } from '@/lib/campaign';
import { type ProspectView, resolveProspect } from '@/lib/prospect';
import { DEFAULT_STAGE, type StageId } from '@/lib/stages';

/**
 * Client-rendered because custom prospects live in the rep's localStorage and cannot be
 * resolved on the server. Built-in personas resolve from the same module the API routes
 * use, so ids stay consistent across both.
 */
export default function SparPage() {
  const params = useParams<{ personaId: string }>();
  const id = params?.personaId ?? '';

  const [prospect, setProspect] = useState<ProspectView | null>(null);
  const [stage, setStage] = useState<StageId>(DEFAULT_STAGE);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const found = resolveProspect(id);
    setProspect(found);
    if (found) {
      const campaign = getCampaign(found.key);
      if (campaign && !campaign.closedWon) setStage(campaign.stage);
    }
    setResolved(true);
  }, [id]);

  return (
    // Fixed-height shell: the call screen keeps its controls pinned and scrolls the
    // transcript internally, rather than growing the page as the conversation runs.
    <main className="mx-auto flex h-dvh max-w-3xl flex-col overflow-hidden px-5 py-6 sm:px-8 sm:py-10">
      <Link
        href="/"
        className="text-faint hover:text-muted mono mb-5 w-fit shrink-0 text-xs transition-colors"
      >
        ← All prospects
      </Link>

      {!resolved ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="border-border border-t-accent h-7 w-7 animate-spin rounded-full border-2" />
        </div>
      ) : prospect ? (
        <SparRoom prospect={prospect} initialStage={stage} />
      ) : (
        <div className="fade-up min-h-0 flex-1">
          <h1 className="text-2xl font-semibold">Prospect not found</h1>
          <p className="text-muted mt-2 text-sm leading-relaxed">
            Custom prospects live in this browser only. If you built this one somewhere else, or
            cleared your site data, it is gone.
          </p>
          <Link
            href="/build"
            className="bg-accent mt-6 inline-block rounded-lg px-5 py-2.5 font-semibold text-black transition-opacity hover:opacity-90"
          >
            Build a new one
          </Link>
        </div>
      )}
    </main>
  );
}
