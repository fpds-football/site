import { type FpdsDocument, getFieldStates, type Issue, prepareDocument } from "@fpds-football/fpds";
import { clean, type Draft, getAt, parsePointer, setAt } from "./draft";

export interface ExportResult {
  valid: boolean;
  document?: FpdsDocument;
  /** Errors that prevent export. */
  errors: Issue[];
  warnings: Issue[];
  /** Values in the draft that do not apply now. The export does not include them (DECISIONS.md D-34). */
  omitted: { pointer: string; reason: string }[];
  /** The content that the export includes, also when it is not valid yet. For the preview. */
  preview: Draft;
}

/** The current time as the builder uses it, so that the minor status in the form agrees with the export. */
export function nowTimestamp(now = new Date()): string {
  return `${now.toISOString().slice(0, 19)}Z`;
}

/** The draft with a submission time, so that field states can calculate the minor status. */
export function withTime(draft: Draft, now = new Date()): Draft {
  const submission = (draft.submission ?? {}) as Record<string, unknown>;
  return { ...draft, submission: { ...submission, submitted_at: nowTimestamp(now) } };
}

/**
 * Makes the document for export: clean the draft, run the producer steps from §13, and remove provenance for values
 * that are not in the document. `prepareDocument` makes a new submission ID each time (§4.3).
 */
export function buildExport(draft: Draft, now = new Date(), createId?: () => string): ExportResult {
  const cleaned = (clean(draft) ?? {}) as Draft;
  const { fields } = getFieldStates(withTime(cleaned, now));

  const omitted = Object.entries(fields)
    .filter(([pointer, field]) => field.state === "not_applicable" && getAt(cleaned, pointer) !== undefined)
    .map(([pointer, field]) => ({ pointer, reason: field.reason ?? "This field does not apply." }));

  // Remove values that do not apply, then remove provenance for values that are not in the result.
  // Provenance for a missing value breaks rule 3 in §13.1, and the user cannot see why.
  let next = cleaned;
  for (const { pointer } of omitted) next = setAt(next, pointer, undefined);
  const provenance = next.provenance as Record<string, unknown> | undefined;
  if (provenance) {
    const kept = Object.fromEntries(
      Object.entries(provenance).filter(([pointer]) => parsePointer(pointer).length > 0 && getAt(next, pointer) !== undefined),
    );
    next = setAt(next, "/provenance", Object.keys(kept).length > 0 ? kept : undefined);
  }

  const result = prepareDocument(next, createId ? { now, createId } : { now });
  return {
    valid: result.valid,
    ...(result.document ? { document: result.document } : {}),
    errors: result.issues.filter((issue) => issue.severity === "error"),
    warnings: result.issues.filter((issue) => issue.severity === "warning"),
    omitted,
    preview: next,
  };
}

export function exportFileName(document: FpdsDocument): string {
  const name = document.player.full_name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${name || "player"}-${document.submission.submitted_at.slice(0, 10)}.fpds.json`;
}
