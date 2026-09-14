import { Banner, Button, LayerCard } from "@cloudflare/kumo";
import { VALUE_LABELS } from "@fpds-football/fpds";
import { PlusIcon, TrashIcon, UserIcon } from "@phosphor-icons/react";
import {
  CheckboxGroupField,
  CountryField,
  CountryListField,
  DateField,
  FieldShell,
  NumberField,
  SelectField,
  SourceControl,
  TextField,
} from "./fields";
import type { SectionId } from "./sections";
import type { Builder } from "./useBuilder";

const positionOptions = Object.fromEntries(
  Object.entries(VALUE_LABELS.position).map(([code, name]) => [code, `${code}: ${name}`]),
);

export function SectionForm({ section, builder }: { section: SectionId; builder: Builder }) {
  switch (section) {
    case "submission":
      return (
        <>
          <CheckboxGroupField builder={builder} pointer="/submission/purposes" label="What is the player available for?" options={VALUE_LABELS.purposes} />
          <SelectField
            builder={builder}
            pointer="/submission/sender"
            label="Who sends this submission?"
            options={{ intermediary: "An intermediary, for example an agent", player: "The player" }}
          />
        </>
      );

    case "player":
      return (
        <>
          <TextField builder={builder} pointer="/player/full_name" label="Full name" hint="As it appears on the passport." source />
          <DateField builder={builder} pointer="/player/date_of_birth" label="Date of birth" source />
          <CountryListField builder={builder} pointer="/player/nationalities" label="Nationalities" source />
          <TextField builder={builder} pointer="/player/external_ids/fifa_connect_id" label="FIFA Connect ID" source />
          <ClubFields builder={builder} pointer="/player/current_club" label="Current club" />
        </>
      );

    case "positions":
      return (
        <>
          <SelectField builder={builder} pointer="/positions/primary_position" label="Primary position" options={positionOptions} source />
          <CheckboxGroupField builder={builder} pointer="/positions/secondary_positions" label="Secondary positions" options={positionOptions} max={4} source />
        </>
      );

    case "contract":
      return (
        <>
          <SelectField
            builder={builder}
            pointer="/contract/status"
            label="Contract status"
            options={{
              under_contract: "Under contract: a professional with a contract at the current club",
              on_loan: "On loan: a professional who plays for another club on loan",
              amateur: "Amateur: registered with a club, not a professional",
              free_agent: "Free agent: not registered with any club",
              unknown: "Unknown",
            }}
            source
          />
          <DateField builder={builder} pointer="/contract/expiry_date" label="Contract expiry date" source />
          <ClubFields builder={builder} pointer="/contract/parent_club" label="Parent club" hint="The club that holds the registration of the player." />
        </>
      );

    case "representation":
      return <RepresentationFields builder={builder} />;

    case "performance":
      return <PerformanceFields builder={builder} />;

    case "media":
      return <MediaFields builder={builder} />;

    case "consent":
      return (
        <>
          <SelectField builder={builder} pointer="/consent/lawful_basis" label="Lawful basis for sharing this data" options={VALUE_LABELS.lawful_basis} />
          <DateField builder={builder} pointer="/consent/consent_date" label="Consent date" />
          <div className="mb-5" data-field="/consent/is_minor">
            <Banner
              variant={builder.isMinor ? "alert" : "secondary"}
              size="sm"
              icon={<UserIcon />}
              title="Minor status"
              description={
                builder.isMinor === undefined
                  ? "The builder calculates this from the date of birth."
                  : builder.isMinor
                    ? "Minor. The player is less than 18 years old today."
                    : "Not a minor. The player is 18 or older today."
              }
            />
          </div>
        </>
      );
  }
}

function ClubFields({ builder, pointer, label, hint }: { builder: Builder; pointer: string; label: string; hint?: string }) {
  const field = builder.fieldState(pointer);
  return (
    <FieldShell builder={builder} pointer={pointer} label={label} {...(hint ? { hint } : {})} source group>
      {() => (
        <div className="grid grid-cols-1 gap-x-4 rounded-lg border border-kumo-line bg-kumo-base p-4 pb-0 sm:grid-cols-2" data-state={field.state}>
          <TextField builder={builder} pointer={`${pointer}/name`} label="Club name" />
          <CountryField builder={builder} pointer={`${pointer}/country`} label="Country" />
        </div>
      )}
    </FieldShell>
  );
}

function RepresentationFields({ builder }: { builder: Builder }) {
  const field = builder.fieldState("/representation");
  const present = builder.get("/representation") !== undefined;

  if (field.state === "optional" && !present) {
    return (
      <div className="mb-5">
        <p className="mb-3">{field.reason ?? "Representation is optional."}</p>
        <Button icon={<PlusIcon />} onClick={() => builder.set("/representation", { agent_name: "" })}>
          Add the player's agent
        </Button>
      </div>
    );
  }

  return (
    <>
      {field.reason ? <p className="mb-4 text-sm text-kumo-subtle">{field.reason}</p> : null}
      <TextField builder={builder} pointer="/representation/agent_name" label="Agent name" source />
      <TextField builder={builder} pointer="/representation/fifa_agent_licence" label="FIFA agent licence number" source />
      <SelectField builder={builder} pointer="/representation/mandate_status" label="Mandate" options={VALUE_LABELS.mandate_status} source />
      {field.state === "optional" ? (
        <Button variant="secondary-destructive" icon={<TrashIcon />} onClick={() => builder.set("/representation", undefined)}>
          Remove the agent
        </Button>
      ) : null}
    </>
  );
}

function PerformanceFields({ builder }: { builder: Builder }) {
  const rows = (builder.get("/performance") as unknown[] | undefined) ?? [];

  return (
    <>
      <p className="mb-4 text-sm text-kumo-subtle">
        Add one record for each season and competition. Minutes are required, because goals without minutes are not
        information.
      </p>
      {rows.map((_, index) => {
        const base = `/performance/${index}`;
        return (
          <LayerCard key={index} render={<fieldset />} className="mb-5" data-row={index}>
            <LayerCard.Secondary className="flex flex-wrap items-center justify-between gap-2">
              <legend className="float-left font-semibold">Season record {index + 1}</legend>
              <div className="flex flex-wrap items-center gap-2">
                <SourceControl builder={builder} pointer={base} />
                <Button size="sm" variant="secondary-destructive" icon={<TrashIcon />} onClick={() => builder.set(base, undefined)}>
                  Remove this season
                </Button>
              </div>
            </LayerCard.Secondary>
            <LayerCard.Primary className="p-4">
            <TextField builder={builder} pointer={`${base}/season`} label="Season" hint="2025/26, or 2026 for a league that plays in one calendar year." />
            <TextField builder={builder} pointer={`${base}/competition`} label="Competition" />
            <CountryField builder={builder} pointer={`${base}/competition_country`} label="Competition country" />
            <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
              <NumberField builder={builder} pointer={`${base}/appearances`} label="Appearances" />
              <NumberField builder={builder} pointer={`${base}/minutes`} label="Minutes" />
              <NumberField builder={builder} pointer={`${base}/goals`} label="Goals" />
              <NumberField builder={builder} pointer={`${base}/assists`} label="Assists" />
              <NumberField
                builder={builder}
                pointer={`${base}/clean_sheets`}
                label="Clean sheets"
                hint="Appearances with no goals conceded while the player was on the pitch."
              />
            </div>
            </LayerCard.Primary>
          </LayerCard>
        );
      })}
      <Button icon={<PlusIcon />} onClick={() => builder.set(`/performance/${rows.length}`, { season: "" })}>
        Add a season
      </Button>
    </>
  );
}

function MediaFields({ builder }: { builder: Builder }) {
  const rows = (builder.get("/media") as unknown[] | undefined) ?? [];

  return (
    <>
      <p className="mb-4 text-sm text-kumo-subtle">
        Add a link to each video of the player. Clubs do not assess a player without video. Use a link that the club can open.
      </p>
      {rows.map((_, index) => {
        const base = `/media/${index}`;
        return (
          <LayerCard key={index} render={<fieldset />} className="mb-5" data-row={index}>
            <LayerCard.Secondary className="flex flex-wrap items-center justify-between gap-2">
              <legend className="float-left font-semibold">Video {index + 1}</legend>
              <div className="flex flex-wrap items-center gap-2">
                <SourceControl builder={builder} pointer={base} />
                <Button size="sm" variant="secondary-destructive" icon={<TrashIcon />} onClick={() => builder.set(base, undefined)}>
                  Remove this video
                </Button>
              </div>
            </LayerCard.Secondary>
            <LayerCard.Primary className="p-4">
              <SelectField
                builder={builder}
                pointer={`${base}/video_type`}
                label="Type of video"
                options={{
                  highlights: "Highlights: selected actions from one or more matches",
                  full_match: "Full match",
                }}
              />
              <TextField builder={builder} pointer={`${base}/url`} label="Link" hint="The full link, starting with https://." placeholder="https://" />
            </LayerCard.Primary>
          </LayerCard>
        );
      })}
      {/* FPDS 0.1 has one media type, so the builder sets it. */}
      <Button icon={<PlusIcon />} onClick={() => builder.set(`/media/${rows.length}`, { type: "video" })}>
        Add a video
      </Button>
    </>
  );
}
