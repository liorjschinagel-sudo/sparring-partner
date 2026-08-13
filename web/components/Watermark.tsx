/**
 * Standing disclosure.
 *
 * This tool positions LiveKit, quotes their pricing and argues against their competitors,
 * so it should never be mistakable for something LiveKit shipped. It is one person's
 * illustrative build. Fixed rather than tucked in a footer, because the pages that most
 * need the disclaimer (a scorecard full of confident product claims) are the ones a reader
 * is least likely to scroll to the bottom of.
 */
export default function Watermark() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-2 sm:justify-end sm:pr-4">
      <div className="border-border bg-surface/80 text-faint pointer-events-auto rounded-full border px-3 py-1.5 text-[10px] leading-none backdrop-blur">
        <span className="hidden sm:inline">
          Illustrative prototype by Lior Schinagel. Not affiliated with or endorsed by LiveKit.
        </span>
        <span className="sm:hidden">Illustrative prototype · not affiliated with LiveKit</span>
      </div>
    </div>
  );
}
