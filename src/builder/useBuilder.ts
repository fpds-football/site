import { getFieldStateIssues, getFieldStates, type FieldState, type Issue } from "@fpds-football/fpds";
import { useCallback, useEffect, useMemo, useState } from "react";
import { clean, type Draft, getAt, setAt } from "./draft";
import { buildExport, withTime } from "./export";
import { SECTIONS, type SectionId, sectionFor } from "./sections";
import { clearSession, loadSession, saveSession } from "./storage";

export type SectionStatus = "complete" | "incomplete" | "optional";

/** Issues that the user can fix with one action. The builder never makes these changes without the user (D-34). */
export const CONFLICT_CODES = new Set<Issue["code"]>([
  "minor_cannot_send",
  "information_only_exclusive",
  "secondary_repeats_primary",
]);

export function useBuilder() {
  const [draft, setDraft] = useState<Draft>(() => loadSession() ?? {});
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // The minor status depends on the date. Refresh the time each minute, so a long session stays correct.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    saveSession(draft);
  }, [draft]);

  const set = useCallback((pointer: string, value: unknown) => setDraft((current) => setAt(current, pointer, value)), []);
  const get = useCallback((pointer: string) => getAt(draft, pointer), [draft]);

  const cleaned = useMemo(() => {
    const result = (clean(draft) ?? {}) as Draft;
    // A representation block that the user added but has not filled in still makes its fields required.
    if (draft.representation !== undefined && result.representation === undefined) result.representation = {};
    return result;
  }, [draft]);
  const { fields, isMinor } = useMemo(() => getFieldStates(withTime(cleaned, now)), [cleaned, now]);
  const stateIssues = useMemo(() => getFieldStateIssues(withTime(cleaned, now)), [cleaned, now]);
  const conflicts = useMemo(() => stateIssues.filter((issue) => CONFLICT_CODES.has(issue.code)), [stateIssues]);
  const exportResult = useMemo(() => buildExport(draft, now), [draft, now]);

  /**
   * Everything that prevents export, at field level. The schema reports a missing block, for example "Player is required",
   * but the field states name each missing field. Keep a schema error only when no field-state issue covers its path.
   */
  const blockers = useMemo(() => {
    const fieldLevel = stateIssues.filter((issue) => issue.code !== "not_applicable");
    const covered = (path: string) => fieldLevel.some((issue) => issue.path === path || issue.path.startsWith(`${path}/`));
    const schema = exportResult.errors.filter((issue) => !covered(issue.path));
    const seen = new Set<string>();
    return [...fieldLevel, ...schema].filter((issue) => {
      const key = `${issue.code}|${issue.path}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [stateIssues, exportResult]);

  const fieldState = useCallback(
    (pointer: string): FieldState => fields[pointer] ?? { state: "optional" },
    [fields],
  );

  const issuesAt = useCallback(
    (pointer: string): Issue[] => {
      const all = [...blockers, ...exportResult.warnings];
      const seen = new Set<string>();
      return all.filter((issue) => {
        const matches = issue.path === pointer || issue.path.startsWith(`${pointer}/`);
        const visible = issue.code !== "required" || showAllErrors;
        const key = `${issue.code}|${issue.path}`;
        if (!matches || !visible || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    [blockers, exportResult, showAllErrors],
  );

  const sectionStatus = useMemo(() => {
    const statuses = {} as Record<SectionId, SectionStatus>;
    for (const section of SECTIONS) {
      const blocking = blockers.some((issue) => sectionFor(issue.path) === section.id);
      const empty = section.prefixes.every((prefix) => getAt(cleaned, prefix) === undefined);
      const optional =
        section.id === "performance" || section.id === "media" || (section.id === "representation" && fields["/representation"]?.state !== "required");
      statuses[section.id] = blocking ? "incomplete" : optional && empty ? "optional" : "complete";
    }
    return statuses;
  }, [cleaned, blockers, fields]);

  const reset = useCallback((next: Draft = {}) => {
    setDraft(next);
    setShowAllErrors(false);
    if (Object.keys(next).length === 0) clearSession();
  }, []);

  return {
    draft,
    set,
    get,
    fieldState,
    issuesAt,
    isMinor,
    conflicts,
    blockers,
    exportResult,
    sectionStatus,
    showAllErrors,
    setShowAllErrors,
    reset,
    now,
  };
}

export type Builder = ReturnType<typeof useBuilder>;
