import { Badge, Banner, Button, Checkbox, Combobox, Input, Select } from "@cloudflare/kumo";
import { type Issue, VALUE_LABELS } from "@fpds-football/fpds";
import { InfoIcon, WarningIcon, XIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { COUNTRIES, countryName } from "~/content/countries";
import { escapeToken } from "./draft";
import type { Builder } from "./useBuilder";

interface FieldProps {
  builder: Builder;
  pointer: string;
  label: string;
  hint?: string;
  /** Show a source selector for this value (§11). */
  source?: boolean;
}

interface ControlProps {
  /** The label, with a "Required" badge when the field is required. For the `label` prop of a Kumo control. */
  label: ReactNode;
  /** The reason for the state of the field and the hint. For the `description` prop of a Kumo control. */
  description: ReactNode;
  /** The first error for the field, without fixes. For the `error` prop of a Kumo control. */
  error: string | undefined;
}

const COUNTRY_ITEMS = COUNTRIES.map((country) => ({ value: country.code, label: `${country.name} (${country.code})` }));
type CountryItem = (typeof COUNTRY_ITEMS)[number];

/**
 * The frame of one field: hides a field that does not apply, adds the source selector, and shows conflicts with fixes.
 * The Kumo control inside shows the label, the description and the first error.
 */
export function FieldShell({
  builder,
  pointer,
  label,
  hint,
  source,
  children,
}: FieldProps & { children: (props: ControlProps) => ReactNode }) {
  const field = builder.fieldState(pointer);
  const issues = builder.issuesAt(pointer).filter((issue) => !issue.path.startsWith("/provenance/"));
  const hasValue = builder.get(pointer) !== undefined;

  if (field.state === "not_applicable") {
    return (
      <div className="mb-5" data-field={pointer} data-state="not_applicable">
        <Banner
          variant="secondary"
          size="sm"
          icon={<InfoIcon />}
          title={`${label}: not used`}
          description={
            <>
              {field.reason ?? "This field does not apply."}
              {hasValue ? " The builder keeps your value, but the export does not include it." : null}
            </>
          }
          action={
            hasValue ? (
              <Banner.Action onClick={() => builder.set(pointer, undefined)}>Remove the value</Banner.Action>
            ) : undefined
          }
        />
      </div>
    );
  }

  const conflicts = issues.filter((issue) => fixesFor(builder, issue).length > 0 || issue.severity === "warning");
  const plainErrors = issues.filter((issue) => !conflicts.includes(issue) && issue.severity === "error");

  const labelNode = (
    <span className="inline-flex flex-wrap items-center gap-2">
      {label}
      {field.state === "required" ? <Badge variant="orange">Required</Badge> : null}
      {field.state === "optional" ? <span className="text-sm font-normal text-kumo-subtle">(optional)</span> : null}
    </span>
  );
  const description = [field.reason, hint].filter(Boolean).join(" ") || undefined;

  return (
    <div className="mb-5" data-field={pointer} data-state={field.state}>
      {source && hasValue ? (
        <div className="mb-1 flex justify-end">
          <SourcePicker builder={builder} pointer={pointer} />
        </div>
      ) : null}
      {children({ label: labelNode, description, error: plainErrors[0]?.message })}
      {conflicts.map((issue) => (
        <IssueMessage key={`${issue.code}${issue.path}`} builder={builder} issue={issue} />
      ))}
    </div>
  );
}

export function IssueMessage({ builder, issue }: { builder: Builder; issue: Issue }) {
  const fixes = fixesFor(builder, issue);
  return (
    <div role={issue.severity === "error" ? "alert" : "status"} className="mt-2">
      <Banner
        variant={issue.severity === "error" ? "error" : "alert"}
        size="sm"
        icon={<WarningIcon weight="fill" />}
        description={issue.message}
        action={
          fixes.length > 0 ? (
            <>
              {fixes.map((fix) => (
                <Banner.Action key={fix.label} onClick={fix.run}>
                  {fix.label}
                </Banner.Action>
              ))}
            </>
          ) : undefined
        }
      />
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
      {({ label, description, error }) => (
        <Input
          label={label}
          description={description}
          error={error}
          variant={error ? "error" : "default"}
          value={(builder.get(pointer) as string | undefined) ?? ""}
          onChange={(event) => builder.set(pointer, event.target.value === "" ? undefined : event.target.value)}
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
      {({ label, description, error }) => (
        <Input
          type="date"
          label={label}
          description={description}
          error={error}
          variant={error ? "error" : "default"}
          className="max-w-[14rem]"
          value={(builder.get(pointer) as string | undefined) ?? ""}
          onChange={(event) => builder.set(pointer, event.target.value || undefined)}
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
      {({ label, description, error }) => (
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          label={label}
          description={description}
          error={error}
          variant={error ? "error" : "default"}
          className="max-w-[9rem]"
          value={typeof value === "number" ? value : ""}
          onChange={(event) => builder.set(pointer, event.target.value === "" ? undefined : Number(event.target.value))}
        />
      )}
    </FieldShell>
  );
}

export function SelectField(props: FieldProps & { options: Record<string, string>; empty?: string }) {
  const { builder, pointer, options, empty } = props;
  const current = (builder.get(pointer) as string | undefined) ?? null;
  const disabled = new Map((builder.fieldState(pointer).disabledValues ?? []).map((d) => [d.value, d.reason]));
  const items = Object.fromEntries(
    Object.entries(options).map(([value, label]) => {
      const reason = disabled.get(value);
      return [value, reason && current !== value ? { label: `${label} (${reason})`, disabled: true } : label];
    }),
  );

  return (
    <FieldShell {...props}>
      {({ label, description, error }) => (
        <Select
          label={label}
          // Kumo names the trigger from `label` only when it is a string. Our label contains a badge, so name it here.
          aria-label={props.label}
          description={description}
          error={error}
          className="w-full max-w-[26rem]"
          placeholder={empty ?? "Select"}
          items={items}
          value={current}
          onValueChange={(value) => builder.set(pointer, (value as string | null) ?? undefined)}
        />
      )}
    </FieldShell>
  );
}

export function CheckboxGroupField(props: FieldProps & { options: Record<string, string>; max?: number }) {
  const { builder, pointer, options, max, label } = props;
  const selected = (builder.get(pointer) as string[] | undefined) ?? [];
  const disabled = new Map((builder.fieldState(pointer).disabledValues ?? []).map((d) => [d.value, d.reason]));
  const full = max !== undefined && selected.length >= max;
  const field = builder.fieldState(pointer);

  return (
    <FieldShell {...props} hint={max ? `Choose up to ${max}.` : props.hint}>
      {({ description, error }) => (
        <Checkbox.Group
          value={selected}
          onValueChange={(next) => builder.set(pointer, next.length > 0 ? next : undefined)}
          description={description}
          error={error}
        >
          <Checkbox.Legend className="inline-flex flex-wrap items-center gap-2">
            {label}
            {field.state === "required" ? <Badge variant="orange">Required</Badge> : null}
            {field.state === "optional" ? <span className="text-sm font-normal text-kumo-subtle">(optional)</span> : null}
          </Checkbox.Legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {Object.entries(options).map(([value, optionLabel]) => {
              const isChecked = selected.includes(value);
              return (
                <Checkbox.Item
                  key={value}
                  value={value}
                  label={optionLabel}
                  disabled={!isChecked && (disabled.has(value) || full)}
                />
              );
            })}
          </div>
        </Checkbox.Group>
      )}
    </FieldShell>
  );
}

function CountryCombobox({
  label,
  description,
  error,
  value,
  onChange,
  placeholder,
  exclude = [],
}: ControlProps & {
  value: string | undefined;
  onChange: (code: string | undefined) => void;
  placeholder: string;
  exclude?: string[];
}) {
  const items = exclude.length > 0 ? COUNTRY_ITEMS.filter((item) => !exclude.includes(item.value)) : COUNTRY_ITEMS;
  const selected = value ? (COUNTRY_ITEMS.find((item) => item.value === value) ?? null) : null;

  return (
    <Combobox
      label={label}
      description={description}
      error={error}
      items={items}
      value={selected}
      onValueChange={(item) => onChange((item as CountryItem | null)?.value)}
      isItemEqualToValue={(item: CountryItem, current: CountryItem) => item.value === current.value}
    >
      <Combobox.TriggerInput placeholder={placeholder} className="w-full max-w-[26rem]" />
      <Combobox.Content>
        <Combobox.Empty>No country matches.</Combobox.Empty>
        <Combobox.List>
          {(item: CountryItem) => (
            <Combobox.Item key={item.value} value={item}>
              {item.label}
            </Combobox.Item>
          )}
        </Combobox.List>
      </Combobox.Content>
    </Combobox>
  );
}

export function CountryField(props: FieldProps) {
  const { builder, pointer } = props;
  return (
    <FieldShell {...props}>
      {(control) => (
        <CountryCombobox
          {...control}
          placeholder="Search for a country"
          value={builder.get(pointer) as string | undefined}
          onChange={(code) => builder.set(pointer, code)}
        />
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
    <FieldShell {...props} hint="Put the sporting nationality first. Use England, Scotland, Wales or Northern Ireland for a football nation in the United Kingdom.">
      {(control) => (
        <div>
          <CountryCombobox
            // A new key after each change clears the search text, so the user can search for the next country at once.
            key={selected.join(",")}
            {...control}
            placeholder={selected.length > 0 ? "Add another nationality" : "Search for a nationality"}
            value={undefined}
            exclude={selected}
            onChange={(code) => code && setList([...selected, code])}
          />
          {selected.length > 0 ? (
            <ol className="mt-2 flex list-none flex-wrap gap-2 pl-0" aria-label="Selected nationalities">
              {selected.map((code, index) => (
                <li key={code} className="flex items-center gap-1.5 rounded-md border border-kumo-line bg-kumo-base py-1 pr-1 pl-2.5 text-sm">
                  <span>
                    {countryName(code)}
                    {index === 0 ? <span className="ml-1 text-kumo-subtle">(sporting)</span> : null}
                  </span>
                  {index > 0 ? (
                    <Button size="xs" variant="ghost" onClick={() => setList([code, ...selected.filter((item) => item !== code)])}>
                      Make sporting
                    </Button>
                  ) : null}
                  <Button
                    size="xs"
                    variant="ghost"
                    shape="square"
                    aria-label={`Remove ${countryName(code)}`}
                    icon={<XIcon />}
                    onClick={() => setList(selected.filter((item) => item !== code))}
                  />
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      )}
    </FieldShell>
  );
}

const PICKER_SOURCES = ["verified", "third_party_data", "club_stated", "estimated", "unknown"] as const;

/** Chooses the source of a value. With no choice, the source is the sender (§11.1). */
export function SourcePicker({ builder, pointer }: { builder: Builder; pointer: string }) {
  const base = `/provenance/${escapeToken(pointer)}`;
  const entry = builder.get(base) as { source?: string; asserted_by?: string; verified_against?: string } | undefined;
  const sender = builder.get("/submission/sender");
  const defaultLabel = `${sender === "player" ? "Stated by player" : "Stated by agent"} (default)`;
  const items: Record<string, string> = { sender: defaultLabel };
  for (const source of PICKER_SOURCES) items[source] = VALUE_LABELS.source[source];

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Select
        aria-label="Source"
        size="sm"
        className="min-w-[13rem]"
        items={items}
        value={entry?.source ?? "sender"}
        onValueChange={(value) =>
          builder.set(base, value && value !== "sender" ? { ...entry, source: value as string } : undefined)
        }
      />
      {entry?.source ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Input
            size="sm"
            aria-label="Who made the claim"
            placeholder="Who, for example Wyscout"
            value={entry.asserted_by ?? ""}
            onChange={(event) => builder.set(`${base}/asserted_by`, event.target.value || undefined)}
          />
          {entry.source === "verified" ? (
            <Input
              size="sm"
              aria-label="Verified against"
              placeholder="Checked against, for example FIFA TMS"
              variant={entry.verified_against ? "default" : "error"}
              value={entry.verified_against ?? ""}
              onChange={(event) => builder.set(`${base}/verified_against`, event.target.value || undefined)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
