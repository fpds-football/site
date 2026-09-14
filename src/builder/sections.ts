export type SectionId = "submission" | "player" | "positions" | "contract" | "representation" | "performance" | "media" | "consent";

export interface SectionDefinition {
  id: SectionId;
  title: string;
  /** Pointers that belong to the section. A pointer belongs to the first section with a matching prefix. */
  prefixes: string[];
}

export const SECTIONS: SectionDefinition[] = [
  { id: "submission", title: "Submission", prefixes: ["/submission"] },
  { id: "player", title: "Player", prefixes: ["/player"] },
  { id: "positions", title: "Positions", prefixes: ["/positions"] },
  { id: "contract", title: "Contract", prefixes: ["/contract"] },
  { id: "representation", title: "Representation", prefixes: ["/representation"] },
  { id: "performance", title: "Performance", prefixes: ["/performance"] },
  { id: "media", title: "Video", prefixes: ["/media"] },
  { id: "consent", title: "Consent", prefixes: ["/consent"] },
];

export function sectionFor(pointer: string): SectionId | undefined {
  const target = pointer.startsWith("/provenance/") ? decodeProvenanceTarget(pointer) : pointer;
  return SECTIONS.find((section) =>
    section.prefixes.some((prefix) => target === prefix || target.startsWith(`${prefix}/`)),
  )?.id;
}

function decodeProvenanceTarget(pointer: string): string {
  const token = pointer.split("/")[2] ?? "";
  return token.replaceAll("~1", "/").replaceAll("~0", "~");
}
