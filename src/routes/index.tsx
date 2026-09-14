import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteHeader } from "~/components/SiteHeader";
import { consultations } from "~/content/consultations";
import { pageHead, SPEC_URL } from "~/content/site";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead({
      title: "FPDS: Football Player Data Standard",
      description:
        "An open format for player information that agents, players and clubs send to each other. Every claim has its source. Draft v0.1.0.",
      path: "/",
    }),
  component: Home,
});

function Home() {
  return (
    <>
      <SiteHeader>Draft v0.1.0. Nothing is stable yet. Breaking changes are expected before version 1.0.</SiteHeader>

      <main className="wrap">
        <h1 className="mt-12 mb-5 max-w-[20ch] text-[clamp(1.75rem,1.2rem+2vw,2.6rem)] leading-[1.15] font-bold tracking-[-0.025em]">
          A player submission should say who claimed what.
        </h1>

        <p className="prose-block mb-10 text-[1.05rem]">
          Agents, players and clubs send player information as free text, with no structure and no sources. FPDS is an
          open JSON format for that information. The core is small. Every figure has its denominator, and every claim
          has its source.
        </p>

        <section
          aria-label="Example submission showing verified and agent-stated claims"
          className="mb-3.5 border border-rule bg-field px-6 pt-6 pb-5"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-rule pb-3.5">
            <span className="text-[1.15rem] font-semibold tracking-[-0.01em]">Tomasz Wojcik</span>
            <span className="text-[0.9rem] text-ink-soft">CM · 17 April 2003 · Widzew Łódź</span>
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-x-5 sm:grid-cols-[minmax(7rem,11rem)_1fr]">
            <Claim label="Contract expires" value="30 June 2027" mark="verified · FIFA TMS" kind="checked" />
            <Claim label="Minutes, 2025/26" value="2,418" mark="data provider · Wyscout" kind="checked" />
            <Claim label="Goals, 2025/26" value="10" mark="data provider · Wyscout" kind="checked" />
            <Claim label="Assists, 2025/26" value="6" mark="stated by agent" kind="stated" />
            <Claim label="Also plays" value="CDM, CAM" mark="stated by agent" kind="stated" />
            <Claim label="Mandate" value="Exclusive" mark="stated by agent · licence POL-2024-01188" kind="stated" />
          </dl>
        </section>

        <p className="mb-12 max-w-[44rem] text-[0.93rem] text-ink-soft">
          The same submission, with the source of each value shown. Three of these values come from a source that you
          can check. Three come only from the agent. A recruitment analyst sees the difference in less than a second.
          If an interface shows a verified figure and an unverified figure in the same way, the format has no purpose.
        </p>

        <nav aria-label="Main links" className="mb-12 grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] border-t border-rule">
          <Door href={SPEC_URL} title="Read the specification" note="The normative document, in fourteen sections" />
          <Door href="/schema/v0.1/player.json" title="Get the schema" note="JSON Schema 2020-12, at a permanent URL" />
          <Door to="/consult/" title="Take part" note="Help decide what goes into FPDS" />
        </nav>

        <div className="prose-block">
          <h2 className="section-heading">Open consultations</h2>
          <p>
            FPDS starts small. New fields enter the standard only after agents, clubs and players give their opinion.
            Each consultation takes about three minutes.
          </p>
          <ul>
            {consultations.map((c) => (
              <li key={c.slug}>
                <Link to={`/consult/${c.slug}/` as "/consult/wages/"}>{c.title}</Link>
              </li>
            ))}
          </ul>

          <h2 className="section-heading">What FPDS is not</h2>
          <ul>
            <li>
              <strong>Not a protocol.</strong> It defines the structure of a document, not how two systems exchange it.
              A submission can travel by email, API, file transfer or message.
            </li>
            <li>
              <strong>Not a registry.</strong> It does not tell you whether a claim is true. It tells you who made the
              claim.
            </li>
            <li>
              <strong>Not a replacement for FIFA TMS.</strong> Where FPDS and FIFA TMS use the same concept, FPDS
              follows FIFA.
            </li>
          </ul>

          <h2 className="section-heading">Validate a submission</h2>
          <pre className="mb-4 overflow-x-auto border border-rule bg-field px-4 py-3.5 leading-normal">
            <code>{`pip install check-jsonschema
check-jsonschema \\
  --schemafile https://fpds.football/schema/v0.1/player.json \\
  submission.json`}</code>
          </pre>
          <p>Some rules are not in the schema. Section 13.1 of the specification lists them.</p>
        </div>
      </main>
    </>
  );
}

function Claim({ label, value, mark, kind }: { label: string; value: string; mark: string; kind: "checked" | "stated" }) {
  const colour = kind === "checked" ? "text-verified" : "text-stated";
  return (
    <>
      <dt className="pt-1.5 text-[0.84rem] text-ink-soft sm:py-1.5 sm:text-[0.9rem]">{label}</dt>
      <dd className={`m-0 flex flex-wrap items-baseline gap-2.5 pb-3 sm:py-1.5 ${colour}`}>
        <span className={kind === "checked" ? "font-semibold text-ink" : "italic"}>{value}</span>
        <span className="border border-current px-1.5 py-px text-[0.74rem] tracking-[0.01em] whitespace-nowrap">{mark}</span>
      </dd>
    </>
  );
}

function Door({ title, note, href, to }: { title: string; note: string; href?: string; to?: "/consult/" }) {
  const content: ReactNode = (
    <>
      <span className="font-semibold text-verified underline decoration-1 underline-offset-2">{title}</span>
      <span className="mt-0.5 block text-[0.9rem] text-ink-soft">{note}</span>
    </>
  );
  const className = "block border-b border-rule py-4 pr-6 text-inherit no-underline";
  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <a href={href} className={className}>
      {content}
    </a>
  );
}
