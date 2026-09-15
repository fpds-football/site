import { type Issue, isDraft, type ValidationResult, validate } from "@fpds-football/fpds";
import type { Draft } from "~/builder/draft";
import { readOpenedFile } from "~/builder/storage";

export type ViewedFile =
  /** The viewer does not show the fields (DECISIONS.md D-37). */
  | { kind: "refused"; title: string; message: string }
  /** A draft from the builder is not a submission (DECISIONS.md D-36). */
  | { kind: "draft"; draft: Draft }
  | { kind: "unsupported"; message: string }
  /** An FPDS document, valid or not. `draft` is the same content, ready for the builder as a new version (§4.3). */
  | { kind: "document"; document: Record<string, unknown>; result: ValidationResult; draft: Draft };

/** Reads the text of a file for the viewer. All FPDS rules come from `@fpds-football/fpds`. */
export function readViewedFile(text: string): ViewedFile {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { kind: "refused", title: "This file is not JSON.", message: "An FPDS player profile is a JSON file that ends with .fpds.json." };
  }

  const opened = readOpenedFile(text);
  if (opened.kind === "draft") return { kind: "draft", draft: opened.draft };
  if (opened.kind === "error") {
    return isDraft(value)
      ? { kind: "refused", title: "This draft file is damaged.", message: "The builder cannot open it, and the viewer cannot show it." }
      : { kind: "refused", title: "This file is not an FPDS document.", message: "It is JSON, but it does not have an FPDS version." };
  }

  const result = validate(value);
  const unsupported = result.issues.find((issue: Issue) => issue.code === "unsupported_version");
  if (unsupported) return { kind: "unsupported", message: unsupported.message };

  return { kind: "document", document: value as Record<string, unknown>, result, draft: opened.draft };
}
