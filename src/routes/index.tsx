import { Badge, LayerCard, Link } from "@cloudflare/kumo";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LinkCard } from "~/components/LinkCard";
import { SiteHeader } from "~/components/SiteHeader";
import { consultations } from "~/content/consultations";
import { pageHead, SPEC_URL } from "~/content/site";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead({
      title: "FPDS: Football Player Data Standard",
      description:
        "A free, open standard for player profiles that agents and players send to clubs. Every figure has its context, and every claim shows who made it.",
      path: "/",
    }),
  component: Home,
});

function Home() {
  return (
    <>
      <SiteHeader>Draft v0.1.0. Nothing is stable yet. Breaking changes are expected before version 1.0.</SiteHeader>

      <main className="wrap">
        <h1 className="mt-12 mb-5 max-w-[20ch] text-[clamp(1.75rem,1.2rem+2vw,2.6rem)] leading-[1.15] font-semibold tracking-[-0.025em] text-kumo-strong">
          A player profile should say who claimed what.
        </h1>

        <p className="prose-block mb-4 text-lg leading-relaxed">
          FPDS is a free, open standard for player profiles. A player profile is the information that an agent, an
          intermediary or a player sends to a club about a player.
        </p>
        <p className="prose-block mb-10">
          FPDS gives every player profile the same structure. Every figure has its context, and every claim shows who
          made it. A club can then read a profile in seconds, compare it with others, and see what it can check.
        </p>

        <div className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          <LayerCard>
            <LayerCard.Secondary>
              <h2 id="problem" className="m-0 font-semibold">
                The problem
              </h2>
            </LayerCard.Secondary>
            <LayerCard.Primary className="flex-1 p-5">
              <p className="mb-3">Today, most player profiles are free text in an email or a message:</p>
              <blockquote className="mb-3 border-l-2 border-kumo-line pl-4 text-kumo-subtle italic">
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
            </LayerCard.Primary>
          </LayerCard>

          <LayerCard>
            <LayerCard.Secondary>
              <h2 id="goal" className="m-0 font-semibold">
                The goal
              </h2>
            </LayerCard.Secondary>
            <LayerCard.Primary className="flex-1 p-5">
              <ul className="mb-0 list-none space-y-3 pl-0">
                <Goal title="Clubs get information that they can use.">
                  The same fields in the same format from every sender, with minutes for every output and a source for
                  every claim.
                </Goal>
                <Goal title="Agents and players get taken seriously.">
                  A clear, complete profile gets read. A profile that shows its sources gets trust.
                </Goal>
                <Goal title="Software can read and write it.">
                  Agency tools, scouting platforms and club systems can all use the same open format, without a licence
                  fee.
                </Goal>
                <Goal title="Player data is shared with care.">
                  FPDS contains no medical records, and it marks every profile about a minor.
                </Goal>
              </ul>
            </LayerCard.Primary>
          </LayerCard>
        </div>

        <h2 className="section-heading">What a club sees</h2>
        <LayerCard className="mb-3.5">
          <LayerCard.Secondary className="flex flex-wrap items-baseline justify-between gap-4">
            <span className="text-lg font-semibold text-kumo-strong">Tomasz Wojcik</span>
            <span className="text-sm text-kumo-subtle">CM · 17 April 2003 · Widzew Łódź</span>
          </LayerCard.Secondary>
          <LayerCard.Primary className="p-5">
            <dl
              aria-label="Example player profile showing verified and agent-stated claims"
              className="m-0 grid grid-cols-1 gap-x-5 sm:grid-cols-[minmax(7rem,11rem)_1fr]"
            >
              <Claim label="Contract expires" value="30 June 2027" mark="Verified · FIFA TMS" kind="checked" />
              <Claim label="Minutes, 2025/26" value="2,418" mark="Data provider · Wyscout" kind="checked" />
              <Claim label="Goals, 2025/26" value="10" mark="Data provider · Wyscout" kind="checked" />
              <Claim label="Assists, 2025/26" value="6" mark="Stated by agent" kind="stated" />
              <Claim label="Also plays" value="CDM, CAM" mark="Stated by agent" kind="stated" />
              <Claim label="Mandate" value="Exclusive" mark="Stated by agent · licence POL-2024-01188" kind="stated" />
            </dl>
          </LayerCard.Primary>
        </LayerCard>

        <p className="mb-12 max-w-[44rem] text-sm text-kumo-subtle">
          The same profile, with the source of each value shown. Three of these values come from a source that you
          can check. Three come only from the agent. A recruitment analyst sees the difference in less than a second.
          If an interface shows a verified figure and an unverified figure in the same way, the format has no purpose.
        </p>

        <section aria-labelledby="how" className="prose-block mb-12">
          <h2 id="how" className="section-heading">
            How it works
          </h2>
          <ol className="mb-0 list-none space-y-4 pl-0">
            <HowStep number={1} title="Create the profile">
              Use the free <Link href="/build/">builder</Link> on this site, or software that supports FPDS. The builder
              runs in your browser, and your information stays on your device.
            </HowStep>
            <HowStep number={2} title="Send the file">
              The builder makes a file that ends with <code>.fpds.json</code>. Send it by email or message, as you send a
              PDF now.
            </HowStep>
            <HowStep number={3} title="The club reads it">
              The club opens the file in the free <Link href="/view/">viewer</Link> on this site, or in software that
              supports FPDS. The viewer shows the player, the source of each value, and any problems with the file. The
              file never leaves the browser.
            </HowStep>
          </ol>
        </section>

        <nav aria-label="Main links" className="mb-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <LinkCard href="/build/" title="Create a player profile" note="In your browser. Your data stays on your device." className="lg:col-span-3" />
          <LinkCard href="/view/" title="View a player profile" note="Open a file from an agent. The file stays on your device." className="lg:col-span-3" />
          <LinkCard href={SPEC_URL} title="Read the specification" note="The normative document, in fourteen sections" className="lg:col-span-2" />
          <LinkCard href="/schema/v0.1/player.json" title="Get the schema" note="JSON Schema 2020-12, at a permanent URL" className="lg:col-span-2" />
          <LinkCard href="/consult/" title="Take part" note="Help decide what goes into FPDS" className="sm:col-span-2 lg:col-span-2" />
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
                <Link href={`/consult/${c.slug}/`}>{c.title}</Link>
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
              A profile can travel by email, API, file transfer or message.
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
            The schema is at a permanent URL. The{" "}
            <Link href="https://www.npmjs.com/package/@fpds-football/fpds">TypeScript library</Link> validates documents
            and gives messages in plain English. The{" "}
            <Link href="https://github.com/fpds-football/spec/tree/main/tests/conformance">conformance suite</Link> tests
            any implementation.
          </p>
          <pre className="mb-4 overflow-x-auto rounded-md border border-kumo-line bg-kumo-base px-4 py-3.5 text-sm leading-normal">
            <code>{`pip install check-jsonschema
check-jsonschema \\
  --schemafile https://fpds.football/schema/v0.1/player.json \\
  player.fpds.json`}</code>
          </pre>
          <p>Some rules are not in the schema. Section 13.1 of the specification lists them.</p>
        </div>
      </main>
    </>
  );
}

function Goal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li>
      <strong className="block text-kumo-strong">{title}</strong>
      {children}
    </li>
  );
}

function HowStep({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[2.25rem_1fr] gap-3">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-kumo-brand font-semibold text-kumo-inverse"
      >
        {number}
      </span>
      <div>
        <strong className="block text-kumo-strong">{title}</strong>
        {children}
      </div>
    </li>
  );
}

function Claim({ label, value, mark, kind }: { label: string; value: string; mark: string; kind: "checked" | "stated" }) {
  return (
    <>
      <dt className="pt-1.5 text-sm text-kumo-subtle sm:py-1.5">{label}</dt>
      <dd className="m-0 flex flex-wrap items-center gap-2.5 pb-3 sm:py-1.5">
        <span className={kind === "checked" ? "font-semibold text-kumo-strong" : "italic"}>{value}</span>
        <Badge variant={kind === "checked" ? "info" : "warning"}>{mark}</Badge>
      </dd>
    </>
  );
}
