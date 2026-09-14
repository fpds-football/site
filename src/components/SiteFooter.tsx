export function SiteFooter() {
  return (
    <footer className="mt-14 border-t border-rule pt-7 pb-12 text-[0.9rem] text-ink-soft">
      <div className="wrap">
        <p className="mb-2">
          FPDS is an open standard. One person maintains it now, in public.{" "}
          <a href="https://github.com/fpds-football/spec/blob/main/GOVERNANCE.md">Read how decisions are made</a>.
        </p>
        <p className="mb-2">
          The schema uses Apache-2.0. The text on this site uses CC BY 4.0. The source is on{" "}
          <a href="https://github.com/fpds-football/site">GitHub</a>.
        </p>
      </div>
    </footer>
  );
}
