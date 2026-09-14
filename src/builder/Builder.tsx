import { labelFor } from "@fpds-football/fpds";
import { useEffect, useRef, useState } from "react";
import { SubmissionView } from "~/components/SubmissionView";
import { buildExport, exportFileName } from "./export";
import { SectionForm } from "./SectionForms";
import { SECTIONS, type SectionId, sectionFor } from "./sections";
import { downloadFile, draftFileContents, draftFileName, readOpenedFile } from "./storage";
import { type SectionStatus, useBuilder } from "./useBuilder";

const STATUS_TEXT: Record<SectionStatus, string> = {
  complete: "Complete",
  incomplete: "Required information missing",
  optional: "Optional",
};

const STATUS_ICON: Record<SectionStatus, string> = { complete: "✓", incomplete: "●", optional: "○" };

export function Builder() {
  const builder = useBuilder();
  const [section, setSection] = useState<SectionId>("submission");
  const [message, setMessage] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { exportResult } = builder;

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(undefined), 6000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const goTo = (id: SectionId) => {
    setSection(id);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const onExport = () => {
    // Prepare again at the moment of export, so the document has a new submission ID and the current time (§4.3).
    const result = buildExport(builder.draft);
    if (!result.valid || !result.document) {
      builder.setShowAllErrors(true);
      const first = builder.blockers.map((issue) => sectionFor(issue.path)).find(Boolean);
      if (first) goTo(first);
      return;
    }
    downloadFile(`${JSON.stringify(result.document, null, 2)}\n`, exportFileName(result.document));
    setMessage(`Exported ${exportFileName(result.document)}. Send the file by email or message.`);
  };

  const onSaveDraft = () => {
    downloadFile(draftFileContents(builder.draft), draftFileName(builder.draft));
    setMessage("Saved a draft file. A draft is not an FPDS submission. Open it here to continue.");
  };

  const onOpen = async (file: File | undefined) => {
    if (!file) return;
    const opened = readOpenedFile(await file.text());
    if (opened.kind === "error") {
      setMessage(opened.message);
    } else {
      builder.reset(opened.draft);
      setMessage(
        opened.kind === "draft"
          ? `Opened the draft ${file.name}.`
          : `Opened ${file.name}. When you export, the submission gets a new ID, because it is a new version.`,
      );
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const onClear = () => {
    if (window.confirm("Clear all the information in the builder? This cannot be undone.")) {
      builder.reset();
      goTo("submission");
      setMessage("The builder is empty.");
    }
  };

  const current = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];
  const sectionConflicts = builder.conflicts.filter((issue) => sectionFor(issue.path) === section);

  return (
    <div className="mx-auto max-w-[84rem] px-6 pb-10">
      <div className="mt-8 mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.5rem,1.1rem+1.5vw,2.1rem)] leading-tight font-bold tracking-[-0.02em]">
            Create a submission
          </h1>
          <p className="mt-1 text-[0.95rem] text-ink-soft">
            Your information stays in this browser. The builder sends nothing to a server.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[0.9rem]">
          <button type="button" className="border border-rule bg-field px-3 py-1.5" onClick={() => fileInput.current?.click()}>
            Open a file
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            className="hidden"
            data-testid="open-file"
            onChange={(event) => onOpen(event.target.files?.[0])}
          />
          <button type="button" className="border border-rule bg-field px-3 py-1.5" onClick={onSaveDraft}>
            Save draft
          </button>
          <button type="button" className="border border-rule bg-field px-3 py-1.5 text-[#8c1d18]" onClick={onClear}>
            Clear everything
          </button>
        </div>
      </div>

      <div role="status" aria-live="polite" className="empty:hidden mb-4 border-l-2 border-verified bg-field px-3 py-2 text-[0.92rem]">
        {message}
      </div>

      {builder.isMinor ? (
        <p className="mb-4 border border-[#8a4b00] bg-[#fff4e5] px-4 py-3 text-[0.95rem] text-[#6b3a00]" data-testid="minor-notice">
          <strong>This player is a minor.</strong> Safeguarding rules apply. An intermediary must send the submission,
          and the player cannot send it. FIFA rules on the protection of minors and national safeguarding rules apply.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[12rem_minmax(0,1fr)_minmax(0,26rem)]">
        <nav aria-label="Sections" className="lg:sticky lg:top-4 lg:self-start">
          <ol className="flex gap-1 overflow-x-auto border-b border-rule pb-2 lg:flex-col lg:overflow-visible lg:border-b-0 lg:pb-0">
            {SECTIONS.map((item) => {
              const status = builder.sectionStatus[item.id];
              const active = item.id === section;
              return (
                <li key={item.id} className="shrink-0">
                  <button
                    type="button"
                    aria-current={active ? "step" : undefined}
                    aria-label={`${item.title}, ${STATUS_TEXT[status]}`}
                    onClick={() => goTo(item.id)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[0.95rem] ${
                      active ? "bg-field font-semibold shadow-[inset_3px_0_0_var(--color-verified)]" : "hover:bg-field"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={status === "incomplete" ? "text-[#b3261e]" : status === "complete" ? "text-verified" : "text-ink-soft"}
                    >
                      {STATUS_ICON[status]}
                    </span>
                    <span>{item.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <section aria-labelledby="section-heading" className="min-w-0">
          <h2 id="section-heading" ref={headingRef} tabIndex={-1} className="mb-4 text-[1.25rem] font-semibold outline-none">
            {current?.title}
          </h2>
          {sectionConflicts.length > 0 ? (
            <p className="mb-4 text-[0.9rem] text-[#8c1d18]">This section has a conflict. See the message under the field.</p>
          ) : null}
          <SectionForm section={section} builder={builder} />
          <div className="mt-8 flex justify-between border-t border-rule pt-4 text-[0.92rem]">
            {SECTIONS.findIndex((s) => s.id === section) > 0 ? (
              <button type="button" className="text-verified underline" onClick={() => goTo(SECTIONS[SECTIONS.findIndex((s) => s.id === section) - 1]!.id)}>
                Previous section
              </button>
            ) : (
              <span />
            )}
            {SECTIONS.findIndex((s) => s.id === section) < SECTIONS.length - 1 ? (
              <button type="button" className="text-verified underline" onClick={() => goTo(SECTIONS[SECTIONS.findIndex((s) => s.id === section) + 1]!.id)}>
                Next section
              </button>
            ) : null}
          </div>
        </section>

        <aside aria-label="Preview and export" className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <div className="mb-3 border border-rule bg-paper p-4">
            <button
              type="button"
              onClick={onExport}
              aria-describedby="export-status"
              className={`w-full px-4 py-2.5 font-semibold ${
                exportResult.valid ? "bg-verified text-white" : "cursor-not-allowed bg-rule text-ink-soft"
              }`}
            >
              Export submission
            </button>
            {exportResult.valid ? (
              <p id="export-status" className="mt-2 text-[0.85rem] text-ink-soft">
                The file is valid against FPDS 0.1.
              </p>
            ) : (
              <div id="export-status" className="mt-3 text-[0.88rem]">
                <p className="mb-1 font-semibold">To export, complete these items:</p>
                <ul className="max-h-48 overflow-y-auto" data-testid="export-checklist">
                  {builder.blockers.map((issue) => {
                    const target = sectionFor(issue.path);
                    return (
                      <li key={`${issue.code}${issue.path}`} className="mb-1">
                        <button type="button" className="text-left text-verified underline" onClick={() => target && goTo(target)}>
                          {issue.message}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {exportResult.omitted.length > 0 ? (
              <div className="mt-3 text-[0.85rem] text-ink-soft" data-testid="omitted">
                <p className="font-semibold">The export does not include these values, because they do not apply:</p>
                <ul className="list-disc pl-5">
                  {exportResult.omitted.map((item) => (
                    <li key={item.pointer}>
                      {labelFor(item.pointer)}. {item.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {exportResult.warnings.map((issue) => (
              <p key={`${issue.code}${issue.path}`} className="mt-2 border-l-2 border-stated pl-2 text-[0.85rem] text-stated">
                {issue.message}
              </p>
            ))}
          </div>
          <p className="mb-2 text-[0.85rem] text-ink-soft">How a club sees this submission:</p>
          <SubmissionView document={exportResult.document ?? exportResult.preview} isMinor={builder.isMinor} />
          <p className="mt-2 text-[0.8rem] text-ink-soft">
            FPDS checks the structure of a submission. It does not check that the information is true.
          </p>
        </aside>
      </div>
    </div>
  );
}
