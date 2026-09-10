import type { ReactNode } from "react";
import { Loader2, AlertTriangle, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The one way an empty, loading or error state is rendered on the redesigned
 * screens: a quiet block with a title, a factual description, one action.
 */
export function PageState({
  kind,
  title,
  description,
  action,
  className,
}: {
  kind: "loading" | "empty" | "error";
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const Icon = kind === "loading" ? Loader2 : kind === "error" ? AlertTriangle : Inbox;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-busy={kind === "loading" || undefined}
      className={cn(
        "mx-auto flex max-w-md flex-col items-start gap-2 px-6 py-16",
        className
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5",
          kind === "loading" && "animate-spin text-primary",
          kind === "error" && "text-destructive",
          kind === "empty" && "text-muted-foreground"
        )}
      />
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
