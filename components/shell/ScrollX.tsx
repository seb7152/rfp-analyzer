"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontal scroll container that says so: a hairline shadow on the edge
 * that still has content, and a short hint on narrow screens.
 */
export function ScrollX({
  children,
  hint,
  className,
}: {
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setEdges({
        left: el.scrollLeft > 2,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [children]);

  return (
    <div className={cn("relative", className)}>
      <div ref={ref} className="overflow-x-auto">
        {children}
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-3 border-l border-border bg-gradient-to-r from-background to-transparent transition-opacity duration-150",
          edges.left ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-3 border-r border-border bg-gradient-to-l from-background to-transparent transition-opacity duration-150",
          edges.right ? "opacity-100" : "opacity-0"
        )}
      />
      {hint && edges.right && (
        <p className="mt-1 text-2xs text-muted-foreground md:hidden" role="note">
          {hint}
        </p>
      )}
    </div>
  );
}
