import { Badge, Banner, Button, Dialog, LayerCard, Tabs } from "@cloudflare/kumo";
import { labelFor } from "@fpds-football/fpds";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  CircleIcon,
  DownloadSimpleIcon,
  FloppyDiskIcon,
  FolderOpenIcon,
  InfoIcon,
  LockSimpleIcon,
  TrashIcon,
  WarningCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { SubmissionView } from "~/components/SubmissionView";
import { buildExport, exportFileName } from "./export";
import { FileView } from "./FileView";
import { SectionForm } from "./SectionForms";
import { SECTIONS, type SectionId, sectionFor } from "./sections";
import { downloadFile, draftFileContents, draftFileName, readOpenedFile } from "./storage";
import { type SectionStatus, useBuilder } from "./useBuilder";

const STATUS_TEXT: Record<SectionStatus, string> = {
  complete: "Complete",
  incomplete: "Required information missing",
  optional: "Optional",
};

function StatusIcon({ status }: { status: SectionStatus }) {
  if (status === "complete") return <CheckCircleIcon aria-hidden="true" weight="fill" className="text-kumo-success" />;
  if (status === "incomplete") return <WarningCircleIcon aria-hidden="true" weight="fill" className="text-kumo-danger" />;
  return <CircleIcon aria-hidden="true" className="text-kumo-subtle" />;
}

export function Builder() {
  const builder = useBuilder();
  const [section, setSection] = useState<SectionId>("submission");
  const [message, setMessage] = useState<string>();
  const [confirmClear, setConfirmClear] = useState(false);
  const [preview, setPreview] = useState<"club" | "file">("club");
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
    setMessage("Saved a draft file. A draft is not a finished player profile. Open it here to continue.");
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
          : `Opened ${file.name}. When you export, the profile gets a new file ID, because it is a new version.`,
      );
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const onClear = () => {
    builder.reset();
    setConfirmClear(false);
    goTo("submission");
    setMessage("The builder is empty.");
  };

  const index = SECTIONS.findIndex((s) => s.id === section);
  const current = SECTIONS[index] ?? SECTIONS[0];
  const previous = SECTIONS[index - 1];
  const next = SECTIONS[index + 1];

  return (
    <div className="mx-auto max-w-[84rem] px-6 pb-10">
      <div className="mt-8 mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.5rem,1.1rem+1.5vw,2.1rem)] leading-tight font-semibold tracking-[-0.02em] text-kumo-strong">
            Create a player profile
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-kumo-subtle">
            <LockSimpleIcon aria-hidden="true" />
            Your information stays in this browser. The builder sends nothing to a server.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={<FolderOpenIcon />} onClick={() => fileInput.current?.click()}>
            Open a file
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            className="hidden"
            data-testid="open-file"
            onChange={(event) => onOpen(event.target.files?.[0])}
          />
          <Button icon={<FloppyDiskIcon />} onClick={onSaveDraft}>
            Save draft
          </Button>
          <Button variant="secondary-destructive" icon={<TrashIcon />} onClick={() => setConfirmClear(true)}>
            Clear everything
          </Button>
        </div>
      </div>

      <Dialog.Root open={confirmClear} onOpenChange={setConfirmClear}>
        <Dialog size="sm" className="p-6">
          <Dialog.Title className="mb-2 text-lg font-semibold">Clear everything?</Dialog.Title>
          <Dialog.Description className="mb-5 text-kumo-subtle">
            The builder removes all the information that you entered. You cannot undo this.
          </Dialog.Description>
          <div className="flex justify-end gap-2">
            <Dialog.Close render={(props) => <Button {...props}>Cancel</Button>} />
            <Button variant="destructive" onClick={onClear}>
              Clear everything
            </Button>
          </div>
        </Dialog>
      </Dialog.Root>

      <div role="status" aria-live="polite" className="mb-4 empty:hidden">
        {message ? <Banner icon={<InfoIcon weight="fill" />} description={message} /> : null}
      </div>

      {builder.isMinor ? (
        <div className="mb-4" data-testid="minor-notice">
          <Banner
            variant="alert"
            icon={<WarningIcon weight="fill" />}
            title="This player is a minor."
            description="Safeguarding rules apply. An intermediary must send the profile, and the player cannot send it. FIFA rules on the protection of minors and national safeguarding rules apply."
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[12rem_minmax(0,1fr)_minmax(0,26rem)]">
        <nav aria-label="Sections" className="lg:sticky lg:top-4 lg:self-start">
          <ol className="flex list-none gap-1 overflow-x-auto border-b border-kumo-line pb-2 pl-0 lg:flex-col lg:overflow-visible lg:border-b-0 lg:pb-0">
            {SECTIONS.map((item) => {
              const status = builder.sectionStatus[item.id];
              const active = item.id === section;
              return (
                <li key={item.id} className="shrink-0">
                  <Button
                    variant={active ? "secondary" : "ghost"}
                    aria-current={active ? "step" : undefined}
                    aria-label={`${item.title}, ${STATUS_TEXT[status]}`}
                    onClick={() => goTo(item.id)}
                    className={`w-full justify-start gap-2 ${active ? "font-semibold" : ""}`}
                  >
                    <StatusIcon status={status} />
                    <span>{item.title}</span>
                  </Button>
                </li>
              );
            })}
          </ol>
        </nav>

        <section aria-labelledby="section-heading" className="min-w-0">
          <h2
            id="section-heading"
            ref={headingRef}
            tabIndex={-1}
            className="mb-4 text-xl font-semibold text-kumo-strong outline-none"
          >
            {current?.title}
          </h2>
          <SectionForm section={section} builder={builder} />
          <div className="mt-8 flex justify-between border-t border-kumo-line pt-4">
            {previous ? (
              <Button variant="ghost" icon={<ArrowLeftIcon />} onClick={() => goTo(previous.id)}>
                Previous section
              </Button>
            ) : (
              <span />
            )}
            {next ? (
              <Button variant="ghost" onClick={() => goTo(next.id)}>
                Next section
                <ArrowRightIcon aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </section>

        <aside
          aria-label="Preview and export"
          // The panel is taller than many screens. It scrolls inside itself, so the end of the preview is always reachable.
          // A scrolling panel clips what is outside its box, and Kumo draws card borders as a ring outside the card.
          // A small padding keeps the rings visible, and the same negative margin keeps the cards aligned with the grid.
          className="min-w-0 lg:sticky lg:top-3 lg:-mx-1 lg:-mt-1 lg:max-h-[calc(100dvh-1.5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:px-1 lg:pt-1 lg:pb-2"
        >
          <LayerCard className="mb-3">
            <LayerCard.Primary className="p-4">
              <Button
                variant={exportResult.valid ? "primary" : "secondary"}
                size="lg"
                icon={<DownloadSimpleIcon />}
                onClick={onExport}
                aria-describedby="export-status"
                className="w-full justify-center"
              >
                Export profile
              </Button>
              {exportResult.valid ? (
                <p id="export-status" className="mt-2 flex items-center gap-1.5 text-sm text-kumo-success">
                  <CheckCircleIcon aria-hidden="true" weight="fill" />
                  The file is valid against FPDS 0.1.
                </p>
              ) : (
                <div id="export-status" className="mt-3 text-sm">
                  <p className="mb-1 font-semibold">To export, complete these items:</p>
                  <ul className="max-h-48 list-none space-y-1 overflow-y-auto pl-0" data-testid="export-checklist">
                    {builder.blockers.map((issue) => {
                      const target = sectionFor(issue.path);
                      return (
                        <li key={`${issue.code}${issue.path}`}>
                          <button
                            type="button"
                            className="text-left text-kumo-link underline decoration-1 underline-offset-2"
                            onClick={() => target && goTo(target)}
                          >
                            {issue.message}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {exportResult.omitted.length > 0 ? (
                <div className="mt-3 text-sm text-kumo-subtle" data-testid="omitted">
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
                <div key={`${issue.code}${issue.path}`} className="mt-2">
                  <Banner variant="alert" size="sm" description={issue.message} />
                </div>
              ))}
            </LayerCard.Primary>
          </LayerCard>
          <Tabs
            className="mb-3"
            size="sm"
            tabs={[
              { value: "club", label: "How a club sees it" },
              { value: "file", label: "The file" },
            ]}
            value={preview}
            onValueChange={(value) => setPreview(value === "file" ? "file" : "club")}
          />
          {preview === "club" ? (
            <>
              <p className="mb-2 flex items-center gap-2 text-sm text-kumo-subtle">
                How a club sees this profile <Badge variant="neutral">Preview</Badge>
              </p>
              <SubmissionView document={exportResult.document ?? exportResult.preview} isMinor={builder.isMinor} />
            </>
          ) : (
            <FileView document={exportResult.document ?? exportResult.preview} complete={exportResult.valid} />
          )}
          <p className="mt-2 text-xs text-kumo-subtle">
            FPDS checks the structure of a player profile. It does not check that the information is true.
          </p>
        </aside>
      </div>
    </div>
  );
}
