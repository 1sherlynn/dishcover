"use client";

import Link from "next/link";

/* Small shared pieces used across screens. Components consume semantic
   tokens only (bg-surface, text-ink, rounded-card…) — never raw values. */

export function AppHeader() {
  return (
    <header className="rise mb-6 flex items-center justify-between">
      <Link href="/" aria-label="Dishcover home" className="flex items-baseline gap-0.5">
        <span className="font-display text-2xl font-semibold tracking-tight">
          Dishcover
        </span>
        <span aria-hidden className="h-2 w-2 translate-y-[-2px] rounded-full bg-accent" />
      </Link>
    </header>
  );
}

export function Chip({
  children,
  onClick,
  onRemove,
  selected,
  delay,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  onRemove?: () => void;
  selected?: boolean;
  delay?: number;
}) {
  return (
    <span
      className={`rise inline-flex items-center gap-1.5 rounded-control border px-4 py-2 text-sm font-semibold transition-colors ${
        selected
          ? "border-ink bg-ink text-bg"
          : "border-ink/15 bg-surface text-ink"
      }`}
      style={delay !== undefined ? ({ "--rise-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {onClick ? (
        <button type="button" onClick={onClick} className="flex items-center gap-1.5">
          <span aria-hidden className="text-ink-soft">+</span>
          {children}
        </button>
      ) : (
        children
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${typeof children === "string" ? children : "item"}`}
          className="-mr-1 grid h-5 w-5 place-items-center rounded-full text-ink-soft transition-colors hover:bg-surface-alt hover:text-highlight"
        >
          ×
        </button>
      )}
    </span>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-control bg-accent px-8 py-4 font-body text-lg font-bold text-accent-ink shadow-card transition-all enabled:hover:brightness-105 enabled:active:scale-[0.98] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function HeartButton({
  filled,
  onClick,
}: {
  filled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={filled ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={filled}
      className="grid h-10 w-10 place-items-center rounded-full bg-surface/80 backdrop-blur transition-transform active:scale-90"
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-5 w-5 transition-colors ${filled ? "fill-highlight stroke-highlight" : "fill-transparent stroke-ink-soft"}`}
        strokeWidth="2"
      >
        <path d="M12 21c-4.8-3.6-8-6.4-8-10a4.6 4.6 0 0 1 8-3.2A4.6 4.6 0 0 1 20 11c0 3.6-3.2 6.4-8 10z" />
      </svg>
    </button>
  );
}
