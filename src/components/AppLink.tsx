import { type LinkComponentProps, LinkProvider } from "@cloudflare/kumo";
import { Link as RouterLink } from "@tanstack/react-router";
import { forwardRef, type ReactNode } from "react";

/**
 * Kumo links use TanStack Router for pages on this site, so navigation does not reload the page.
 * External links, and /schema/*, which the spec Worker serves, use a normal anchor.
 */
const AppLink = forwardRef<HTMLAnchorElement, LinkComponentProps>(({ href = "", to: _to, ...rest }, ref) => {
  const internalPage = href.startsWith("/") && !href.startsWith("/schema/") && !href.startsWith("//");
  if (internalPage) {
    return <RouterLink ref={ref} to={href} {...rest} />;
  }
  return <a ref={ref} href={href} {...rest} />;
});
AppLink.displayName = "AppLink";

export function AppLinkProvider({ children }: { children: ReactNode }) {
  return <LinkProvider component={AppLink}>{children}</LinkProvider>;
}
