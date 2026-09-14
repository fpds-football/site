/// <reference types="vite/client" />
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppLinkProvider } from "~/components/AppLink";
import { SiteFooter } from "~/components/SiteFooter";
import appCss from "~/styles/app.css?url";

declare const __FPDS_SITE_VERSION__: string;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      // The commit that built this page, so anyone can see which version is live.
      { name: "fpds-version", content: __FPDS_SITE_VERSION__ },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
});

function RootComponent() {
  return (
    <AppLinkProvider>
      {/* Kumo portals its popups to the end of the body. "isolate" keeps them above this layout (Kumo installation guide). */}
      <div className="isolate">
        <Outlet />
        <SiteFooter />
      </div>
    </AppLinkProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" data-mode="light">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
