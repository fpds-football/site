import { Badge, LayerCard } from "@cloudflare/kumo";
import { type Issue, VALUE_LABELS } from "@fpds-football/fpds";
import { ArrowSquareOutIcon, ShieldWarningIcon, WarningCircleIcon, WarningIcon } from "@phosphor-icons/react";
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

/** The values that have their own row. A problem with a value inside one of them shows in that row. */
const ROW_POINTERS = [
  "/submission/purposes",
  "/submission/sender",
  "/submission/submitted_at",
  "/submission/submission_id",
  "/player/full_name",
  "/player/date_of_birth",
  "/player/nationalities",
  "/player/current_club",
  "/player/external_ids",
  "/positions/primary_position",
  "/positions/secondary_positions",
  "/contract/status",
  "/contract/expiry_date",
  "/contract/parent_club",
  "/representation",
  "/consent/lawful_basis",
  "/consent/consent_date",
  "/consent/is_minor",
];

/** Values that show in the row of another value. */
const SHARED_ROWS: Record<string, string> = {
  "/player/full_name": "header",
  "/consent/is_minor": "header",
  "/consent/consent_date": "/consent/lawful_basis",
};

const escapeToken = (token: string) => token.replaceAll("~", "~0").replaceAll("/", "~1");

/**
 * The place in the card for a problem at a JSON Pointer: a row, a season, a section, an extension or the header.
 * Returns undefined if the card has no place for it. The viewer uses the same value to link a problem to its place.
 */
export function anchorFor(path: string): string | undefined {
  const [, first, second] = path.split("/");
  if (first === "performance") return second === undefined ? "/performance" : /^\d+$/.test(second) ? `/performance/${second}` : undefined;
  if (first === "media") return second === undefined ? "/media" : /^\d+$/.test(second) ? `/media/${second}` : undefined;
  if (first === "extensions") return second === undefined ? "/extensions" : `/extensions/${second}`;
  const row = ROW_POINTERS.find((pointer) => path === pointer || path.startsWith(`${pointer}/`));
  return row && (SHARED_ROWS[row] ?? row);
}

/**
 * A submission as a club sees it, with the source of each value.
 * It shows what the document contains. It does not decide whether the document is valid.
 * When `issues` are given, each problem shows at the value that it is about, and a missing value shows as "Not in the file".
 */
export function SubmissionView({
  document,
  isMinor,
  minorNote,
  issues = [],
}: {
  document: Doc;
  isMinor?: boolean | undefined;
  /** A note under the minor badge, for example when the file and the date of birth do not agree. */
  minorNote?: string | undefined;
  issues?: Issue[];
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
  const media = asArray(document.media).map(asRecord);
  const extensions = asRecord(document.extensions);

  const issuesAt = (anchor: string) => issues.filter((issue) => anchorFor(issue.path) === anchor);
  // The minor note already explains a minor status that does not agree with the date of birth.
  const headerIssues = issuesAt("header").filter((issue) => issue.code !== "minor_mismatch");

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

  const row = (term: string, pointer: string, value: ReactNode, source?: Source | SourceGroup[]) => (
    <Row term={term} anchor={pointer} value={value} source={source} issues={issuesAt(pointer)} />
  );

  return (
    <LayerCard render={<article />} aria-label="Submission preview">
      <LayerCard.Secondary>
        <div data-anchor="header" tabIndex={-1} className="w-full min-w-0 scroll-mt-4 outline-none transition-shadow duration-300 data-highlight:ring-2 data-highlight:ring-kumo-brand">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-lg font-semibold text-kumo-strong">{asText(player.full_name) || "Player name"}</span>
            {isMinor ? (
              <span data-testid="minor-badge" className="shrink-0">
                {/* Purple is not used for sources, problems or warnings, so the minor status never looks like one of them. */}
                <Badge variant="purple" icon={<ShieldWarningIcon weight="fill" />} className="font-semibold print:border print:border-current">
                  Minor
                </Badge>
              </span>
            ) : null}
          </div>
          {meta.length > 0 ? <p className="m-0 mt-0.5 text-sm text-kumo-subtle">{meta.join(" · ")}</p> : null}
          {minorNote ? (
            <p
              data-testid="minor-note"
              className="m-0 mt-2 flex items-start gap-1.5 rounded-md border-l-4 border-kumo-badge-purple bg-kumo-base px-2.5 py-1.5 text-sm font-medium text-kumo-strong"
            >
              <ShieldWarningIcon aria-hidden="true" weight="fill" className="mt-0.5 shrink-0 text-kumo-badge-purple" />
              {minorNote}
            </p>
          ) : null}
          <IssueNotes issues={headerIssues} />
        </div>
      </LayerCard.Secondary>
      <LayerCard.Primary className="@container p-4">
        <dl className="m-0 divide-y divide-kumo-hairline">
          {row("Purposes", "/submission/purposes", listOf(submission.purposes, (p) => label(VALUE_LABELS.purposes, p)))}
          {row("Nationalities", "/player/nationalities", listOf(player.nationalities, (code) => asText(code) && countryName(String(code))), sourceOf(document, "/player/nationalities"))}
          {row("Date of birth", "/player/date_of_birth", formatDate(player.date_of_birth), sourceOf(document, "/player/date_of_birth"))}
          {row("Primary position", "/positions/primary_position", positionText(positions.primary_position), sourceOf(document, "/positions/primary_position"))}
          {row("Secondary positions", "/positions/secondary_positions", listOf(positions.secondary_positions), sourceOf(document, "/positions/secondary_positions"))}
          {row("Contract", "/contract/status", label(VALUE_LABELS.contract_status, contract.status), sourceOf(document, "/contract/status"))}
          {row("Current club", "/player/current_club", clubText(currentClub), sourcesOf(document, "/player/current_club", currentClub, CLUB_PARTS))}
          {row("Contract expires", "/contract/expiry_date", formatDate(contract.expiry_date), sourceOf(document, "/contract/expiry_date"))}
          {row("Parent club", "/contract/parent_club", clubText(parentClub), sourcesOf(document, "/contract/parent_club", parentClub, CLUB_PARTS))}
          {row(
            "Representation",
            "/representation",
            representation
              ? [
                  asText(representation.agent_name),
                  label(VALUE_LABELS.mandate_status, representation.mandate_status),
                  asText(representation.fifa_agent_licence) && `licence ${representation.fifa_agent_licence}`,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : undefined,
            representation && sourcesOf(document, "/representation", representation, REPRESENTATION_PARTS),
          )}
          {row("FIFA Connect ID", "/player/external_ids", asText(asRecord(player.external_ids).fifa_connect_id), sourceOf(document, "/player/external_ids/fifa_connect_id"))}
        </dl>

        {performance.length > 0 || issuesAt("/performance").length > 0 ? (
          <section aria-label="Performance" data-anchor="/performance" tabIndex={-1} className="mt-4 scroll-mt-4 outline-none transition-shadow duration-300 data-highlight:ring-2 data-highlight:ring-kumo-brand">
            <h3 className="mb-2 text-sm font-semibold text-kumo-strong">Performance</h3>
            <IssueNotes issues={issuesAt("/performance")} />
            <ul className="m-0 list-none space-y-2 p-0">
              {performance.map((season, index) => {
                const anchor = `/performance/${index}`;
                const seasonIssues = issuesAt(anchor);
                const groups = sourcesOf(document, anchor, season, SEASON_PARTS);
                return (
                  <li
                    key={`${asText(season.season)}-${index}`}
                    data-anchor={anchor}
                    tabIndex={-1}
                    className={`scroll-mt-4 break-inside-avoid rounded-md border px-3 py-2.5 outline-none transition-shadow duration-300 data-highlight:ring-2 data-highlight:ring-kumo-brand ${problemTone(seasonIssues, "border-kumo-hairline bg-kumo-tint")}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0 font-medium text-kumo-strong">
                        {asText(season.season)}
                        {asText(season.competition) ? <span className="font-normal text-kumo-subtle"> · {asText(season.competition)}</span> : null}
                      </span>
                      {groups[0] && groups[0].parts.length === 0 ? <Mark source={groups[0].source} /> : null}
                    </div>
                    <dl className="m-0 mt-2 grid grid-cols-5 gap-2 text-center">
                      <Stat term="Apps" value={season.appearances} />
                      <Stat term="Mins" value={season.minutes} />
                      <Stat term="Goals" value={season.goals} />
                      <Stat term="Assists" value={season.assists} />
                      <Stat term="Clean sheets" short="CS" value={season.clean_sheets} />
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
                    <IssueNotes issues={seasonIssues} />
                  </li>
                );
              })}
            </ul>
            {performance.length > 0 ? <p className="mt-1.5 mb-0 text-xs text-kumo-subtle">A dash means that the value is not stated. It does not mean zero.</p> : null}
          </section>
        ) : null}

        {media.length > 0 || issuesAt("/media").length > 0 ? (
          <section aria-label="Video" data-anchor="/media" tabIndex={-1} className="mt-4 scroll-mt-4 outline-none transition-shadow duration-300 data-highlight:ring-2 data-highlight:ring-kumo-brand">
            <h3 className="mb-2 text-sm font-semibold text-kumo-strong">Video</h3>
            <IssueNotes issues={issuesAt("/media")} />
            <ul className="m-0 list-none space-y-2 p-0">
              {media.map((item, index) => {
                const anchor = `/media/${index}`;
                const itemIssues = issuesAt(anchor);
                const url = asText(item.url);
                const href = url && isHttpsLink(url) ? url : undefined;
                return (
                  <li
                    key={`${url}-${index}`}
                    data-anchor={anchor}
                    tabIndex={-1}
                    className={`scroll-mt-4 break-inside-avoid rounded-md border px-3 py-2.5 outline-none transition-shadow duration-300 data-highlight:ring-2 data-highlight:ring-kumo-brand ${problemTone(itemIssues, "border-kumo-hairline bg-kumo-tint")}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0 font-medium text-kumo-strong">{label(VALUE_LABELS.video_type, item.video_type) ?? "Video"}</span>
                      <Mark source={sourceOf(document, anchor)} />
                    </div>
                    <p className="m-0 mt-1 min-w-0 text-sm break-all">
                      {href ? (
                        // The viewer never loads the video. The link opens only when the reader selects it (§9.3).
                        <a href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="text-kumo-link underline decoration-1 underline-offset-2">
                          {href}
                          <ArrowSquareOutIcon aria-hidden="true" className="ml-1 inline align-[-2px]" />
                        </a>
                      ) : (
                        (url ?? NOT_IN_FILE)
                      )}
                    </p>
                    <IssueNotes issues={itemIssues} />
                  </li>
                );
              })}
            </ul>
            {media.length > 0 ? (
              <p className="mt-1.5 mb-0 text-xs text-kumo-subtle">Each link opens on another site. The other site can see that you opened it.</p>
            ) : null}
          </section>
        ) : null}

        <SubmissionDetails submission={submission} consent={consent} issuesAt={issuesAt} />
        <Extensions extensions={extensions} issuesAt={issuesAt} />
      </LayerCard.Primary>
    </LayerCard>
  );
}

/** Only an https link becomes a link. A file from another producer can contain any text, for example a javascript: URL. */
function isHttpsLink(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** Background and border for a season with problems: red for an error, amber for a warning only. */
function problemTone(issues: Issue[], normal: string): string {
  if (issues.some((issue) => issue.severity === "error")) return "border-kumo-danger bg-kumo-danger-tint";
  if (issues.length > 0) return "border-kumo-warning bg-kumo-warning-tint";
  return normal;
}

/**
 * Background and a bar on the left for a row with problems. A row in a divided list has no border of its own,
 * so a border colour colours only the divider below it, and that looks like a mistake.
 */
function rowTone(issues: Issue[]): string {
  if (issues.some((issue) => issue.severity === "error")) return "-mx-2 rounded-md px-2 bg-kumo-danger-tint shadow-[inset_3px_0_0_var(--color-kumo-danger)]";
  if (issues.length > 0) return "-mx-2 rounded-md px-2 bg-kumo-warning-tint shadow-[inset_3px_0_0_var(--color-kumo-warning)]";
  return "";
}

/** The problems at one place in the card, in the words of the library. */
function IssueNotes({ issues }: { issues: Issue[] }) {
  if (issues.length === 0) return null;
  return (
    <ul className="m-0 mt-1.5 list-none space-y-1 p-0 text-sm" data-testid="issue-notes">
      {issues.map((issue) => (
        <li key={`${issue.code}${issue.path}`} className={`flex items-start gap-1.5 ${issue.severity === "error" ? "text-kumo-danger" : "text-kumo-warning"}`}>
          {issue.severity === "error" ? (
            <WarningCircleIcon aria-hidden="true" weight="fill" className="mt-1 shrink-0" />
          ) : (
            <WarningIcon aria-hidden="true" weight="fill" className="mt-1 shrink-0" />
          )}
          {issue.message}
        </li>
      ))}
    </ul>
  );
}

const NOT_IN_FILE = <span className="font-medium text-kumo-danger">Not in the file</span>;

/** Facts about the file, not claims about the player. They have no source marks. */
function SubmissionDetails({ submission, consent, issuesAt }: { submission: Doc; consent: Doc; issuesAt: (anchor: string) => Issue[] }) {
  const lawfulBasis = label(VALUE_LABELS.lawful_basis, consent.lawful_basis);
  const consentDate = formatDate(consent.consent_date);
  const rows: [term: string, anchor: string, value: string | undefined][] = [
    ["Sent by", "/submission/sender", label(VALUE_LABELS.sender, submission.sender)],
    ["Lawful basis", "/consent/lawful_basis", lawfulBasis && (consentDate ? `${lawfulBasis}, given on ${consentDate}` : lawfulBasis)],
    ["Created", "/submission/submitted_at", formatTimestamp(submission.submitted_at)],
    ["Submission ID", "/submission/submission_id", asText(submission.submission_id)],
  ];
  const shown = rows.filter(([, anchor, value]) => value || issuesAt(anchor).length > 0);
  if (shown.length === 0) return null;
  return (
    <section aria-label="About this file" className="mt-4 border-t border-kumo-hairline pt-3">
      <h3 className="mb-1 text-sm font-semibold text-kumo-strong">About this file</h3>
      <dl className="m-0 divide-y divide-kumo-hairline text-sm">
        {shown.map(([term, anchor, value]) => {
          const rowIssues = issuesAt(anchor);
          return (
            <div
              key={term}
              data-anchor={anchor}
              tabIndex={-1}
              className={`grid scroll-mt-4 grid-cols-[minmax(5.5rem,7.5rem)_minmax(0,1fr)] gap-x-3 py-1.5 outline-none transition-shadow duration-300 data-highlight:ring-2 data-highlight:ring-kumo-brand ${rowTone(rowIssues)}`}
            >
              <dt className="text-kumo-subtle">{term}</dt>
              <dd className="m-0 min-w-0 text-kumo-default">
                <span className={term === "Submission ID" ? "font-mono text-xs leading-5 break-all" : ""}>{value ?? NOT_IN_FILE}</span>
                <IssueNotes issues={rowIssues} />
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

/**
 * Extensions are not part of FPDS, and a consumer does not recognise them (§12).
 * They appear closed, grouped by prefix, as plain data with no source marks and no FPDS styling.
 * A warning about an extension shows next to that extension, and the closed section says how many warnings it has.
 */
function Extensions({ extensions, issuesAt }: { extensions: Doc; issuesAt: (anchor: string) => Issue[] }) {
  const keys = Object.keys(extensions);
  const sectionIssues = issuesAt("/extensions");
  if (keys.length === 0 && sectionIssues.length === 0) return null;
  const groups = new Map<string, { key: string; name: string; value: unknown }[]>();
  for (const key of keys) {
    const slash = key.indexOf("/");
    const prefix = slash > 0 ? key.slice(0, slash) : key;
    const name = slash > 0 ? key.slice(slash + 1) : "";
    groups.set(prefix, [...(groups.get(prefix) ?? []), { key, name, value: extensions[key] }]);
  }
  const problems = [...sectionIssues, ...keys.flatMap((key) => issuesAt(`/extensions/${escapeToken(key)}`))];
  const warnings = problems.filter((issue) => issue.severity === "warning").length;
  const errors = problems.length - warnings;
  const counts = [errors > 0 && `${errors} ${errors === 1 ? "problem" : "problems"}`, warnings > 0 && `${warnings} ${warnings === 1 ? "warning" : "warnings"}`].filter(Boolean);
  return (
    <details data-testid="extensions" data-anchor="/extensions" className="group mt-4 scroll-mt-4 border-t border-kumo-hairline pt-3 text-sm">
      <summary className="cursor-pointer font-semibold text-kumo-strong">
        Extra information from other software{" "}
        <span className="whitespace-nowrap">
          <span className="font-normal text-kumo-subtle">({keys.length})</span>
          {counts.length > 0 ? (
            <span className={`ml-2 font-medium ${errors > 0 ? "text-kumo-danger" : "text-kumo-warning"}`}>{counts.join(", ")}</span>
          ) : null}
        </span>
      </summary>
      <p className="mt-2 mb-3 text-kumo-subtle">
        FPDS does not define these fields. Other software added them. They show here as the file contains them.
      </p>
      <IssueNotes issues={sectionIssues} />
      {[...groups].map(([prefix, fields]) => (
        <section key={prefix} aria-label={prefix} className="mb-3 last:mb-0">
          <h4 className="m-0 mb-1 font-mono text-xs text-kumo-subtle">{prefix}</h4>
          <dl className="m-0 space-y-1">
            {fields.map(({ key, name, value }) => {
              const anchor = `/extensions/${escapeToken(key)}`;
              const fieldIssues = issuesAt(anchor);
              return (
                <div
                  key={key}
                  data-anchor={anchor}
                  tabIndex={-1}
                  className={`grid scroll-mt-4 grid-cols-[minmax(5.5rem,7.5rem)_minmax(0,1fr)] gap-x-3 outline-none transition-shadow duration-300 data-highlight:ring-2 data-highlight:ring-kumo-brand ${fieldIssues.length > 0 ? `py-1 ${rowTone(fieldIssues)}` : ""}`}
                >
                  <dt className="font-mono text-xs leading-6 break-all text-kumo-subtle">{name || "(no field name)"}</dt>
                  <dd className="m-0 min-w-0">
                    {asText(value) ?? (
                      <pre className="m-0 overflow-x-auto font-mono text-xs leading-5 whitespace-pre-wrap break-all">{JSON.stringify(value, null, 2)}</pre>
                    )}
                    <IssueNotes issues={fieldIssues} />
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}
    </details>
  );
}

function Row({
  term,
  anchor,
  value,
  source,
  issues,
}: {
  term: string;
  anchor: string;
  value: ReactNode;
  source?: Source | SourceGroup[] | undefined;
  issues: Issue[];
}) {
  const missing = value === undefined || value === "" || value === null;
  if (missing && issues.length === 0) return null;
  const groups = missing || source === undefined ? [] : Array.isArray(source) ? source : [{ source, parts: [] }];
  // In a wide card, three columns: term, value, source. The source badges line up in one column.
  // In a narrow card, the term and the source share the first line, and the value has the full width below them.
  // The badge shows the source. The value itself has one style, so that every value is equally easy to read.
  return (
    <div
      data-anchor={anchor}
      tabIndex={-1}
      className={`grid scroll-mt-4 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 py-2 outline-none transition-shadow duration-300 data-highlight:ring-2 data-highlight:ring-kumo-brand @md:grid-cols-[minmax(5.5rem,7.5rem)_minmax(0,1fr)_auto] @md:items-baseline ${
        rowTone(issues)
      }`}
    >
      <dt className="col-start-1 row-start-1 text-sm text-kumo-subtle">{term}</dt>
      <dd className="col-span-2 col-start-1 row-start-2 m-0 min-w-0 break-words text-kumo-strong @md:col-span-1 @md:col-start-2 @md:row-start-1">
        {missing ? NOT_IN_FILE : value}
        <IssueNotes issues={issues} />
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
    // In print, a border keeps the difference between the two kinds of source visible without colour.
    <Badge
      variant={source.checked ? "info" : "warning"}
      className={`whitespace-nowrap print:border ${source.checked ? "print:border-solid" : "print:border-dashed"} print:border-current`}
    >
      {source.label}
    </Badge>
  );
}
