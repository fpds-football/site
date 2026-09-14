import { VALUE_LABELS } from "@fpds-football/fpds";
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
      return { label: detail ? `${base.toLowerCase()} · ${detail}` : base.toLowerCase(), checked: CHECKED_SOURCES.has(entry.source) };
    }
  }
  return { label: document.submission?.sender === "player" ? "stated by player" : "stated by agent", checked: false };
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
    <article className="border border-rule bg-field px-5 pt-5 pb-4" aria-label="Submission preview">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-3">
        <span className="text-[1.1rem] font-semibold tracking-[-0.01em]">{player.full_name || "Player name"}</span>
        <span className="text-[0.85rem] text-ink-soft">{meta.join(" · ")}</span>
      </div>

      {isMinor ? (
        <p className="mt-3 border border-[#8a4b00] bg-[#fff4e5] px-3 py-2 text-[0.88rem] text-[#6b3a00]" data-testid="minor-badge">
          <strong>Minor.</strong> This player is less than 18 years old. Safeguarding rules apply.
        </p>
      ) : null}

      <dl className="mt-3 grid grid-cols-1 gap-x-4 sm:grid-cols-[minmax(6rem,9rem)_1fr]">
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
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[26rem] border-collapse text-[0.85rem]">
            <caption className="mb-1 text-left font-semibold">Performance</caption>
            <thead>
              <tr className="border-b border-rule text-left text-ink-soft">
                <th className="py-1 pr-2 font-normal">Season</th>
                <th className="py-1 pr-2 font-normal">Competition</th>
                <th className="py-1 pr-2 text-right font-normal">Apps</th>
                <th className="py-1 pr-2 text-right font-normal">Mins</th>
                <th className="py-1 pr-2 text-right font-normal">G</th>
                <th className="py-1 pr-2 text-right font-normal">A</th>
                <th className="py-1 pr-2 text-right font-normal">CS</th>
                <th className="py-1 font-normal">Source</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((row, index) => {
                const source = sourceOf(document, `/performance/${index}`);
                return (
                  <tr key={`${row.season}-${index}`} className="border-b border-rule">
                    <td className="py-1 pr-2">{row.season}</td>
                    <td className="py-1 pr-2">{row.competition}</td>
                    <td className="py-1 pr-2 text-right">{row.appearances ?? "–"}</td>
                    <td className="py-1 pr-2 text-right">{row.minutes ?? "–"}</td>
                    <td className="py-1 pr-2 text-right">{row.goals ?? "–"}</td>
                    <td className="py-1 pr-2 text-right">{row.assists ?? "–"}</td>
                    <td className="py-1 pr-2 text-right">{row.clean_sheets ?? "–"}</td>
                    <td className="py-1">
                      <Mark source={source} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-1 text-[0.78rem] text-ink-soft">A dash means that the value is not stated. It does not mean zero.</p>
        </div>
      ) : null}
    </article>
  );
}

function Row({ term, value, source }: { term: string; value: ReactNode; source?: Source }) {
  if (value === undefined || value === "" || value === null) return null;
  return (
    <>
      <dt className="pt-1 text-[0.8rem] text-ink-soft sm:py-1 sm:text-[0.85rem]">{term}</dt>
      <dd className="m-0 flex flex-wrap items-baseline gap-2 pb-2 text-[0.92rem] sm:py-1">
        <span className={source && !source.checked ? "italic" : ""}>{value}</span>
        {source ? <Mark source={source} /> : null}
      </dd>
    </>
  );
}

function Mark({ source }: { source: Source }) {
  return (
    <span
      className={`border border-current px-1.5 py-px text-[0.7rem] whitespace-nowrap ${source.checked ? "text-verified" : "text-stated"}`}
    >
      {source.label}
    </span>
  );
}
