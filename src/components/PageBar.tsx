'use client';

import Link from "next/link";

interface PageBarProps {
  breadcrumb: { label: string; href?: string }[];
  backHref?: string;
  backLabel?: string;
  right?: React.ReactNode;
}

export function PageBar({ breadcrumb, backHref, backLabel, right }: PageBarProps) {
  return (
    <div className="icbc-pagebar">
      <div className="icbc-pagebar-inner">
        <div className="flex items-center gap-6">
          {backHref && (
            <Link href={backHref} className="icbc-back">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter" />
              </svg>
              {backLabel || "返回"}
            </Link>
          )}
          <div className="icbc-breadcrumb flex items-center gap-2">
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-[var(--ink-4)]">/</span>}
                {b.href ? (
                  <Link href={b.href} className="hover:text-[var(--brand-red)]">{b.label}</Link>
                ) : (
                  <span className={i === breadcrumb.length - 1 ? "current" : ""}>{b.label}</span>
                )}
              </span>
            ))}
          </div>
        </div>
        {right}
      </div>
    </div>
  );
}

interface ContainerProps {
  children: React.ReactNode;
  size?: "default" | "narrow";
}

export function Container({ children, size = "default" }: ContainerProps) {
  return (
    <div
      className="mx-auto px-8 py-8"
      style={{ maxWidth: size === "narrow" ? "880px" : "1200px" }}
    >
      {children}
    </div>
  );
}