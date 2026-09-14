export const SITE_URL = "https://fpds.football";
export const SPEC_URL = "https://github.com/fpds-football/spec/blob/main/SPEC.md";
export const DECISIONS_URL = "https://github.com/fpds-football/spec/blob/main/DECISIONS.md";

/** Head tags for a page, including Open Graph tags for link previews on LinkedIn and in messages. */
export function pageHead({ title, description, path }: { title: string; description: string; path: string }) {
  const url = `${SITE_URL}${path}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "FPDS" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
