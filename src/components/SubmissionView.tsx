import { Badge, Banner, LayerCard, Table } from "@cloudflare/kumo";
import { VALUE_LABELS } from "@fpds-football/fpds";
import { WarningIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { countryName } from "~/content/countries";

type Doc = Record<string, any>;

interface Source {
  label: string;
  checked: boolean;
}

const CHECKED_SOURCES = new Set(["verified", "third_party_data"]);

/** The source of the value at a pointer: the most specific provenance entry, or the sender (§11.1). */
function sourceOf(document: Doc, pointer: string): Source {
  const provenance = (document.provenance ?? {}) as Record<string, { source: string; asserted_by?: string; verified_against?: string }>;
  const tokens = pointer.split("/").slice(1);
  for (let length = tokens.length; length > 0; length--) {
    const entry = provenance[`/${tokens.slice(0, length).join("/")}`];
    if (entry) {
      const base = VALUE_LABELS.source[entry.source as keyof typeof VALUE_LABELS.source] ?? entry.source;
      const detail = entry.source === "verified" ? entry.verified_against : entry.asserted_by;
      return { label: detail ? `${base} · ${detail}` : base, checked: CHECKED_SOURCES.has(entry.source) };
    }
  }
  return { label: document.submission?.sender === "player" ? "Stated by player" : "Stated by agent", checked: false };
}

function formatDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return typeof value === "string" ? value : undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year as number, (month as number) - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function label<T extends Record<string, string>>(labels: T, value: unknown): string | undefined {
  return typeof value === "string" ? (labels[value] ?? value) : undefined;
}

/**
 * A submission as a club sees it, with the source of each value.
 * It shows what the document contains. It does not decide whether the document is valid.
 */
export function SubmissionView({ document, isMinor }: { document: Doc; isMinor?: boolean | undefined }) {
  const player = document.player ?? {};
  const contract = document.contract ?? {};
  const representation = document.representation;
  const positions = document.positions ?? {};
  const performance: Doc[] = Array.isArray(document.performance) ? document.performance : [];
  const purposes: string[] = document.submission?.purposes ?? [];

  const meta = [
    positions.primary_position,
    formatDate(player.date_of_birth),
    contract.status === "free_agent" ? "Free agent" : player.current_club?.name,
  ].filter(Boolean);

  return (
    <LayerCard render={<article />} aria-label="Submission preview">
      <LayerCard.Secondary className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-lg font-semibold text-kumo-strong">{player.full_name || "Player name"}</span>
        <span className="text-sm text-kumo-subtle">{meta.join(" · ")}</span>
      </LayerCard.Secondary>
      <LayerCard.Primary className="p-4">
        {isMinor ? (
          <div className="mb-3" data-testid="minor-badge">
            <Banner
              variant="alert"
              size="sm"
              icon={<WarningIcon weight="fill" />}
              title="Minor"
              description="This player is less than 18 years old. Safeguarding rules apply."
            />
          </div>
        ) : null}

        <dl className="m-0 grid grid-cols-1 gap-x-4 sm:grid-cols-[minmax(6rem,9rem)_1fr]">
          <Row term="Purposes" value={purposes.map((p) => label(VALUE_LABELS.purposes, p)).join(", ")} />
          <Row term="Nationalities" value={(player.nationalities ?? []).map(countryName).join(", ")} source={sourceOf(document, "/player/nationalities")} />
          <Row term="Date of birth" value={formatDate(player.date_of_birth)} source={sourceOf(document, "/player/date_of_birth")} />
          <Row term="Secondary positions" value={(positions.secondary_positions ?? []).join(", ")} source={sourceOf(document, "/positions/secondary_positions")} />
          <Row term="Contract" value={label(VALUE_LABELS.contract_status, contract.status)} source={sourceOf(document, "/contract/status")} />
          <Row term="Current club" value={player.current_club?.name && `${player.current_club.name}, ${countryName(player.current_club.country ?? "")}`} source={sourceOf(document, "/player/current_club")} />
          <Row term="Contract expires" value={formatDate(contract.expiry_date)} source={sourceOf(document, "/contract/expiry_date")} />
          <Row term="Parent club" value={contract.parent_club?.name} source={sourceOf(document, "/contract/parent_club")} />
          <Row
            term="Representation"
            value={
              representation
                ? [representation.agent_name, label(VALUE_LABELS.mandate_status, representation.mandate_status), representation.fifa_agent_licence && `licence ${representation.fifa_agent_licence}`]
                    .filter(Boolean)
                    .join(" · ")
                : undefined
            }
            source={sourceOf(document, "/representation")}
          />
        </dl>

        {performance.length > 0 ? (
          <div className="mt-3">
            <p className="mb-1 font-semibold">Performance</p>
            <div className="overflow-x-auto rounded-md border border-kumo-line">
              <Table className="min-w-[28rem] text-sm">
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Season</Table.Head>
                    <Table.Head>Competition</Table.Head>
                    <Table.Head className="text-right">Apps</Table.Head>
                    <Table.Head className="text-right">Mins</Table.Head>
                    <Table.Head className="text-right">G</Table.Head>
                    <Table.Head className="text-right">A</Table.Head>
                    <Table.Head className="text-right">CS</Table.Head>
                    <Table.Head>Source</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {performance.map((row, index) => (
                    <Table.Row key={`${row.season}-${index}`}>
                      <Table.Cell>{row.season}</Table.Cell>
                      <Table.Cell>{row.competition}</Table.Cell>
                      <Table.Cell className="text-right">{row.appearances ?? "–"}</Table.Cell>
                      <Table.Cell className="text-right">{row.minutes ?? "–"}</Table.Cell>
                      <Table.Cell className="text-right">{row.goals ?? "–"}</Table.Cell>
                      <Table.Cell className="text-right">{row.assists ?? "–"}</Table.Cell>
                      <Table.Cell className="text-right">{row.clean_sheets ?? "–"}</Table.Cell>
                      <Table.Cell>
                        <Mark source={sourceOf(document, `/performance/${index}`)} />
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
            <p className="mt-1 text-xs text-kumo-subtle">A dash means that the value is not stated. It does not mean zero.</p>
          </div>
        ) : null}
      </LayerCard.Primary>
    </LayerCard>
  );
}

function Row({ term, value, source }: { term: string; value: ReactNode; source?: Source }) {
  if (value === undefined || value === "" || value === null) return null;
  return (
    <>
      <dt className="pt-1 text-sm text-kumo-subtle sm:py-1.5">{term}</dt>
      <dd className="m-0 flex flex-wrap items-center gap-2 pb-2 sm:py-1.5">
        <span className={source && !source.checked ? "italic" : "text-kumo-strong"}>{value}</span>
        {source ? <Mark source={source} /> : null}
      </dd>
    </>
  );
}

function Mark({ source }: { source: Source }) {
  return <Badge variant={source.checked ? "info" : "warning"}>{source.label}</Badge>;
}
