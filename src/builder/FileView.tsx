import type { FpdsDocument } from "@fpds-football/fpds";
import type { Draft } from "./draft";

/**
 * Shown in place of the submission ID and the time. The export makes a new ID and sets the time at the moment of export (§4.3),
 * so real values here would not be the values in the file.
 */
export const ID_PLACEHOLDER = "(a new ID when you export)";
export const TIME_PLACEHOLDER = "(the time when you export)";

/**
 * The file that the export makes, as text. It shows the same document as the export, with one difference:
 * the submission ID and the time are placeholders. It renders in this browser only.
 */
export function FileView({ document, complete }: { document: Draft | FpdsDocument; complete: boolean }) {
  const submission = (document as Draft).submission as Record<string, unknown> | undefined;
  const shown =
    submission?.submission_id === undefined
      ? document
      : { ...document, submission: { ...submission, submission_id: ID_PLACEHOLDER, submitted_at: TIME_PLACEHOLDER } };

  return (
    <div data-testid="file-view">
      <p className="mb-2 text-sm text-kumo-subtle">
        This is the file that the club receives. The builder makes it in this browser.
      </p>
      {complete ? null : (
        <p className="mb-2 text-sm text-kumo-subtle">
          The file is not complete. When it is valid, the export also adds the FPDS version, the submission ID, the time
          and the minor status.
        </p>
      )}
      {/* A long line scrolls inside this box, so the page does not scroll sideways on a phone. */}
      <div
        role="region"
        aria-label="File contents"
        tabIndex={0}
        className="overflow-x-auto rounded-lg border border-kumo-line bg-kumo-base outline-none focus-visible:ring-2 focus-visible:ring-kumo-focus"
      >
        <pre className="m-0 p-3 font-mono text-xs leading-5 text-kumo-default">
          <code>{`${JSON.stringify(shown, null, 2)}\n`}</code>
        </pre>
      </div>
    </div>
  );
}
