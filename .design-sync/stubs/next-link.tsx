import * as React from "react";

// Stub for `next/link` used only by the design-sync bundle. The real next/link
// drags in Next's router runtime (references process.env.__NEXT_* at module
// load → "process is not defined" in a plain browser). Components in the DS use
// Link purely as an anchor, so a plain <a> is a faithful stand-in for previews
// and for the design agent's runtime.
type LinkProps = {
  href?: string | { pathname?: string };
  children?: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

export default function Link({ href, children, ...rest }: LinkProps) {
  const h = typeof href === "string" ? href : href?.pathname ?? "#";
  return (
    <a href={h} {...rest}>
      {children}
    </a>
  );
}
