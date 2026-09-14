import { Badge, LayerCard } from "@cloudflare/kumo";
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
      <LayerCard.Secondary>
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-lg font-semibold text-kumo-strong">{player.full_name || "Player name"}</span>
          {isMinor ? (
            <span data-testid="minor-badge" className="shrink-0">
              <Badge variant="warning" icon={<WarningIcon weight="fill" />}>
                Minor
              </Badge>
            </span>
          ) : null}
        </div>
        {meta.length > 0 ? <p className="m-0 mt-0.5 text-sm text-kumo-subtle">{meta.join(" · ")}</p> : null}
      </LayerCard.Secondary>
      <LayerCard.Primary className="p-4">
        <dl className="m-0 divide-y divide-kumo-hairline">
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
          <section aria-label="Performance" className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-kumo-strong">Performance</h3>
            <ul className="m-0 list-none space-y-2 p-0">
              {performance.map((row, index) => (
                <li key={`${row.season}-${index}`} className="rounded-md border border-kumo-hairline bg-kumo-tint px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 font-medium text-kumo-strong">
                      {row.season}
                      {row.competition ? <span className="font-normal text-kumo-subtle"> · {row.competition}</span> : null}
                    </span>
                    <Mark source={sourceOf(document, `/performance/${index}`)} />
                  </div>
                  <dl className="m-0 mt-2 grid grid-cols-5 gap-2 text-center">
                    <Stat term="Apps" value={row.appearances} />
                    <Stat term="Mins" value={row.minutes} />
                    <Stat term="Goals" value={row.goals} />
                    <Stat term="Assists" value={row.assists} />
                    <Stat term="Clean sheets" short="CS" value={row.clean_sheets} />
                  </dl>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 mb-0 text-xs text-kumo-subtle">A dash means that the value is not stated. It does not mean zero.</p>
          </section>
        ) : null}
      </LayerCard.Primary>
    </LayerCard>
  );
}

function Row({ term, value, source }: { term: string; value: ReactNode; source?: Source }) {
  if (value === undefined || value === "" || value === null) return null;
  // Three columns: term, value, source. The source badges line up in one column, so they never wrap under a value.
  return (
    <div className="grid grid-cols-[minmax(5.5rem,7.5rem)_minmax(0,1fr)_auto] items-baseline gap-x-3 py-2">
      <dt className="text-sm text-kumo-subtle">{term}</dt>
      <dd className={`m-0 min-w-0 ${source && !source.checked ? "italic" : "text-kumo-strong"}`}>{value}</dd>
      <dd className="m-0 justify-self-end">{source ? <Mark source={source} /> : null}</dd>
    </div>
  );
}

function Stat({ term, short, value }: { term: string; short?: string; value: unknown }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-kumo-subtle uppercase">
        {short ? <abbr title={term} className="no-underline">{short}</abbr> : term}
      </dt>
      <dd className="m-0 font-medium text-kumo-strong tabular-nums">{typeof value === "number" ? value.toLocaleString("en-GB") : "–"}</dd>
    </div>
  );
}

function Mark({ source }: { source: Source }) {
  return (
    <Badge variant={source.checked ? "info" : "warning"} className="whitespace-nowrap">
      {source.label}
    </Badge>
  );
}
