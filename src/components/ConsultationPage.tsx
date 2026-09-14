import { Badge, Banner, LayerCard, Link } from "@cloudflare/kumo";
import { CheckCircleIcon, ClockIcon, XCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { type Consultation, TALLY_FORM_ID } from "~/content/consultations";
import { DECISIONS_URL } from "~/content/site";
import { SiteHeader } from "./SiteHeader";

export function ConsultationPage({ consultation: c }: { consultation: Consultation }) {
  return (
    <>
      <SiteHeader>
        <Link href="/consult/">Consultations</Link> / {c.title}
      </SiteHeader>

      <main className="wrap">
        <div className="prose-block">
          <p className="eyebrow">Consultation · {c.oq}</p>
          <h1 className="page-title">{c.question}</h1>
          <p className="text-lg">{c.lede}</p>
        </div>

        <LayerCard className="mt-6 max-w-[40rem]">
          <LayerCard.Primary className="p-5">
            <dl className="m-0 grid grid-cols-1 gap-x-5 gap-y-1 sm:grid-cols-[minmax(8rem,11rem)_1fr]">
              <Fact term="Status">
                <Badge variant="success" icon={<CheckCircleIcon />}>
                  Open
                </Badge>
              </Fact>
              <Fact term="Open for">At least 14 days</Fact>
              <Fact term="Who can answer">{c.whoCanAnswer}</Fact>
              <Fact term="Time">About three minutes</Fact>
              <Fact term="FPDS now">{c.fpdsNow}</Fact>
            </dl>
          </LayerCard.Primary>
        </LayerCard>

        <div className="prose-block">
          {c.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="section-heading">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-6 mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Side heading={c.forHeading} items={c.caseFor} kind="for" />
          <Side heading={c.againstHeading} items={c.caseAgainst} kind="against" />
        </div>

        <div className="prose-block">
          <h2 className="section-heading">Some ideas</h2>
          <p>
            These ideas start the discussion. They are not the only answers. Agree with one, change one, or tell us
            something different.
          </p>
          <ol className="!mb-4 !list-none space-y-2.5 !pl-0">
            {c.ideas.map((idea) => (
              <li key={idea.label} className="!m-0">
                <LayerCard className="px-4 py-3">
                  <strong className="block text-kumo-strong">{idea.label}</strong> {idea.text}
                </LayerCard>
              </li>
            ))}
          </ol>
          {c.ideasNote ? <p className="text-sm text-kumo-subtle">{c.ideasNote}</p> : null}

          <h2 className="section-heading">Give your answer</h2>
          <p>Write your answer in your own words.</p>
          {TALLY_FORM_ID ? (
            <iframe
              src={`https://tally.so/embed/${TALLY_FORM_ID}?alignLeft=1&hideTitle=1&transparentBackground=1&consultation=${c.slug}`}
              title={`Consultation form: ${c.title.toLowerCase()}`}
              loading="lazy"
              className="mb-4 h-[900px] w-full border-0"
            />
          ) : (
            <Banner
              variant="secondary"
              icon={<ClockIcon weight="fill" />}
              title="The form opens when the consultation opens."
              className="mb-4"
            />
          )}
          <p className="text-sm text-kumo-subtle">
            Read the <Link href="/consult/privacy/">privacy notice</Link> before you answer. {c.answerNote}
          </p>

          <h2 className="section-heading">What happens next</h2>
          <ol>
            <li>The consultation stays open for at least 14 days.</li>
            <li>
              We publish a summary on this page. The summary shows the number of answers from each role, and the main
              reasons on each side. It does not show names.
            </li>
            <li>
              We record the decision and its reasons in the <Link href={DECISIONS_URL}>decision log</Link>.
            </li>
          </ol>
          <p className="text-sm text-kumo-subtle">
            Developers can also discuss this question on{" "}
            <Link href={`https://github.com/fpds-football/spec/discussions?discussions_q=${c.oq}`}>GitHub</Link>.
          </p>
        </div>
      </main>
    </>
  );
}

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-sm text-kumo-subtle sm:py-1">{term}</dt>
      <dd className="m-0 mb-2.5 sm:mb-0 sm:py-1">{children}</dd>
    </>
  );
}

function Side({ heading, items, kind }: { heading: string; items: string[]; kind: "for" | "against" }) {
  const Icon = kind === "for" ? CheckCircleIcon : XCircleIcon;
  return (
    <LayerCard>
      <LayerCard.Secondary>
        <h3 className="m-0 flex items-center gap-2 font-semibold">
          <Icon aria-hidden="true" weight="fill" className={kind === "for" ? "text-kumo-success" : "text-kumo-danger"} />
          {heading}
        </h3>
      </LayerCard.Secondary>
      <LayerCard.Primary className="p-5">
        <ul className="mb-0 list-disc space-y-1.5 pl-5">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </LayerCard.Primary>
    </LayerCard>
  );
}
