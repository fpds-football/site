import { Badge, Banner, Button, Checkbox, Combobox, DropdownMenu, Input, Select } from "@cloudflare/kumo";
import { type Issue, VALUE_LABELS } from "@fpds-football/fpds";
import { CaretDownIcon, InfoIcon, WarningIcon, XIcon } from "@phosphor-icons/react";
import { type ReactNode, useId } from "react";
import { COUNTRIES, countryName } from "~/content/countries";
import { escapeToken } from "./draft";
import type { Builder } from "./useBuilder";

interface FieldProps {
  builder: Builder;
  pointer: string;
  label: string;
  hint?: string;
  /** Show a source control for this value (§11). */
  source?: boolean;
  /** The field is a group of controls, such as a club with a name and a country. It uses a fieldset and a legend. */
  group?: boolean;
}

/** Props that FieldShell gives to the control inside it. */
interface ControlProps {
  id: string;
  labelId: string;
  describedBy: string | undefined;
  invalid: boolean;
}

const COUNTRY_ITEMS = COUNTRIES.map((country) => ({ value: country.code, label: `${country.name} (${country.code})` }));
type CountryItem = (typeof COUNTRY_ITEMS)[number];

/** The classes that Kumo uses for a field label, so a native label matches Kumo fields. */
const LABEL_CLASS = "m-0 text-base font-medium text-kumo-default select-none";

/**
 * One field: a label row with the source control on the same line, the control, the description, the first error,
 * and conflicts with fixes. A field that does not apply shows only a short note.
 *
 * The source control sits in the label row of its own field. On a separate row, it looked like part of the field above.
 */
export function FieldShell({
  builder,
  pointer,
  label,
  hint,
  source,
  group,
  children,
}: FieldProps & { children: (props: ControlProps) => ReactNode }) {
  const id = useId();
  const field = builder.fieldState(pointer);
  const issues = builder.issuesAt(pointer).filter((issue) => !issue.path.startsWith("/provenance/"));
  const hasValue = builder.get(pointer) !== undefined;

  if (field.state === "not_applicable") {
    return (
      <div className="mb-6" data-field={pointer} data-state="not_applicable">
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
  const error = issues.find((issue) => !conflicts.includes(issue) && issue.severity === "error");
  const description = [field.reason, hint].filter(Boolean).join(" ");
  const describedBy = [description ? `${id}-description` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");

  const Wrapper = group ? "fieldset" : "div";
  const labelContent = (
    <>
      {label}
      {field.state === "optional" ? <span className="ml-1.5 font-normal text-kumo-subtle">(optional)</span> : null}
    </>
  );

  return (
    // A field is as wide as its widest control, so the source badge sits at the right edge of the control, not far away.
    <Wrapper className="m-0 mb-6 max-w-[30rem] min-w-0 border-0 p-0" data-field={pointer} data-state={field.state}>
      {group ? (
        // A legend names its fieldset only as the first child, so the source menu goes inside the legend.
        <legend className="mb-1.5 flex min-h-7 w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 p-0">
          <span id={`${id}-label`} className={LABEL_CLASS}>
            {labelContent}
          </span>
          {source && hasValue ? <SourceMenu builder={builder} pointer={pointer} /> : null}
        </legend>
      ) : (
        <div className="mb-1.5 flex min-h-7 flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <label id={`${id}-label`} htmlFor={id} className={LABEL_CLASS}>
            {labelContent}
          </label>
          {source && hasValue ? <SourceMenu builder={builder} pointer={pointer} /> : null}
        </div>
      )}
      {children({ id, labelId: `${id}-label`, describedBy: describedBy || undefined, invalid: error !== undefined })}
      {description ? (
        <p id={`${id}-description`} className="mt-1.5 mb-0 text-sm text-kumo-subtle">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 mb-0 text-sm text-kumo-danger">
          {error.message}
        </p>
      ) : null}
      {source && hasValue ? <SourceDetails builder={builder} pointer={pointer} /> : null}
      {conflicts.map((issue) => (
        <IssueMessage key={`${issue.code}${issue.path}`} builder={builder} issue={issue} />
      ))}
    </Wrapper>
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
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          variant={invalid ? "error" : "default"}
          className="w-full"
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
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          type="date"
          aria-describedby={describedBy}
          aria-invalid={invalid}
          variant={invalid ? "error" : "default"}
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
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          variant={invalid ? "error" : "default"}
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
      {({ id, labelId, describedBy }) => (
        <Select
          id={id}
          aria-labelledby={labelId}
          aria-describedby={describedBy}
          className="w-full"
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
  const issues = builder.issuesAt(pointer);
  const error = issues.find((issue) => issue.severity === "error" && fixesFor(builder, issue).length === 0);
  const conflicts = issues.filter((issue) => fixesFor(builder, issue).length > 0);
  const description = [field.reason, max ? `Choose up to ${max}.` : props.hint].filter(Boolean).join(" ") || undefined;

  return (
    <div className="mb-6" data-field={pointer} data-state={field.state}>
      <Checkbox.Group
        value={selected}
        onValueChange={(next) => builder.set(pointer, next.length > 0 ? next : undefined)}
        {...(description ? { description } : {})}
        {...(error ? { error: error.message } : {})}
      >
        <Checkbox.Legend>
          {label}
          {field.state === "optional" ? <span className="ml-1.5 font-normal text-kumo-subtle">(optional)</span> : null}
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
      {conflicts.map((issue) => (
        <IssueMessage key={`${issue.code}${issue.path}`} builder={builder} issue={issue} />
      ))}
    </div>
  );
}

function CountryCombobox({
  id,
  labelId,
  describedBy,
  value,
  onChange,
  placeholder,
  exclude = [],
}: ControlProps & { value: string | undefined; onChange: (code: string | undefined) => void; placeholder: string; exclude?: string[] }) {
  const items = exclude.length > 0 ? COUNTRY_ITEMS.filter((item) => !exclude.includes(item.value)) : COUNTRY_ITEMS;
  const selected = value ? (COUNTRY_ITEMS.find((item) => item.value === value) ?? null) : null;

  return (
    <Combobox
      items={items}
      value={selected}
      onValueChange={(item) => onChange((item as CountryItem | null)?.value)}
      isItemEqualToValue={(item: CountryItem, current: CountryItem) => item.value === current.value}
    >
      <Combobox.TriggerInput
        id={id}
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        placeholder={placeholder}
        className="w-full"
      />
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
    <FieldShell
      {...props}
      hint="Put the sporting nationality first. Use England, Scotland, Wales or Northern Ireland for a football nation in the United Kingdom."
    >
      {(control) => (
        <div>
          {selected.length > 0 ? (
            <ol className="mb-2 flex list-none flex-wrap gap-2 pl-0" aria-label="Selected nationalities">
              {selected.map((code, index) => (
                <li
                  key={code}
                  className="flex h-8 items-center gap-1 rounded-md border border-kumo-line bg-kumo-base pr-1 pl-2.5 text-sm"
                >
                  <span className="text-kumo-strong">{countryName(code)}</span>
                  {index === 0 ? (
                    <Badge variant="neutral" className="ml-1">
                      Sporting
                    </Badge>
                  ) : (
                    <Button size="xs" variant="ghost" onClick={() => setList([code, ...selected.filter((item) => item !== code)])}>
                      Make sporting
                    </Button>
                  )}
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
          <CountryCombobox
            // A new key after each change clears the search text, so the user can search for the next country at once.
            key={selected.join(",")}
            {...control}
            placeholder={selected.length > 0 ? "Add another nationality" : "Search for a nationality"}
            value={undefined}
            exclude={selected}
            onChange={(code) => code && setList([...selected, code])}
          />
        </div>
      )}
    </FieldShell>
  );
}

const PICKER_SOURCES = ["verified", "third_party_data", "club_stated", "estimated", "unknown"] as const;
const CHECKABLE = new Set<string>(["verified", "third_party_data"]);

interface ProvenanceEntry {
  source?: string;
  asserted_by?: string;
  verified_against?: string;
}

function useSource(builder: Builder, pointer: string) {
  const base = `/provenance/${escapeToken(pointer)}`;
  const entry = builder.get(base) as ProvenanceEntry | undefined;
  const senderLabel = builder.get("/submission/sender") === "player" ? "Stated by player" : "Stated by agent";
  const label = entry?.source ? VALUE_LABELS.source[entry.source as keyof typeof VALUE_LABELS.source] : senderLabel;
  return { base, entry, senderLabel, label, checkable: entry?.source ? CHECKABLE.has(entry.source) : false };
}

/**
 * The source of a value, shown as the same badge that the club sees in the preview, with a menu to change it.
 * With no choice, the source is the sender (§11.1).
 */
export function SourceMenu({ builder, pointer }: { builder: Builder; pointer: string }) {
  const { base, entry, senderLabel, label, checkable } = useSource(builder, pointer);

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger
        render={
          <button
            type="button"
            aria-label={`Source: ${label}. Change the source`}
            className="inline-flex items-center gap-0.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-kumo-focus"
          >
            <Badge variant={checkable ? "info" : "warning"}>
              {label}
              <CaretDownIcon aria-hidden="true" className="ml-1" />
            </Badge>
          </button>
        }
      />
      <DropdownMenu.Content>
        <DropdownMenu.RadioGroup
          value={entry?.source ?? "sender"}
          onValueChange={(value: string) =>
            builder.set(base, value === "sender" ? undefined : { ...entry, source: value })
          }
        >
          {/* A menu label must be inside a group (Base UI). */}
          <DropdownMenu.Label>Who says so?</DropdownMenu.Label>
          {/* Choosing a source closes the menu. Base UI radio items stay open by default. */}
          <DropdownMenu.RadioItem value="sender" closeOnClick>
            {senderLabel} (default)
          </DropdownMenu.RadioItem>
          <DropdownMenu.Separator />
          {PICKER_SOURCES.map((source) => (
            <DropdownMenu.RadioItem key={source} value={source} closeOnClick>
              {VALUE_LABELS.source[source]}
            </DropdownMenu.RadioItem>
          ))}
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

/** When the source is not the sender, asks who made the claim, and what a verified claim was checked against. */
function SourceDetails({ builder, pointer }: { builder: Builder; pointer: string }) {
  const { base, entry } = useSource(builder, pointer);
  if (!entry?.source) return null;

  return (
    <div className="mt-2 grid grid-cols-1 gap-3 rounded-md border border-kumo-line bg-kumo-tint p-3">
      <SmallField label="Who made the claim" hint="For example Wyscout, or the club name">
        {(id) => (
          <Input
            id={id}
            size="sm"
            className="w-full"
            value={entry.asserted_by ?? ""}
            onChange={(event) => builder.set(`${base}/asserted_by`, event.target.value || undefined)}
          />
        )}
      </SmallField>
      {entry.source === "verified" ? (
        <SmallField label="Verified against" hint="For example a passport or FIFA TMS" required>
          {(id) => (
            <Input
              id={id}
              size="sm"
              className="w-full"
              variant={entry.verified_against ? "default" : "error"}
              value={entry.verified_against ?? ""}
              onChange={(event) => builder.set(`${base}/verified_against`, event.target.value || undefined)}
            />
          )}
        </SmallField>
      ) : null}
    </div>
  );
}

function SmallField({
  label,
  hint,
  required,
  children,
}: { label: string; hint: string; required?: boolean; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-kumo-default">
        {label}
        {required ? null : <span className="ml-1 font-normal text-kumo-subtle">(optional)</span>}
      </label>
      {children(id)}
      <p className="mt-1 mb-0 text-xs text-kumo-subtle">{hint}</p>
    </div>
  );
}

/** The source control for a group of values, such as a season record: the badge menu and its details. */
export function SourceControl({ builder, pointer }: { builder: Builder; pointer: string }) {
  return (
    <div className="flex flex-col items-end gap-2">
      <SourceMenu builder={builder} pointer={pointer} />
      <SourceDetails builder={builder} pointer={pointer} />
    </div>
  );
}
