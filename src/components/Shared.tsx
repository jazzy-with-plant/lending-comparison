import type { DataMode, RiskStatus } from "../types";

export function ModeBadge({ mode }: { mode: DataMode }) {
  return <span className={`mode mode-${mode.toLowerCase()}`}>{mode}</span>;
}

export function StatusBadge({ status }: { status: RiskStatus }) {
  return <span className={`risk risk-${status.toLowerCase()}`}>{status}</span>;
}

export function SectionHeading({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <div className="section-heading"><div><span className="section-no">{number}</span><h2>{title}</h2></div><p>{copy}</p></div>;
}

export function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a className="source-link" href={href} target="_blank" rel="noreferrer">{children} ↗</a>;
}

export function formatPercent(value: number | null, digits = 2): string {
  return value === null || !Number.isFinite(value) ? "Unavailable" : `${(value * 100).toFixed(digits)}%`;
}

export function formatUsd(value: number | null, compact = true): string {
  if (value === null || !Number.isFinite(value)) return "Unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 2 : 0,
  }).format(value);
}

export function shortAddress(address: string): string {
  return address.length < 15 ? address : `${address.slice(0, 7)}…${address.slice(-5)}`;
}

export function formatDate(isoOrSeconds: string | number): string {
  const date = typeof isoOrSeconds === "number" ? new Date(isoOrSeconds * 1000) : new Date(isoOrSeconds);
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(date);
}
