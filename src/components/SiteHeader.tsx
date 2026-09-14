import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="border-b border-rule pt-8 pb-6">
      <div className="wrap">
        <p className="m-0 flex flex-wrap items-baseline gap-3.5 text-[1.4rem] font-semibold tracking-[-0.015em]">
          <Link to="/" className="text-inherit no-underline">
            FPDS
          </Link>
          <span className="text-base font-normal tracking-normal text-ink-soft">Football Player Data Standard</span>
        </p>
        {children ? <div className="mt-2.5 text-[0.94rem] text-ink-soft">{children}</div> : null}
      </div>
    </header>
  );
}
