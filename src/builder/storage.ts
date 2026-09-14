import { DRAFT_MARKER, isDraft } from "@fpds-football/fpds";
import type { Draft } from "./draft";

/** Session storage only. The browser deletes it when the tab closes (DECISIONS.md D-36). */
const SESSION_KEY = "fpds-builder-draft";

export function loadSession(): Draft | undefined {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Draft) : undefined;
  } catch {
    return undefined;
  }
}

export function saveSession(draft: Draft): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(draft));
  } catch {
    // Storage can be full or blocked. The builder still works without it.
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** A draft file is not an FPDS document. The viewer refuses it (DECISIONS.md D-36). */
export function draftFileContents(draft: Draft, now = new Date()): string {
  return `${JSON.stringify({ [DRAFT_MARKER]: { format: 1, saved_at: now.toISOString() }, draft }, null, 2)}\n`;
}

export function draftFileName(draft: Draft, now = new Date()): string {
  const player = (draft.player ?? {}) as Record<string, unknown>;
  const name = String(player.full_name ?? "player")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${name || "player"}-${now.toISOString().slice(0, 10)}.fpds-draft.json`;
}

export type OpenedFile =
  | { kind: "draft"; draft: Draft }
  | { kind: "document"; draft: Draft }
  | { kind: "error"; message: string };

/** Opens a draft file or an FPDS document. Opening a document starts a new version, so the export gets a new ID (§4.3). */
export function readOpenedFile(text: string): OpenedFile {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { kind: "error", message: "This file is not JSON. Open a file that ends with .fpds.json or .fpds-draft.json." };
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { kind: "error", message: "This file is not an FPDS document or a draft." };
  }
  if (isDraft(value)) {
    const draft = (value as { draft?: unknown }).draft;
    if (draft && typeof draft === "object" && !Array.isArray(draft)) return { kind: "draft", draft: draft as Draft };
    return { kind: "error", message: "This draft file is damaged." };
  }
  if ("fpds_version" in value) {
    const { fpds_version: _version, ...rest } = value as Record<string, unknown>;
    const submission = { ...((rest.submission ?? {}) as Record<string, unknown>) };
    delete submission.submission_id;
    delete submission.submitted_at;
    const consent = { ...((rest.consent ?? {}) as Record<string, unknown>) };
    delete consent.is_minor;
    return { kind: "document", draft: { ...rest, submission, consent } };
  }
  return { kind: "error", message: "This file is not an FPDS document or a draft." };
}

/** Starts a download in the browser. The file never leaves the device. */
export function downloadFile(contents: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
