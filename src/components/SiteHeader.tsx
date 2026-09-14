import { Link } from "@cloudflare/kumo";
import type { ReactNode } from "react";

export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="border-b border-kumo-line bg-kumo-base pt-7 pb-5">
      <div className="wrap">
        <p className="m-0 flex flex-wrap items-baseline gap-3 text-2xl font-semibold tracking-[-0.015em] text-kumo-strong">
          <Link href="/" variant="plain" className="text-kumo-strong">
            FPDS
          </Link>
          <span className="text-base font-normal tracking-normal text-kumo-subtle">Football Player Data Standard</span>
        </p>
        {children ? <div className="mt-2 text-sm text-kumo-subtle">{children}</div> : null}
      </div>
    </header>
  );
}
