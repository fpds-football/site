import { Link } from "@cloudflare/kumo";

export function SiteFooter() {
  return (
    <footer className="mt-14 border-t print:hidden border-kumo-line pt-7 pb-12 text-sm text-kumo-subtle">
      <div className="wrap">
        <p className="mb-2">
          FPDS is an open standard. One person maintains it now, in public.{" "}
          <Link href="https://github.com/fpds-football/spec/blob/main/GOVERNANCE.md">Read how decisions are made</Link>.
        </p>
        <p className="mb-2">
          The schema uses Apache-2.0. The text on this site uses CC BY 4.0. The source is on{" "}
          <Link href="https://github.com/fpds-football/site">GitHub</Link>.
        </p>
      </div>
    </footer>
  );
}
