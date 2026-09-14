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

// A file from another producer can be invalid, so each value can have any type. These helpers never throw.
const asRecord = (value: unknown): Doc => (value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Doc) : {});
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const asText = (value: unknown): string | undefined =>
  typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : undefined;

/** The source of the value at a pointer: the most specific provenance entry, or the sender (§11.1). */
function sourceOf(document: Doc, pointer: string): Source {
  const provenance = asRecord(document.provenance);
  const tokens = pointer.split("/").slice(1);
  for (let length = tokens.length; length > 0; length--) {
    const entry = asRecord(provenance[`/${tokens.slice(0, length).join("/")}`]);
    const source = asText(entry.source);
    if (source) {
      const base = VALUE_LABELS.source[source as keyof typeof VALUE_LABELS.source] ?? source;
      const detail = asText(source === "verified" ? entry.verified_against : entry.asserted_by);
      return { label: detail ? `${base} · ${detail}` : base, checked: CHECKED_SOURCES.has(source) };
    }
  }
  return { label: asRecord(document.submission).sender === "player" ? "Stated by player" : "Stated by agent", checked: false };
}

interface SourceGroup {
  source: Source;
  /** Names of the parts of the value that have this source. */
  parts: string[];
}

/**
 * The sources of the parts of a value, grouped. A part can have a more specific provenance entry than its parent (§11.1),
 * so one row or one season can have more than one source. Only parts that exist in the document count.
 */
function sourcesOf(document: Doc, pointer: string, value: Doc, parts: [key: string, name: string][]): SourceGroup[] {
  // The first group is the source of the value itself. The other groups are parts with a different source.
  const base = sourceOf(document, pointer);
  const groups = new Map<string, SourceGroup>([[base.label, { source: base, parts: [] }]]);
  for (const [key, name] of parts) {
    if (value[key] === undefined) continue;
    const source = sourceOf(document, `${pointer}/${key}`);
    const group = groups.get(source.label) ?? { source, parts: [] };
    group.parts.push(name);
    groups.set(source.label, group);
  }
  const [own, ...differing] = [...groups.values()] as [SourceGroup, ...SourceGroup[]];
  // When no part uses the source of the value itself, that source describes nothing, so it does not show.
  if (own.parts.length === 0 && differing.length === 1) return [{ source: differing[0]!.source, parts: [] }];
  if (own.parts.length === 0 && differing.length > 1) return differing;
  return [{ source: own.source, parts: [] }, ...differing];
}

function formatDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return asText(value);
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year as number, (month as number) - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** A timestamp in the local format and time zone of the reader (§3). */
function formatTimestamp(value: unknown): string | undefined {
  if (typeof value !== "string") return asText(value);
  const time = new Date(value);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value) || Number.isNaN(time.getTime())) return value;
  return time.toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" });
}

function label<T extends Record<string, string>>(labels: T, value: unknown): string | undefined {
  return typeof value === "string" ? (labels[value] ?? value) : asText(value);
}

/** "CM: Central midfielder", or the value as it is when it is not a known code. */
function positionText(value: unknown): string | undefined {
  const code = asText(value);
  const name = label(VALUE_LABELS.position, value);
  return code && name && name !== code ? `${code}: ${name}` : code;
}

function listOf(value: unknown, format: (item: unknown) => string | undefined = asText): string {
  return asArray(value).map(format).filter(Boolean).join(", ");
}

const CLUB_PARTS: [string, string][] = [
  ["name", "Name"],
  ["country", "Country"],
];
const REPRESENTATION_PARTS: [string, string][] = [
  ["agent_name", "Agent"],
  ["mandate_status", "Mandate"],
  ["fifa_agent_licence", "Licence"],
];
const SEASON_PARTS: [string, string][] = [
  ["season", "Season"],
  ["competition", "Competition"],
  ["competition_country", "Country"],
  ["appearances", "Apps"],
  ["minutes", "Mins"],
  ["goals", "Goals"],
  ["assists", "Assists"],
  ["clean_sheets", "CS"],
];

/**
 * A submission as a club sees it, with the source of each value.
 * It shows what the document contains. It does not decide whether the document is valid.
 */
export function SubmissionView({
  document,
  isMinor,
  minorNote,
}: {
  document: Doc;
  isMinor?: boolean | undefined;
  /** A note under the minor badge, for example when the file and the date of birth do not agree. */
  minorNote?: string | undefined;
}) {
  const submission = asRecord(document.submission);
  const player = asRecord(document.player);
  const contract = asRecord(document.contract);
  const positions = asRecord(document.positions);
  const consent = asRecord(document.consent);
  const currentClub = asRecord(player.current_club);
  const parentClub = asRecord(contract.parent_club);
  const representation = document.representation === undefined ? undefined : asRecord(document.representation);
  const performance = asArray(document.performance).map(asRecord);
  const extensions = asRecord(document.extensions);

  const meta = [
    asText(positions.primary_position),
    formatDate(player.date_of_birth),
    contract.status === "free_agent" ? "Free agent" : asText(currentClub.name),
  ].filter(Boolean);

  const clubText = (club: Doc) => {
    const name = asText(club.name);
    const country = asText(club.country);
    return name && (country ? `${name}, ${countryName(country)}` : name);
  };

  return (
    <LayerCard render={<article />} aria-label="Submission preview">
      <LayerCard.Secondary>
        <div className="w-full min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-lg font-semibold text-kumo-strong">{asText(player.full_name) || "Player name"}</span>
            {isMinor ? (
              <span data-testid="minor-badge" className="shrink-0">
                <Badge variant="warning" icon={<WarningIcon weight="fill" />} className="print:border print:border-current">
                  Minor
                </Badge>
              </span>
            ) : null}
          </div>
          {meta.length > 0 ? <p className="m-0 mt-0.5 text-sm text-kumo-subtle">{meta.join(" · ")}</p> : null}
          {minorNote ? (
            <p data-testid="minor-note" className="m-0 mt-2 flex items-start gap-1.5 rounded-md bg-kumo-warning-tint px-2.5 py-1.5 text-sm font-medium text-kumo-strong">
              <WarningIcon aria-hidden="true" weight="fill" className="mt-0.5 shrink-0 text-kumo-warning" />
              {minorNote}
            </p>
          ) : null}
        </div>
      </LayerCard.Secondary>
      <LayerCard.Primary className="@container p-4">
        <dl className="m-0 divide-y divide-kumo-hairline">
          <Row term="Purposes" value={listOf(submission.purposes, (p) => label(VALUE_LABELS.purposes, p))} />
          <Row term="Nationalities" value={listOf(player.nationalities, (code) => asText(code) && countryName(String(code)))} source={sourceOf(document, "/player/nationalities")} />
          <Row term="Date of birth" value={formatDate(player.date_of_birth)} source={sourceOf(document, "/player/date_of_birth")} />
          <Row
            term="Primary position"
            value={positionText(positions.primary_position)}
            source={sourceOf(document, "/positions/primary_position")}
          />
          <Row term="Secondary positions" value={listOf(positions.secondary_positions)} source={sourceOf(document, "/positions/secondary_positions")} />
          <Row term="Contract" value={label(VALUE_LABELS.contract_status, contract.status)} source={sourceOf(document, "/contract/status")} />
          <Row term="Current club" value={clubText(currentClub)} source={sourcesOf(document, "/player/current_club", currentClub, CLUB_PARTS)} />
          <Row term="Contract expires" value={formatDate(contract.expiry_date)} source={sourceOf(document, "/contract/expiry_date")} />
          <Row term="Parent club" value={clubText(parentClub)} source={sourcesOf(document, "/contract/parent_club", parentClub, CLUB_PARTS)} />
          <Row
            term="Representation"
            value={
              representation
                ? [
                    asText(representation.agent_name),
                    label(VALUE_LABELS.mandate_status, representation.mandate_status),
                    asText(representation.fifa_agent_licence) && `licence ${representation.fifa_agent_licence}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : undefined
            }
            source={representation && sourcesOf(document, "/representation", representation, REPRESENTATION_PARTS)}
          />
          <Row
            term="FIFA Connect ID"
            value={asText(asRecord(player.external_ids).fifa_connect_id)}
            source={sourceOf(document, "/player/external_ids/fifa_connect_id")}
          />
        </dl>

        {performance.length > 0 ? (
          <section aria-label="Performance" className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-kumo-strong">Performance</h3>
            <ul className="m-0 list-none space-y-2 p-0">
              {performance.map((row, index) => {
                const groups = sourcesOf(document, `/performance/${index}`, row, SEASON_PARTS);
                const statSource = (key: string) => sourceOf(document, `/performance/${index}/${key}`);
                return (
                  <li key={`${asText(row.season)}-${index}`} className="break-inside-avoid rounded-md border border-kumo-hairline bg-kumo-tint px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0 font-medium text-kumo-strong">
                        {asText(row.season)}
                        {asText(row.competition) ? <span className="font-normal text-kumo-subtle"> · {asText(row.competition)}</span> : null}
                      </span>
                      {groups[0] && groups[0].parts.length === 0 ? <Mark source={groups[0].source} /> : null}
                    </div>
                    <dl className="m-0 mt-2 grid grid-cols-5 gap-2 text-center">
                      <Stat term="Apps" value={row.appearances} source={statSource("appearances")} />
                      <Stat term="Mins" value={row.minutes} source={statSource("minutes")} />
                      <Stat term="Goals" value={row.goals} source={statSource("goals")} />
                      <Stat term="Assists" value={row.assists} source={statSource("assists")} />
                      <Stat term="Clean sheets" short="CS" value={row.clean_sheets} source={statSource("clean_sheets")} />
                    </dl>
                    {groups.some((group) => group.parts.length > 0) ? (
                      <ul aria-label="Other sources" className="m-0 mt-2 flex list-none flex-wrap justify-end gap-x-3 gap-y-1.5 p-0">
                        {groups.filter((group) => group.parts.length > 0).map((group) => (
                          <li key={group.source.label} className="flex items-center gap-1.5 text-xs text-kumo-subtle">
                            {group.parts.join(", ")}
                            <Mark source={group.source} />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <p className="mt-1.5 mb-0 text-xs text-kumo-subtle">A dash means that the value is not stated. It does not mean zero.</p>
          </section>
        ) : null}

        <SubmissionDetails submission={submission} consent={consent} />
        <Extensions extensions={extensions} />
      </LayerCard.Primary>
    </LayerCard>
  );
}

/** Facts about the file, not claims about the player. They have no source marks. */
function SubmissionDetails({ submission, consent }: { submission: Doc; consent: Doc }) {
  const lawfulBasis = label(VALUE_LABELS.lawful_basis, consent.lawful_basis);
  const consentDate = formatDate(consent.consent_date);
  const rows: [string, string | undefined][] = [
    ["Sent by", label(VALUE_LABELS.sender, submission.sender)],
    ["Lawful basis", lawfulBasis && (consentDate ? `${lawfulBasis}, given on ${consentDate}` : lawfulBasis)],
    ["Created", formatTimestamp(submission.submitted_at)],
    ["Submission ID", asText(submission.submission_id)],
  ];
  if (!rows.some(([, value]) => value)) return null;
  return (
    <section aria-label="About this file" className="mt-4 border-t border-kumo-hairline pt-3">
      <h3 className="mb-1 text-sm font-semibold text-kumo-strong">About this file</h3>
      <dl className="m-0 grid grid-cols-[minmax(5.5rem,7.5rem)_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        {rows.map(([term, value]) =>
          value ? (
            <div key={term} className="contents">
              <dt className="text-kumo-subtle">{term}</dt>
              <dd className={`m-0 min-w-0 text-kumo-default ${term === "Submission ID" ? "font-mono text-xs leading-5 break-all" : ""}`}>{value}</dd>
            </div>
          ) : null,
        )}
      </dl>
    </section>
  );
}

/**
 * Extensions are not part of FPDS, and a consumer does not recognise them (§12).
 * They appear closed, grouped by prefix, as plain data with no source marks and no FPDS styling.
 */
function Extensions({ extensions }: { extensions: Doc }) {
  const keys = Object.keys(extensions);
  if (keys.length === 0) return null;
  const groups = new Map<string, [string, unknown][]>();
  for (const key of keys) {
    const slash = key.indexOf("/");
    const prefix = slash > 0 ? key.slice(0, slash) : key;
    const name = slash > 0 ? key.slice(slash + 1) : "";
    groups.set(prefix, [...(groups.get(prefix) ?? []), [name, extensions[key]]]);
  }
  return (
    <details data-testid="extensions" className="group mt-4 border-t border-kumo-hairline pt-3 text-sm">
      <summary className="cursor-pointer font-semibold text-kumo-strong">
        Extra information from other software <span className="font-normal text-kumo-subtle">({keys.length})</span>
      </summary>
      <p className="mt-2 mb-3 text-kumo-subtle">
        FPDS does not define these fields. Other software added them. They show here as the file contains them.
      </p>
      {[...groups].map(([prefix, fields]) => (
        <section key={prefix} aria-label={prefix} className="mb-3 last:mb-0">
          <h4 className="m-0 mb-1 font-mono text-xs text-kumo-subtle">{prefix}</h4>
          <dl className="m-0 space-y-1">
            {fields.map(([name, value]) => (
              <div key={name} className="grid grid-cols-[minmax(5.5rem,7.5rem)_minmax(0,1fr)] gap-x-3">
                <dt className="font-mono text-xs leading-6 break-all text-kumo-subtle">{name || "(no field name)"}</dt>
                <dd className="m-0 min-w-0">
                  {asText(value) ?? (
                    <pre className="m-0 overflow-x-auto font-mono text-xs leading-5 whitespace-pre-wrap break-all">{JSON.stringify(value, null, 2)}</pre>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </details>
  );
}

function Row({ term, value, source }: { term: string; value: ReactNode; source?: Source | SourceGroup[] | undefined }) {
  if (value === undefined || value === "" || value === null) return null;
  const groups = source === undefined ? [] : Array.isArray(source) ? source : [{ source, parts: [] }];
  const checked = groups.length > 0 && groups.every((group) => group.source.checked);
  // In a wide card, three columns: term, value, source. The source badges line up in one column.
  // In a narrow card, the term and the source share the first line, and the value has the full width below them.
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 py-2 @md:grid-cols-[minmax(5.5rem,7.5rem)_minmax(0,1fr)_auto] @md:items-baseline">
      <dt className="col-start-1 row-start-1 text-sm text-kumo-subtle">{term}</dt>
      <dd
        className={`col-span-2 col-start-1 row-start-2 m-0 min-w-0 break-words @md:col-span-1 @md:col-start-2 @md:row-start-1 ${groups.length > 0 && !checked ? "italic" : "text-kumo-strong"}`}
      >
        {value}
      </dd>
      <dd className="col-start-2 row-start-1 m-0 flex flex-col items-end gap-1 justify-self-end @md:col-start-3">
        {groups.map((group) => (
          <span key={group.source.label} className="flex items-center gap-1.5 text-xs text-kumo-subtle">
            {group.parts.length > 0 ? group.parts.join(", ") : null}
            <Mark source={group.source} />
          </span>
        ))}
      </dd>
    </div>
  );
}

function Stat({ term, short, value, source }: { term: string; short?: string; value: unknown; source: Source }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-kumo-subtle uppercase">
        {short ? <abbr title={term} className="no-underline">{short}</abbr> : term}
      </dt>
      <dd className={`m-0 font-medium tabular-nums ${source.checked ? "text-kumo-strong" : "italic"}`}>
        {typeof value === "number" ? value.toLocaleString("en-GB") : "–"}
      </dd>
    </div>
  );
}

function Mark({ source }: { source: Source }) {
  return (
    // In print, a border keeps the difference between the two kinds of source visible without colour.
    <Badge
      variant={source.checked ? "info" : "warning"}
      className={`whitespace-nowrap print:border ${source.checked ? "print:border-solid" : "print:border-dashed"} print:border-current`}
    >
      {source.label}
    </Badge>
  );
}
