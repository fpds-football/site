# fpds.football

The website of the [Football Player Data Standard (FPDS)](https://github.com/fpds-football/spec): the homepage, the consultations, the builder and the viewer for player profiles.

## What the site does

- **Homepage.** Explains FPDS and links to the specification, the schema and the consultations.
- **Consultations.** One page for each open consultation. Agents, clubs and players answer in a Tally form. `src/content/consultations.ts` contains each consultation as data.
- **Builder** at `/build/`. A person fills in a form and exports a file that ends with `.fpds.json`. The builder runs only in the browser. Player data never goes to a server.
- **Viewer** at `/view/`. A club opens a `.fpds.json` file and sees the player profile, the source of each value, and any problems with the file. The viewer runs only in the browser. The file never leaves the browser.

This repository does not serve the schema. `fpds-football/spec` serves `https://fpds.football/schema/*`, so the permanent schema URL does not depend on this site.

## Technology

- [TanStack Start](https://tanstack.com/start) with React. Content pages are prerendered to static HTML.
- [Kumo](https://github.com/cloudflare/kumo), Cloudflare's component library, with Tailwind CSS. Use Kumo semantic tokens (`bg-kumo-base`, `text-kumo-subtle`) and components, not raw colours.
- Cloudflare Workers.
- Playwright tests against the production build in the local Cloudflare runtime.

## How the builder works

- `src/builder/draft.ts` keeps the draft as a plain object, and changes it by JSON Pointer. The field states, issues and provenance from `@fpds-football/fpds` use JSON Pointers too.
- `src/builder/useBuilder.ts` gets the state of each field, the conflicts and the export result from `@fpds-football/fpds`. The builder contains no FPDS rules of its own.
- `src/builder/export.ts` removes empty values and values that do not apply, removes provenance for missing values, and calls `prepareDocument`. Each export makes a new submission ID.
- `src/builder/storage.ts` saves work in session storage, which the browser deletes when the tab closes. It also reads and writes draft files that end with `.fpds-draft.json`.
- `src/components/SubmissionView.tsx` shows a submission as a club sees it, with the source of each value. The viewer uses it too.

`tests/builder.spec.ts` exports real files and validates them with `@fpds-football/fpds`. It also makes sure that the builder sends no request except for static files from this site.

## How the viewer works

- `src/viewer/openFile.ts` sorts a file into one of four results: a document, a draft, an unsupported version, or a refusal (not JSON, or not FPDS). It uses `readOpenedFile` from the builder and `validate` from `@fpds-football/fpds`.
- `src/viewer/Viewer.tsx` shows the result (DECISIONS.md D-37 in the spec repository):
  - A document with errors shows under a red "Not a valid FPDS submission" banner, with the messages from the library. Warnings show in a separate banner and do not make the file invalid.
  - Each problem also shows at its place in the card. A missing value shows as "Not in the file". `anchorFor` in `SubmissionView` gives the place, and each problem in a banner is a link to it.
  - "Open an example" shows a copy of an example from the spec repository. The example is part of the page script, so it sends no request.
  - If `is_minor` does not agree with the date of birth, the card shows the value in the file and the calculated value, with the age from `calculated.age`. The minor badge shows if the file or the date of birth says that the player is a minor.
  - Extensions show in a closed section, grouped by prefix, without source marks.
  - A draft file, an unsupported version and a file that is not FPDS show no fields.
- "Edit in builder" writes the document to the session storage of the builder, without `fpds_version`, `submission_id`, `submitted_at` and `consent.is_minor`. The export from the builder then has a new submission ID. If the builder already has work in the tab, the viewer asks first.
- "Print or save as PDF" uses the print styles in `src/styles/app.css` and `print:` utilities. Controls do not print. Source badges keep their colours and get a solid border (checked source) or a dashed border (stated source).
- The page never shows a badge such as "Verified by FPDS". Each submission has the note "FPDS checks the structure of this file. It does not check that the information is true."

`tests/viewer.spec.ts` opens the fixtures in `tests/fixtures/` and checks each result. It also checks that opening a file sends no request except for static files from this site, and that the page causes no Content Security Policy violation.

## Security headers

`scripts/csp-headers.mjs` runs after `vite build`. It writes `dist/client/_headers` with a Content Security Policy for each prerendered page. The policy permits the inline scripts of that page by SHA-256 hash, and no other inline script. It permits network requests only to this site, and frames only from Tally.

`src/server.ts` wraps the TanStack Start handler. The Worker runs only when no static file matches. It returns 404 at once for a path with a file extension, and it adds basic security headers to its own responses, because Cloudflare applies `_headers` only to static files.

A browser hashes script text after HTML parsing. The parser changes each NUL character to U+FFFD, and TanStack Start puts NUL characters in its hydration script. The script hashes the text in the same way.

## Development

```bash
pnpm install
```

```bash
pnpm dev
```

```bash
pnpm build
```

```bash
pnpm test:e2e
```

`pnpm test:e2e` needs a build first. It starts `vite preview`, which runs the build in the local Cloudflare runtime.

## Deployment

Each page has a `<meta name="fpds-version">` tag with the commit that built it. To see which commit is live:

```bash
curl -s https://fpds.football/ | grep -o 'fpds-version" content="[^"]*'
```


The site deploys with Cloudflare Workers Builds.

1. In Cloudflare, go to **Workers & Pages** and create an application from the `fpds-football/site` repository.
2. Set the project name to `fpds-site`. This name must agree with `name` in `wrangler.jsonc`.
3. Set the build command to `pnpm build`.
4. Set the deploy command to `npx wrangler deploy`.
5. After the first deployment, make sure that the site works on its `workers.dev` URL.

### Move fpds.football to this site

If `fpds.football` is not attached to any Worker yet, do step 1, then step 4. Otherwise, do these steps in this order, so that the schema URL always works.

1. On the `spec` Worker, add a route: `fpds.football/schema/*`.
2. Make sure that `https://fpds.football/schema/v0.1/player.json` still returns the schema.
3. Remove the custom domain `fpds.football` from the `spec` Worker.
4. Add the custom domain `fpds.football` to the `fpds-site` Worker.
5. Make sure that the homepage comes from this site, and that the schema URL still returns the schema.

A route on a hostname has priority over a custom domain on the same hostname. For this reason, the `spec` Worker keeps `/schema/*` after `fpds.football` moves to this site.

## Licence

The code uses the Apache License 2.0. The text on the website uses CC BY 4.0. [`LICENSING.md`](LICENSING.md) gives the map.
