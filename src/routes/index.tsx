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

        <p className="prose-block mb-4 text-[1.15rem] leading-relaxed">
          FPDS is a free, open standard for player submissions. A player submission is the information that an agent,
          an intermediary or a player sends to a club about a player.
        </p>
        <p className="prose-block mb-10 text-[1.05rem]">
          FPDS gives every submission the same structure. Every figure has its context, and every claim shows who made
          it. A club can then read a submission in seconds, compare it with others, and see what it can check.
        </p>

        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          <section aria-labelledby="problem" className="border-t-2 border-ink pt-4">
            <h2 id="problem" className="mb-3 text-[1.1rem] font-semibold">The problem</h2>
            <p className="mb-3">Today, most submissions are free text in an email or a message:</p>
            <blockquote className="mb-3 border-l-2 border-rule pl-4 text-ink-soft italic">
              “Good lad, played in X league, 10 goals, plays centre mid, available now.”
            </blockquote>
            <p className="mb-2">A club cannot use this message without more questions:</p>
            <ul className="mb-0 list-disc pl-5">
              <li>Ten goals in how many minutes?</li>
              <li>Centre mid as a 6, an 8 or a 10?</li>
              <li>Is the player under contract, and until when?</li>
              <li>Does the sender have a mandate to offer the player?</li>
              <li>Who says so?</li>
            </ul>
          </section>

          <section aria-labelledby="goal" className="border-t-2 border-verified pt-4">
            <h2 id="goal" className="mb-3 text-[1.1rem] font-semibold">The goal</h2>
            <ul className="mb-0 list-none space-y-3 pl-0">
              <li>
                <strong className="block">Clubs get information that they can use.</strong>
                The same fields in the same format from every sender, with minutes for every output and a source for
                every claim.
              </li>
              <li>
                <strong className="block">Agents and players get taken seriously.</strong>
                A clear, complete submission gets read. A submission that shows its sources gets trust.
              </li>
              <li>
                <strong className="block">Software can read and write it.</strong>
                Agency tools, scouting platforms and club systems can all use the same open format, without a licence
                fee.
              </li>
              <li>
                <strong className="block">Player data is shared with care.</strong>
                FPDS contains no medical records, and it marks every submission about a minor.
              </li>
            </ul>
          </section>
        </div>

        <h2 className="section-heading">What a club sees</h2>
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

        <section aria-labelledby="how" className="prose-block mb-12">
          <h2 id="how" className="section-heading">How it works</h2>
          <ol className="mb-0 list-none space-y-4 pl-0">
            <HowStep number={1} title="Create the submission">
              Use the free <Link to="/build/">builder</Link> on this site, or software that supports FPDS. The builder
              runs in your browser, and your information stays on your device.
            </HowStep>
            <HowStep number={2} title="Send the file">
              The builder makes a file that ends with <code>.fpds.json</code>. Send it by email or message, as you send a
              PDF now.
            </HowStep>
            <HowStep number={3} title="The club reads it">
              The club opens the file in software that supports FPDS. A free viewer on this site is coming soon. It shows
              the player, the source of each value, and any problems with the file.
            </HowStep>
          </ol>
        </section>

        <nav aria-label="Main links" className="mb-12 grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] border-t border-rule">
          <Door href={SPEC_URL} title="Read the specification" note="The normative document, in fourteen sections" />
          <Door href="/schema/v0.1/player.json" title="Get the schema" note="JSON Schema 2020-12, at a permanent URL" />
          <Door to="/build/" title="Create a submission" note="In your browser. Your data stays on your device." />
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

          <h2 className="section-heading">An open standard</h2>
          <p>
            FPDS is free to use. The specification and the schema have open licences, and nobody needs permission to
            build software for it. FPDS starts small, and new fields enter it only after a public consultation with
            agents, clubs and players.
          </p>

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

          <h2 className="section-heading">For software providers</h2>
          <p>
            The schema is at a permanent URL. The <a href="https://www.npmjs.com/package/@fpds-football/fpds">TypeScript
            library</a> validates documents and gives messages in plain English. The{" "}
            <a href="https://github.com/fpds-football/spec/tree/main/tests/conformance">conformance suite</a> tests any
            implementation.
          </p>
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

function HowStep({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[2.25rem_1fr] gap-3">
      <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center border border-verified font-semibold text-verified">
        {number}
      </span>
      <div>
        <strong className="block">{title}</strong>
        {children}
      </div>
    </li>
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

function Door({ title, note, href, to }: { title: string; note: string; href?: string; to?: "/consult/" | "/build/" }) {
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
