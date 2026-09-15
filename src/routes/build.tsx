import { createFileRoute } from "@tanstack/react-router";
import { Builder } from "~/builder/Builder";
import { SiteHeader } from "~/components/SiteHeader";
import { pageHead } from "~/content/site";

export const Route = createFileRoute("/build")({
  // The builder handles player data, so it never renders on a server (DECISIONS.md D-33).
  ssr: false,
  head: () =>
    pageHead({
      title: "Create a player profile: FPDS",
      description: "Create an FPDS player profile in your browser. Your information never leaves your device.",
      path: "/build/",
    }),
  pendingComponent: () => (
    <div className="wrap mt-8 text-kumo-subtle">
      <h1 className="text-2xl font-semibold text-kumo-strong">Create a player profile</h1>
      <p>The builder is loading. It runs in your browser, and sends nothing to a server.</p>
    </div>
  ),
  component: BuildPage,
});

function BuildPage() {
  return (
    <>
      <SiteHeader wide />
      <main>
        <Builder />
      </main>
    </>
  );
}
