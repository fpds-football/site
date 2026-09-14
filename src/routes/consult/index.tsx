import { createFileRoute, Link } from "@tanstack/react-router";
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
          <p className="mt-11 mb-2 text-[0.85rem] tracking-[0.04em] text-ink-soft uppercase">Take part</p>
          <h1 className="mb-5 max-w-[26ch] text-[clamp(1.6rem,1.15rem+1.8vw,2.3rem)] leading-tight font-bold tracking-[-0.02em]">
            Help decide what goes into FPDS.
          </h1>
          <p className="text-[1.05rem]">
            FPDS starts small. A new field enters the standard only after the people who use player submissions give
            their opinion. Agents, club staff and players know how transfers work. We ask you before we decide.
          </p>
          <p>
            Each consultation asks one question and takes about three minutes. You do not need a GitHub account, and you
            do not need technical knowledge.
          </p>

          <h2 className="section-heading">Open at launch</h2>
          <ul className="!list-none border-t border-rule !pl-0">
            {consultations.map((c) => (
              <li key={c.slug} className="!m-0 border-b border-rule py-4">
                <Link to={`/consult/${c.slug}/` as "/consult/wages/"} className="font-semibold">
                  {c.title}
                </Link>
                <span className="block text-[0.92rem] text-ink-soft">{c.question}</span>
              </li>
            ))}
          </ul>

          <h2 className="section-heading">Later</h2>
          <p>
            A new consultation opens every two to three weeks. Each one stays open for at least 14 days. The full list
            of open questions is in section 14 of the <a href={`${SPEC_URL}#14-open-questions`}>specification</a>.
          </p>

          <h2 className="section-heading">How we use your answers</h2>
          <ul>
            <li>
              We publish a summary for each consultation. It shows the number of answers from each role and the main
              reasons. It does not show names.
            </li>
            <li>
              We record each decision and its reasons in the <a href={DECISIONS_URL}>decision log</a>.
            </li>
            <li>
              The <Link to="/consult/privacy/">privacy notice</Link> explains which data we keep, and for how long.
            </li>
          </ul>
        </div>
      </main>
    </>
  );
}
