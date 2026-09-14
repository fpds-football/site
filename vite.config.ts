import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import { defineConfig } from "vite";

/** The commit of this build. Cloudflare Workers Builds sets WORKERS_CI_COMMIT_SHA. A local build asks git. */
function commit(): string {
  if (process.env.WORKERS_CI_COMMIT_SHA) return process.env.WORKERS_CI_COMMIT_SHA.slice(0, 7);
  try {
    return execSync("git rev-parse --short=7 HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

export default defineConfig({
  define: { __FPDS_SITE_VERSION__: JSON.stringify(commit()) },
  server: { port: 3000 },
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart({
      // Content pages are static HTML, so link previews work and public/_headers applies (DECISIONS.md D-33).
      prerender: {
        enabled: true,
        crawlLinks: true,
        autoSubfolderIndex: true,
        failOnError: true,
        // The spec repository serves /schema/*, not this site.
        filter: ({ path }) => !path.startsWith("/schema/"),
      },
    }),
    viteReact(),
  ],
});
