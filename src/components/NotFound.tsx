import { Link } from "@tanstack/react-router";
import { SiteHeader } from "./SiteHeader";

export function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="wrap prose-block">
        <h1 className="mt-12 mb-5 text-[2rem] font-bold tracking-[-0.02em]">This page does not exist.</h1>
        <p>
          Go to the <Link to="/">home page</Link>, or see the <Link to="/consult/">consultations</Link>.
        </p>
      </main>
    </>
  );
}
