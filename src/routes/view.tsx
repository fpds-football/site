import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "~/components/SiteHeader";
import { pageHead } from "~/content/site";
import { Viewer } from "~/viewer/Viewer";

export const Route = createFileRoute("/view")({
  // The viewer handles player data, so it never renders on a server (DECISIONS.md D-33 and D-35).
  ssr: false,
  head: () =>
    pageHead({
      title: "View a player profile: FPDS",
      description: "Open an FPDS player profile in your browser. See the source of each value and any problems with the file. The file never leaves your browser.",
      path: "/view/",
    }),
  pendingComponent: () => (
    <div className="wrap mt-8 text-kumo-subtle">
      <h1 className="text-2xl font-semibold text-kumo-strong">View a player profile</h1>
      <p>The viewer is loading. It runs in your browser, and sends nothing to a server.</p>
    </div>
  ),
  component: ViewPage,
});

function ViewPage() {
  return (
    <>
      <div className="print:hidden">
        <SiteHeader />
      </div>
      <main>
        <Viewer />
      </main>
    </>
  );
}
