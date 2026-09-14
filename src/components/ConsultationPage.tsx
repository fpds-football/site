import { Link } from "@tanstack/react-router";
import type { Consultation } from "~/content/consultations";
import { DECISIONS_URL } from "~/content/site";
import { SiteHeader } from "./SiteHeader";

export function ConsultationPage({ consultation: c }: { consultation: Consultation }) {
  return (
    <>
      <SiteHeader>
        <Link to="/consult/">Consultations</Link> / {c.title}
      </SiteHeader>

      <main className="wrap">
        <div className="prose-block">
          <p className="mt-11 mb-2 text-[0.85rem] tracking-[0.04em] text-ink-soft uppercase">Consultation · {c.oq}</p>
          <h1 className="mb-5 max-w-[26ch] text-[clamp(1.6rem,1.15rem+1.8vw,2.3rem)] leading-tight font-bold tracking-[-0.02em]">
            {c.question}
          </h1>
          <p className="text-[1.05rem]">{c.lede}</p>

          <dl className="mt-6 grid grid-cols-1 gap-x-5 gap-y-1 border-y border-rule py-4 sm:grid-cols-[minmax(8rem,12rem)_1fr]">
            <Fact term="Status">Opens when FPDS launches</Fact>
            <Fact term="Open for">At least 14 days</Fact>
            <Fact term="Who can answer">{c.whoCanAnswer}</Fact>
            <Fact term="Time">About three minutes</Fact>
            <Fact term="FPDS now">{c.fpdsNow}</Fact>
          </dl>

          {c.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="section-heading">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-4">
          <Side heading={c.forHeading} items={c.caseFor} />
          <Side heading={c.againstHeading} items={c.caseAgainst} />
        </div>

        <div className="prose-block">
          <h2 className="section-heading">The options</h2>
          <ol className="mb-4 list-none p-0">
            {c.options.map((option) => (
              <li key={option.label} className="mb-2.5 border border-rule bg-field px-4 py-3">
                <strong className="block">{option.label}</strong> {option.text}
              </li>
            ))}
          </ol>
          {c.optionsNote ? <p className="small-print">{c.optionsNote}</p> : null}

          <h2 className="section-heading">Give your answer</h2>
          {c.tallyFormId ? (
            <iframe
              src={`https://tally.so/embed/${c.tallyFormId}?alignLeft=1&hideTitle=1&transparentBackground=1`}
              title={`Consultation form: ${c.title.toLowerCase()}`}
              loading="lazy"
              className="mb-4 h-[900px] w-full border-0"
            />
          ) : (
            <div className="mb-4 border border-dashed border-rule bg-field p-6 text-ink-soft">
              The form opens when the consultation opens.
            </div>
          )}
          <p className="small-print">
            Read the <Link to="/consult/privacy/">privacy notice</Link> before you answer. {c.answerNote}
          </p>

          <h2 className="section-heading">What happens next</h2>
          <ol>
            <li>The consultation stays open for at least 14 days.</li>
            <li>
              We publish a summary on this page. The summary shows the number of answers from each role, and the main
              reasons on each side. It does not show names.
            </li>
            <li>
              We record the decision and its reasons in the <a href={DECISIONS_URL}>decision log</a>.
            </li>
          </ol>
          <p className="small-print">
            Developers can also discuss this question on{" "}
            <a href={`https://github.com/fpds-football/spec/discussions?discussions_q=${c.oq}`}>GitHub</a>.
          </p>
        </div>
      </main>
    </>
  );
}

function Fact({ term, children }: { term: string; children: string }) {
  return (
    <>
      <dt className="text-[0.92rem] text-ink-soft">{term}</dt>
      <dd className="mb-2.5 sm:mb-0">{children}</dd>
    </>
  );
}

function Side({ heading, items }: { heading: string; items: string[] }) {
  return (
    <section className="border border-rule bg-field px-5 pt-4 pb-1.5">
      <h3 className="mb-2 text-base font-semibold">{heading}</h3>
      <ul className="mb-4 list-disc pl-5">
        {items.map((item) => (
          <li key={item} className="mb-1.5">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
