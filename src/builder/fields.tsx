import { type Issue, VALUE_LABELS } from "@fpds-football/fpds";
import { type ReactNode, useId } from "react";
import { COUNTRIES, countryName } from "~/content/countries";
import { escapeToken } from "./draft";
import type { Builder } from "./useBuilder";

const inputClass =
  "w-full rounded-none border border-rule bg-field px-3 py-2 text-[0.95rem] text-ink focus:outline-2 focus:outline-offset-1 focus:outline-verified aria-[invalid=true]:border-[#b3261e]";

interface FieldProps {
  builder: Builder;
  pointer: string;
  label: string;
  hint?: string;
  /** Show a source selector for this value (§11). */
  source?: boolean;
}

/** Label, required marker, reason, issues and source selector for one field. Hides a field that does not apply. */
export function FieldShell({
  builder,
  pointer,
  label,
  hint,
  source,
  children,
}: FieldProps & { children: (props: { id: string; describedBy: string; invalid: boolean }) => ReactNode }) {
  const id = useId();
  const field = builder.fieldState(pointer);
  const issues = builder.issuesAt(pointer).filter((issue) => !issue.path.startsWith("/provenance/"));
  const hasValue = builder.get(pointer) !== undefined;

  if (field.state === "not_applicable") {
    return (
      <div className="mb-5 border-l-2 border-rule pl-3 text-[0.9rem] text-ink-soft" data-field={pointer} data-state="not_applicable">
        <span className="font-semibold">{label}:</span> {field.reason ?? "This field does not apply."}
        {hasValue ? (
          <span className="mt-1 block">
            The builder keeps your value, but the export does not include it.{" "}
            <button type="button" className="text-verified underline" onClick={() => builder.set(pointer, undefined)}>
              Remove the value
            </button>
          </span>
        ) : null}
      </div>
    );
  }

  const describedBy = `${id}-hint ${id}-issues`;
  return (
    <div className="mb-5" data-field={pointer} data-state={field.state}>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={id} className="font-semibold">
          {label}{" "}
          {field.state === "required" ? (
            <span className="ml-1 border border-current px-1 text-[0.7rem] font-normal tracking-wide text-[#8a4b00] uppercase">
              Required
            </span>
          ) : field.state === "optional" ? (
            <span className="ml-1 text-[0.8rem] font-normal text-ink-soft">Optional</span>
          ) : null}
        </label>
        {source && hasValue ? <SourcePicker builder={builder} pointer={pointer} /> : null}
      </div>
      <p id={`${id}-hint`} className="mb-1.5 text-[0.85rem] text-ink-soft empty:hidden">
        {[field.reason, hint].filter(Boolean).join(" ")}
      </p>
      {children({ id, describedBy, invalid: issues.some((issue) => issue.severity === "error") })}
      <div id={`${id}-issues`}>
        {issues.map((issue) => (
          <IssueMessage key={`${issue.code}${issue.path}`} builder={builder} issue={issue} />
        ))}
      </div>
    </div>
  );
}

export function IssueMessage({ builder, issue }: { builder: Builder; issue: Issue }) {
  const fixes = fixesFor(builder, issue);
  const tone =
    issue.severity === "warning" ? "border-stated text-stated" : "border-[#b3261e] text-[#8c1d18]";
  return (
    <div role={issue.severity === "error" ? "alert" : "status"} className={`mt-1.5 border-l-2 pl-2.5 text-[0.88rem] ${tone}`}>
      {issue.message}
      {fixes.map((fix) => (
        <button key={fix.label} type="button" className="ml-2 font-semibold text-verified underline" onClick={fix.run}>
          {fix.label}
        </button>
      ))}
    </div>
  );
}

function fixesFor(builder: Builder, issue: Issue): { label: string; run: () => void }[] {
  switch (issue.code) {
    case "minor_cannot_send":
      return [{ label: "Change the sender to intermediary", run: () => builder.set("/submission/sender", "intermediary") }];
    case "information_only_exclusive":
      return [
        { label: "Keep only information only", run: () => builder.set("/submission/purposes", ["information_only"]) },
        {
          label: "Remove information only",
          run: () =>
            builder.set(
              "/submission/purposes",
              ((builder.get("/submission/purposes") as string[] | undefined) ?? []).filter((p) => p !== "information_only"),
            ),
        },
      ];
    case "secondary_repeats_primary": {
      const primary = builder.get("/positions/primary_position");
      return [
        {
          label: `Remove ${primary} from secondary positions`,
          run: () =>
            builder.set(
              "/positions/secondary_positions",
              ((builder.get("/positions/secondary_positions") as string[] | undefined) ?? []).filter((p) => p !== primary),
            ),
        },
      ];
    }
    default:
      return [];
  }
}

export function TextField(props: FieldProps & { autoComplete?: string; placeholder?: string }) {
  const { builder, pointer, placeholder, autoComplete } = props;
  return (
    <FieldShell {...props}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          type="text"
          className={inputClass}
          value={(builder.get(pointer) as string | undefined) ?? ""}
          onChange={(event) => builder.set(pointer, event.target.value === "" ? undefined : event.target.value)}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          autoComplete={autoComplete ?? "off"}
          placeholder={placeholder}
        />
      )}
    </FieldShell>
  );
}

export function DateField(props: FieldProps) {
  const { builder, pointer } = props;
  return (
    <FieldShell {...props}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          type="date"
          className={`${inputClass} max-w-[14rem]`}
          value={(builder.get(pointer) as string | undefined) ?? ""}
          onChange={(event) => builder.set(pointer, event.target.value || undefined)}
          aria-describedby={describedBy}
          aria-invalid={invalid}
        />
      )}
    </FieldShell>
  );
}

export function NumberField(props: FieldProps) {
  const { builder, pointer } = props;
  const value = builder.get(pointer);
  return (
    <FieldShell {...props}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          className={`${inputClass} max-w-[9rem]`}
          value={typeof value === "number" ? value : ""}
          onChange={(event) => builder.set(pointer, event.target.value === "" ? undefined : Number(event.target.value))}
          aria-describedby={describedBy}
          aria-invalid={invalid}
        />
      )}
    </FieldShell>
  );
}

export function SelectField(props: FieldProps & { options: Record<string, string>; empty?: string }) {
  const { builder, pointer, options, empty } = props;
  const disabled = new Map((builder.fieldState(pointer).disabledValues ?? []).map((d) => [d.value, d.reason]));
  return (
    <FieldShell {...props}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          className={`${inputClass} max-w-[22rem]`}
          value={(builder.get(pointer) as string | undefined) ?? ""}
          onChange={(event) => builder.set(pointer, event.target.value || undefined)}
          aria-describedby={describedBy}
          aria-invalid={invalid}
        >
          <option value="">{empty ?? "Select"}</option>
          {Object.entries(options).map(([value, label]) => (
            <option key={value} value={value} disabled={disabled.has(value) && builder.get(pointer) !== value}>
              {label}
              {disabled.has(value) ? ` (${disabled.get(value)})` : ""}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

export function CheckboxGroupField(props: FieldProps & { options: Record<string, string>; max?: number }) {
  const { builder, pointer, options, max, label } = props;
  const selected = (builder.get(pointer) as string[] | undefined) ?? [];
  const disabled = new Map((builder.fieldState(pointer).disabledValues ?? []).map((d) => [d.value, d.reason]));
  const full = max !== undefined && selected.length >= max;

  const toggle = (value: string, checked: boolean) => {
    const next = checked ? [...selected, value] : selected.filter((item) => item !== value);
    builder.set(pointer, next.length > 0 ? next : undefined);
  };

  return (
    <FieldShell {...props} hint={max ? `Choose up to ${max}.` : props.hint}>
      {({ id, describedBy }) => (
        <fieldset id={id} aria-describedby={describedBy} className="flex flex-wrap gap-2" aria-label={label}>
          {Object.entries(options).map(([value, optionLabel]) => {
            const isChecked = selected.includes(value);
            const reason = disabled.get(value);
            const isDisabled = !isChecked && (reason !== undefined || full);
            return (
              <label
                key={value}
                title={reason}
                className={`flex cursor-pointer items-center gap-2 border px-3 py-1.5 text-[0.9rem] ${
                  isChecked ? "border-verified bg-[#e8f0f6]" : "border-rule bg-field"
                } ${isDisabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isDisabled}
                  onChange={(event) => toggle(value, event.target.checked)}
                />
                {optionLabel}
              </label>
            );
          })}
        </fieldset>
      )}
    </FieldShell>
  );
}

export function CountryField(props: FieldProps) {
  const { builder, pointer } = props;
  return (
    <FieldShell {...props}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          className={`${inputClass} max-w-[22rem]`}
          value={(builder.get(pointer) as string | undefined) ?? ""}
          onChange={(event) => builder.set(pointer, event.target.value || undefined)}
          aria-describedby={describedBy}
          aria-invalid={invalid}
        >
          <option value="">Select a country</option>
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name} ({country.code})
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

/** An ordered list of countries. The first country is the sporting nationality (§5). */
export function CountryListField(props: FieldProps) {
  const { builder, pointer } = props;
  const selected = (builder.get(pointer) as string[] | undefined) ?? [];
  const setList = (next: string[]) => builder.set(pointer, next.length > 0 ? next : undefined);

  return (
    <FieldShell {...props} hint="Put the sporting nationality first.">
      {({ id, describedBy, invalid }) => (
        <div>
          {selected.length > 0 ? (
            <ol className="mb-2 flex flex-wrap gap-2">
              {selected.map((code, index) => (
                <li key={code} className="flex items-center gap-2 border border-rule bg-field px-2.5 py-1 text-[0.9rem]">
                  <span>
                    {countryName(code)}
                    {index === 0 ? <span className="ml-1 text-[0.8rem] text-ink-soft">(sporting)</span> : null}
                  </span>
                  {index > 0 ? (
                    <button
                      type="button"
                      className="text-[0.8rem] text-verified underline"
                      onClick={() => setList([code, ...selected.filter((item) => item !== code)])}
                    >
                      Make sporting
                    </button>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`Remove ${countryName(code)}`}
                    className="text-ink-soft hover:text-ink"
                    onClick={() => setList(selected.filter((item) => item !== code))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
          ) : null}
          <select
            id={id}
            className={`${inputClass} max-w-[22rem]`}
            value=""
            onChange={(event) => event.target.value && setList([...selected, event.target.value])}
            aria-describedby={describedBy}
            aria-invalid={invalid}
          >
            <option value="">{selected.length > 0 ? "Add another nationality" : "Select a nationality"}</option>
            {COUNTRIES.filter((country) => !selected.includes(country.code)).map((country) => (
              <option key={country.code} value={country.code}>
                {country.name} ({country.code})
              </option>
            ))}
          </select>
        </div>
      )}
    </FieldShell>
  );
}

const PICKER_SOURCES = ["verified", "third_party_data", "club_stated", "estimated", "unknown"] as const;

/** Chooses the source of a value. With no choice, the source is the sender (§11.1). */
export function SourcePicker({ builder, pointer }: { builder: Builder; pointer: string }) {
  const id = useId();
  const base = `/provenance/${escapeToken(pointer)}`;
  const entry = builder.get(base) as { source?: string; asserted_by?: string; verified_against?: string } | undefined;
  const sender = builder.get("/submission/sender");
  const defaultLabel = sender === "player" ? "Stated by player" : "Stated by agent";

  return (
    <div className="text-[0.82rem] text-ink-soft">
      <label htmlFor={id} className="mr-1.5">
        Source
      </label>
      <select
        id={id}
        className="border border-rule bg-field px-1.5 py-0.5 text-[0.82rem] text-ink"
        value={entry?.source ?? ""}
        onChange={(event) =>
          builder.set(base, event.target.value ? { ...entry, source: event.target.value } : undefined)
        }
      >
        <option value="">{defaultLabel} (default)</option>
        {PICKER_SOURCES.map((source) => (
          <option key={source} value={source}>
            {VALUE_LABELS.source[source]}
          </option>
        ))}
      </select>
      {entry?.source ? (
        <div className="mt-1.5 flex flex-wrap gap-2">
          <input
            aria-label="Who made the claim"
            placeholder="Who, for example Wyscout"
            className="border border-rule bg-field px-2 py-1 text-[0.82rem] text-ink"
            value={entry.asserted_by ?? ""}
            onChange={(event) => builder.set(`${base}/asserted_by`, event.target.value || undefined)}
          />
          {entry.source === "verified" ? (
            <input
              aria-label="Verified against"
              placeholder="Checked against, for example FIFA TMS"
              aria-invalid={!entry.verified_against}
              className="border border-rule bg-field px-2 py-1 text-[0.82rem] text-ink aria-[invalid=true]:border-[#b3261e]"
              value={entry.verified_against ?? ""}
              onChange={(event) => builder.set(`${base}/verified_against`, event.target.value || undefined)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
