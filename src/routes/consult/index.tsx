import { LayerCard, Link } from "@cloudflare/kumo";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "~/components/SiteHeader";
import { consultations } from "~/content/consultations";
import { DECISIONS_URL, pageHead, SPEC_URL } from "~/content/site";

export const Route = createFileRoute("/consult/")({
  head: () =>
    pageHead({
      title: "Consultations: FPDS",
      description:
        "Help decide what goes into the Football Player Data Standard. Each consultation takes about three minutes.",
      path: "/consult/",
    }),
  component: ConsultIndex,
});

function ConsultIndex() {
  return (
    <>
      <SiteHeader>Consultations</SiteHeader>
      <main className="wrap">
        <div className="prose-block">
          <p className="eyebrow">Take part</p>
          <h1 className="page-title">Help decide what goes into FPDS.</h1>
          <p className="text-lg">
            FPDS starts small. A new field enters the standard only after the people who use player submissions give
            their opinion. Agents, club staff and players know how transfers work. We ask you before we decide.
          </p>
          <p>
            Each consultation asks one question and takes about three minutes. You do not need a GitHub account, and you
            do not need technical knowledge.
          </p>

          <h2 className="section-heading">Open at launch</h2>
          <ul className="!list-none space-y-3 !pl-0">
            {consultations.map((c) => (
              <li key={c.slug} className="!m-0">
                <Link href={`/consult/${c.slug}/`} variant="plain" className="block no-underline">
                  <LayerCard className="group p-4 transition-colors hover:bg-kumo-tint">
                    <span className="flex items-center justify-between gap-2 font-semibold text-kumo-link">
                      {c.title}
                      <ArrowRightIcon aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                    <span className="mt-1 block text-sm text-kumo-subtle">{c.question}</span>
                  </LayerCard>
                </Link>
              </li>
            ))}
          </ul>

          <h2 className="section-heading">Later</h2>
          <p>
            A new consultation opens every two to three weeks. Each one stays open for at least 14 days. The full list
            of open questions is in section 14 of the <Link href={`${SPEC_URL}#14-open-questions`}>specification</Link>.
          </p>

          <h2 className="section-heading">How we use your answers</h2>
          <ul>
            <li>
              We publish a summary for each consultation. It shows the number of answers from each role and the main
              reasons. It does not show names.
            </li>
            <li>
              We record each decision and its reasons in the <Link href={DECISIONS_URL}>decision log</Link>.
            </li>
            <li>
              The <Link href="/consult/privacy/">privacy notice</Link> explains which data we keep, and for how long.
            </li>
          </ul>
        </div>
      </main>
    </>
  );
}
