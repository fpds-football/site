import { Link } from "@cloudflare/kumo";
import { SiteHeader } from "./SiteHeader";

export function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="wrap prose-block">
        <h1 className="page-title mt-12">This page does not exist.</h1>
        <p>
          Go to the <Link href="/">home page</Link>, or see the <Link href="/consult/">consultations</Link>.
        </p>
      </main>
    </>
  );
}
