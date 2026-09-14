import { Banner, Button, Dialog } from "@cloudflare/kumo";
import {
  FileArrowUpIcon,
  FileTextIcon,
  FolderOpenIcon,
  InfoIcon,
  LockSimpleIcon,
  PencilSimpleIcon,
  PrinterIcon,
  WarningCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { clean, type Draft } from "~/builder/draft";
import { loadSession, saveSession } from "~/builder/storage";
import { SubmissionView } from "~/components/SubmissionView";
import { readViewedFile, type ViewedFile } from "./openFile";

interface Opened {
  fileName: string;
  file: ViewedFile;
}

/**
 * Opens an FPDS file and shows it as a club sees it. The file stays in the memory of this page.
 * Nothing goes to a server or to storage, except to the builder's session storage when the user selects "Edit in builder".
 */
export function Viewer() {
  const [opened, setOpened] = useState<Opened>();
  const [dragging, setDragging] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<Draft>();
  const fileInput = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const navigate = useNavigate();

  const open = useCallback(async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setOpened({ fileName: file.name, file: readViewedFile(text) });
    if (fileInput.current) fileInput.current.value = "";
    requestAnimationFrame(() => resultRef.current?.focus());
  }, []);

  // The full page accepts a dropped file. Without this, the browser opens the file itself and leaves the page.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes("Files") ?? false;
    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth += 1;
      setDragging(true);
    };
    const onOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };
    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      void open(event.dataTransfer?.files[0]);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [open]);

  // A printed page cannot open a closed section, so print shows every section open, then closes them again.
  useEffect(() => {
    const openedForPrint: HTMLDetailsElement[] = [];
    const onBeforePrint = () => {
      for (const details of document.querySelectorAll<HTMLDetailsElement>("details:not([open])")) {
        details.open = true;
        openedForPrint.push(details);
      }
    };
    const onAfterPrint = () => {
      for (const details of openedForPrint.splice(0)) details.open = false;
    };
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, []);

  const openBuilder = (draft: Draft, replace = false) => {
    // The builder can already hold unfinished work in this tab. Do not replace it without the user's action.
    if (!replace && clean(loadSession()) !== undefined) {
      setPendingDraft(draft);
      return;
    }
    saveSession(draft);
    void navigate({ to: "/build/" });
  };

  const chooseFile = () => fileInput.current?.click();
  const file = opened?.file;

  return (
    <div className="wrap pb-10">
      <div className="max-w-[48rem]">
        <div className="mt-8 mb-6 print:hidden">
          <h1 className="text-[clamp(1.5rem,1.1rem+1.5vw,2.1rem)] leading-tight font-semibold tracking-[-0.02em] text-kumo-strong">
            View a submission
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-kumo-subtle">
            <LockSimpleIcon aria-hidden="true" className="shrink-0" />
            This file never leaves your browser.
          </p>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          data-testid="open-file"
          onChange={(event) => open(event.target.files?.[0])}
        />

        <h2 ref={resultRef} tabIndex={-1} className="sr-only">
          {opened ? `Result for ${opened.fileName}` : "Open a file"}
        </h2>

        {file?.kind === "document" ? (
          <DocumentResult
            fileName={opened?.fileName ?? ""}
            file={file}
            onOpenAnother={chooseFile}
            onEdit={() => openBuilder(file.draft)}
          />
        ) : (
          <>
            <div role="status" aria-live="polite" className="mb-4 empty:hidden">
              {file ? <Refusal file={file} fileName={opened?.fileName ?? ""} onOpenBuilder={openBuilder} /> : null}
            </div>
            <DropZone dragging={dragging} onChoose={chooseFile} />
          </>
        )}
      </div>

      <Dialog.Root open={pendingDraft !== undefined} onOpenChange={(isOpen) => !isOpen && setPendingDraft(undefined)}>
        <Dialog size="sm" className="p-6">
          <Dialog.Title className="mb-2 text-lg font-semibold">Replace the work in the builder?</Dialog.Title>
          <Dialog.Description className="mb-5 text-kumo-subtle">
            The builder has unfinished work in this tab. This file replaces it. To keep that work, cancel, then save a draft in
            the builder.
          </Dialog.Description>
          <div className="flex flex-wrap justify-end gap-2">
            <Dialog.Close render={(props) => <Button {...props}>Cancel</Button>} />
            <Button variant="primary" onClick={() => pendingDraft && openBuilder(pendingDraft, true)}>
              Replace and open the builder
            </Button>
          </div>
        </Dialog>
      </Dialog.Root>
    </div>
  );
}

function DropZone({ dragging, onChoose }: { dragging: boolean; onChoose: () => void }) {
  return (
    <>
      <div
        data-testid="drop-zone"
        data-dragging={dragging || undefined}
        className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors duration-150 ${
          dragging ? "border-kumo-brand bg-kumo-tint" : "border-kumo-interact bg-kumo-base"
        }`}
      >
        <FileArrowUpIcon aria-hidden="true" size={40} className={dragging ? "text-kumo-link" : "text-kumo-subtle"} />
        <p className="m-0 text-lg font-semibold text-kumo-strong">
          {dragging ? "Drop the file to open it" : "Open an .fpds.json file"}
        </p>
        <p className="m-0 max-w-[26rem] text-sm text-kumo-subtle pointer-coarse:hidden">Drag the file here, or choose it on your device.</p>
        <Button variant="primary" size="lg" icon={<FolderOpenIcon />} onClick={onChoose}>
          Choose a file
        </Button>
      </div>
      <p className="mt-4 max-w-[40rem] text-sm text-kumo-subtle">
        The viewer checks the structure of the file against FPDS. It shows the source of each value, a badge for a minor, and
        any problems with the file. It does not check that the information is true.
      </p>
    </>
  );
}

function Refusal({
  file,
  fileName,
  onOpenBuilder,
}: {
  file: Exclude<ViewedFile, { kind: "document" }>;
  fileName: string;
  onOpenBuilder: (draft: Draft) => void;
}) {
  const icon = <WarningCircleIcon weight="fill" />;
  switch (file.kind) {
    case "draft":
      return (
        <Banner
          data-testid="refusal"
          icon={<InfoIcon weight="fill" />}
          title="This is a draft from the builder, not a submission."
          description={`${fileName} contains unfinished work. Open it in the builder to continue, then export the submission.`}
          action={<Banner.Action onClick={() => onOpenBuilder(file.draft)}>Open in builder</Banner.Action>}
        />
      );
    case "unsupported":
      return (
        <Banner
          data-testid="refusal"
          variant="error"
          icon={icon}
          title="This viewer cannot show this file."
          description={`${file.message} Ask the sender for a file in a supported version.`}
        />
      );
    case "refused":
      return <Banner data-testid="refusal" variant="error" icon={icon} title={file.title} description={file.message} />;
  }
}

function DocumentResult({
  fileName,
  file,
  onOpenAnother,
  onEdit,
}: {
  fileName: string;
  file: Extract<ViewedFile, { kind: "document" }>;
  onOpenAnother: () => void;
  onEdit: () => void;
}) {
  const { document, result } = file;
  const errors = result.issues.filter((issue) => issue.severity === "error");
  const warnings = result.issues.filter((issue) => issue.severity === "warning");
  const mismatch = result.issues.some((issue) => issue.code === "minor_mismatch");
  const consent = (document.consent ?? {}) as Record<string, unknown>;
  const { isMinor: calculatedMinor, age } = result.calculated;
  // Safeguarding wins: if the file or the date of birth says that the player is a minor, the badge shows.
  const isMinor = calculatedMinor === true || consent.is_minor === true;
  // The problem list has the full message from the library. Next to the name, a short comparison is enough.
  const minorNote = mismatch
    ? `The file says: ${consent.is_minor ? "a minor" : "not a minor"}. The date of birth says: ${calculatedMinor ? "a minor" : "not a minor"}${age === undefined ? "" : `, age ${age} on the date of the submission`}.`
    : undefined;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 flex min-w-0 items-center gap-2 text-sm">
          <FileTextIcon aria-hidden="true" className="shrink-0 text-kumo-subtle" />
          <span data-testid="file-name" className="truncate font-medium text-kumo-strong">
            {fileName}
          </span>
        </p>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button icon={<FolderOpenIcon />} onClick={onOpenAnother}>
            Open another file
          </Button>
          <Button icon={<PencilSimpleIcon />} onClick={onEdit}>
            Edit in builder
          </Button>
          <Button icon={<PrinterIcon />} onClick={() => window.print()}>
            Print or save as PDF
          </Button>
        </div>
      </div>

      <div role="status" aria-live="polite" className="space-y-3">
        {errors.length > 0 ? (
          <Banner
            data-testid="invalid-banner"
            variant="error"
            icon={<WarningCircleIcon weight="fill" />}
            title="Not a valid FPDS submission"
            description={
              <>
                <span className="block">This file has these problems. Some information below can be missing or wrong.</span>
                <ul className="mt-1.5 mb-0 list-disc space-y-1 pl-5">
                  {errors.map((issue) => (
                    <li key={`${issue.code}${issue.path}`}>{issue.message}</li>
                  ))}
                </ul>
              </>
            }
          />
        ) : null}
        {warnings.length > 0 ? (
          <Banner
            data-testid="warnings"
            variant="alert"
            icon={<WarningIcon weight="fill" />}
            title="Check these warnings"
            description={
              <>
                <span className="block">A warning does not make the file invalid.</span>
                <ul className="mt-1.5 mb-0 list-disc space-y-1 pl-5">
                  {warnings.map((issue) => (
                    <li key={`${issue.code}${issue.path}`}>{issue.message}</li>
                  ))}
                </ul>
              </>
            }
          />
        ) : null}
      </div>

      <div className="my-3 flex items-start gap-2 text-sm text-kumo-subtle">
        <InfoIcon aria-hidden="true" className="mt-1 shrink-0" />
        <p className="m-0">
          {errors.length === 0 ? <span className="text-kumo-default">The viewer found no problems in the structure of this file. </span> : null}
          <span data-testid="structure-note">FPDS checks the structure of this file. It does not check that the information is true.</span>
        </p>
      </div>

      <SubmissionView document={document} isMinor={isMinor} minorNote={minorNote} />
    </>
  );
}
