# site: working notes for Claude Code

This repository is the website at `https://fpds.football`. The specification is in `fpds-football/spec`, checked out at `../spec`. The validation library is `fpds-football/fpds-ts`, published as `@fpds-football/fpds`.

## Hard rules

- **Do not serve `/schema/*` from this site.** The `spec` Worker serves it through a Cloudflare route. The prerender filter excludes it.
- **Player data never goes to a server** (DECISIONS.md D-33 to D-37 in the spec repository). The builder and the viewer run only in the browser. Do not add a server function, an API route, analytics or a third-party script to those pages.
- **Do not weaken the Content Security Policy.** Do not add `'unsafe-inline'` or `'unsafe-eval'`. If a new inline script is necessary, the build hashes it. `connect-src` stays `'self'`.
- **Do not put rules about FPDS documents in this repository.** Use `getFieldStates`, `validate` and `prepareDocument` from `@fpds-football/fpds`.
- **The specification is the authority.** If the site and `SPEC.md` disagree, tell the user.

## Builder

- The draft is a plain object that changes by JSON Pointer (`src/builder/draft.ts`). Do not add a form library that uses a different kind of path.
- Do not change a value that the user chose without their action. Show a conflict with a fix button.
- A value in a field that does not apply stays in the draft, but the export does not include it.
- Storage is session storage only. Do not use local storage or IndexedDB for player data.
- Test each new behaviour in `tests/builder.spec.ts`, and validate exported files with `@fpds-football/fpds`.

## Components

- Use Kumo components (`@cloudflare/kumo`) and Kumo semantic colour tokens. Do not use raw Tailwind colours or hex values.
- Import icons from `@phosphor-icons/react`. In components that render on the server, import from `@phosphor-icons/react/dist/ssr`.
- Kumo `Select` names its trigger from `label` only when `label` is a string. When `label` is a React node, also pass `aria-label`.
- Kumo renders a hidden native checkbox next to each checkbox. In tests, find checkboxes by role, not by label.
- The page tests fail on a Content Security Policy violation. Do not use a Kumo component that renders inline styles on the server.

## Content

- All text is Simple English (ASD-STE100, pragmatic mode), with British spelling. Use the `simple-english` skill. The homepage headline keeps its voice.
- Consultations are data in `src/content/consultations.ts`. A new consultation is a new entry and a small route file. Copy the option labels exactly into the Tally form.
- Each page sets its title, description and Open Graph tags with `pageHead`.
- Links use a trailing slash, for example `/consult/wages/`.

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm typecheck
pnpm test:e2e
```

Run `pnpm build` before `pnpm typecheck` and `pnpm test:e2e`. The build makes `src/routeTree.gen.ts` and `dist/client/_headers`.
