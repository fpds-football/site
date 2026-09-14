import { LayerCard, Link } from "@cloudflare/kumo";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";

/**
 * A card that is one link, with a title and a short note. It fills the width and the height of its place in a list or a grid.
 * Kumo Link adds inline-flex, which makes the link as narrow as its text, so the display and the width are important here.
 */
export function LinkCard({ href, title, note, className = "" }: { href: string; title: string; note: string; className?: string }) {
  return (
    <Link href={href} variant="plain" className={`!flex w-full no-underline ${className}`}>
      <LayerCard className="group w-full p-4 transition-colors hover:bg-kumo-tint">
        <span className="flex items-center justify-between gap-2 font-semibold text-kumo-link">
          {title}
          <ArrowRightIcon aria-hidden="true" className="shrink-0 transition-transform group-hover:translate-x-0.5" />
        </span>
        <span className="mt-1 block text-sm text-kumo-subtle">{note}</span>
      </LayerCard>
    </Link>
  );
}
