# site: working notes for Claude Code

This repository is the website at `https://fpds.football`. The specification is in `fpds-football/spec`, checked out at `../spec`. The validation library is `fpds-football/fpds-ts`, published as `@fpds-football/fpds`.

## Hard rules

- **Do not serve `/schema/*` from this site.** The `spec` Worker serves it through a Cloudflare route. The prerender filter excludes it.
- **Player data never goes to a server** (DECISIONS.md D-33 to D-37 in the spec repository). The builder and the viewer run only in the browser. Do not add a server function, an API route, analytics or a third-party script to those pages.
- **Do not weaken the Content Security Policy.** Do not add `'unsafe-inline'` or `'unsafe-eval'`. If a new inline script is necessary, the build hashes it. `connect-src` stays `'self'`.
- **Do not put rules about FPDS documents in this repository.** Use `getFieldStates`, `validate` and `prepareDocument` from `@fpds-football/fpds`.
- **The specification is the authority.** If the site and `SPEC.md` disagree, tell the user.

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
