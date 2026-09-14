import { Banner, Link } from "@cloudflare/kumo";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteHeader } from "~/components/SiteHeader";
import { pageHead } from "~/content/site";

/**
 * MAINTAINER: before launch, set CONTROLLER_NAME to the legal name of the data controller (a person or a company),
 * confirm the retention periods, and confirm the facts about Tally against the current Tally data processing agreement.
 */
const CONTROLLER_NAME = "CONTROLLER_NAME";

export const Route = createFileRoute("/consult/privacy")({
  head: () =>
    pageHead({
      title: "Privacy notice for consultations: FPDS",
      description: "How FPDS uses the data that you give in a consultation.",
      path: "/consult/privacy/",
    }),
  component: Privacy,
});

function Privacy() {
  return (
    <>
      <SiteHeader>
        <Link href="/consult/">Consultations</Link> / Privacy notice
      </SiteHeader>
      <main className="wrap">
        <div className="prose-block">
          <p className="eyebrow">Privacy</p>
          <h1 className="page-title">Privacy notice for consultations</h1>
          <p className="text-lg">
            This notice explains how FPDS uses the data that you give when you answer a consultation.
          </p>

          <Section heading="Who is responsible for your data">
            <p>
              The data controller is {CONTROLLER_NAME}, the maintainer of FPDS. For all questions about your data, send
              an email to <Email />.
            </p>
          </Section>

          <Section heading="The data that we collect">
            <ul>
              <li>The consultation that you answer</li>
              <li>Your role, for example agent, club staff or player</li>
              <li>Your answer</li>
              <li>The idea that is closest to your view, if you choose one</li>
              <li>Your name, if you give it</li>
              <li>Your email address, if you give it</li>
            </ul>
            <Banner variant="alert" className="mb-4" description="Do not write information about the health, wages or contract of a specific person." />
          </Section>

          <Section heading="Why we collect it">
            <ul>
              <li>We count the answers from each role and write a summary of the reasons.</li>
              <li>If you give your name, we can contact you about your answer. We never publish it.</li>
              <li>We use the summary to decide what goes into FPDS.</li>
              <li>If you give your email address, we send you the summary. We do not send you other messages.</li>
            </ul>
            <p>
              The lawful basis is your consent, under Article 6(1)(a) of the UK GDPR and the EU GDPR. You give consent
              when you submit the form.
            </p>
          </Section>

          <Section heading="What we publish">
            <ul>
              <li>The summary shows the number of answers from each role, and for each idea.</li>
              <li>The summary can quote a comment. A quote never includes a name, an email address or an organisation.</li>
              <li>We do not publish individual answers.</li>
            </ul>
          </Section>

          <Section heading="Who processes your data">
            <p>
              The form uses Tally, which is a company in Belgium. Tally processes the answers for us under a data
              processing agreement, and stores them in the European Union.
            </p>
          </Section>

          <Section heading="How long we keep it">
            <ul>
              <li>We delete names and email addresses 30 days after we publish the summary.</li>
              <li>We keep answers without names and email addresses for 24 months after the consultation closes. Then we delete them.</li>
              <li>Published summaries stay public, because they are the record of the decision.</li>
            </ul>
          </Section>

          <Section heading="Age">
            <p>You must be 18 or older to answer a consultation. A parent or guardian can answer for a young player.</p>
          </Section>

          <Section heading="Your rights">
            <p>You can do these things at any time:</p>
            <ul>
              <li>Get a copy of your data</li>
              <li>Correct your data</li>
              <li>Delete your data</li>
              <li>Withdraw your consent</li>
            </ul>
            <p>
              Send an email to <Email />. We answer in one month or less. If you are not satisfied, you can complain to
              the Information Commissioner's Office in the UK, or to the data protection authority in your country.
            </p>
          </Section>

          <p className="text-sm text-kumo-subtle">Last change: before launch.</p>
        </div>
      </main>
    </>
  );
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="section-heading">{heading}</h2>
      {children}
    </section>
  );
}

function Email() {
  return <Link href="mailto:privacy@fpds.football">privacy@fpds.football</Link>;
}
