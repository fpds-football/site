# fpds.football

The website of the [Football Player Data Standard (FPDS)](https://github.com/fpds-football/spec): the homepage, the consultations, and later the submission builder and viewer.

## What the site does

- **Homepage.** Explains FPDS and links to the specification, the schema and the consultations.
- **Consultations.** One page for each open consultation. Agents, clubs and players answer in a Tally form. `src/content/consultations.ts` contains each consultation as data.
- **Builder and viewer.** Not built yet. They will run only in the browser. Player data will never go to a server.

This repository does not serve the schema. `fpds-football/spec` serves `https://fpds.football/schema/*`, so the permanent schema URL does not depend on this site.

## Technology

- [TanStack Start](https://tanstack.com/start) with React. Content pages are prerendered to static HTML.
- Tailwind CSS.
- Cloudflare Workers.
- Playwright tests against the production build in the local Cloudflare runtime.

## Security headers

`scripts/csp-headers.mjs` runs after `vite build`. It writes `dist/client/_headers` with a Content Security Policy for each prerendered page. The policy permits the inline scripts of that page by SHA-256 hash, and no other inline script. It permits network requests only to this site, and frames only from Tally.

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
