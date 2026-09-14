import handler from "@tanstack/react-start/server-entry";

/**
 * The Worker runs only when no static file matches the request (prerendered pages and assets are static files).
 *
 * A path with a file extension, for example /something.json, is never a page. Return 404 at once.
 * Without this, the router adds a trailing slash and redirects to /something.json/ before the 404.
 */
const FILE_PATH = /\/[^/]+\.[a-z0-9]+$/i;

/** Headers for responses from the Worker. Cloudflare applies _headers only to static files. */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Frame-Options": "DENY",
};

export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (FILE_PATH.test(pathname)) {
      return new Response("Not found\n", {
        status: 404,
        headers: { ...SECURITY_HEADERS, "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const response = await handler.fetch(request);
    const secured = new Response(response.body, response);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      if (!secured.headers.has(name)) secured.headers.set(name, value);
    }
    return secured;
  },
};
