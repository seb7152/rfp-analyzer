"use client";

import { useTheme } from "next-themes";
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import { Toaster as Sonner } from "sonner";

/**
 * Notifications: a quiet card in the product's own colours, the kind of
 * event told by a small glyph on the left rather than by a coloured box.
 */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      position="bottom-right"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      closeButton
      duration={4500}
      gap={8}
      offset={20}
      icons={{
        success: <CheckCircle2 className="h-4 w-4 text-status-pass" />,
        error: <XCircle className="h-4 w-4 text-status-fail" />,
        warning: <AlertTriangle className="h-4 w-4 text-status-partial" />,
        info: <Info className="h-4 w-4 text-muted-foreground" />,
        loading: <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group flex w-full items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-card-foreground shadow-overlay " +
            "data-[type=error]:border-status-fail/30 data-[type=success]:border-status-pass/30",
          icon: "mt-px flex shrink-0 items-center",
          content: "flex min-w-0 flex-1 flex-col gap-0.5",
          title: "font-medium leading-5 text-foreground",
          description: "text-xs leading-4 text-muted-foreground",
          actionButton: "ml-2 shrink-0 self-center rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90",
          cancelButton: "ml-1 shrink-0 self-center rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted",
          closeButton:
            "absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground",
        },
      }}
    />
  );
}
