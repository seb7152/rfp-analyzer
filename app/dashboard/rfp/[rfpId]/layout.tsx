"use client";

import { useState, type ReactNode } from "react";
import { useParams, usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useConsultation } from "@/hooks/use-consultation";
import { ConsultationRail } from "@/components/shell/ConsultationRail";
import { AnalysisStrip } from "@/components/shell/AnalysisStrip";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCollapsed } from "@/hooks/use-collapsed";
import { useAnalysisNotifications } from "@/hooks/use-analysis-notifications";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  in_progress: "En cours",
  completed: "Terminée",
  archived: "Archivée",
};

/**
 * Shell of a consultation: the numbered table of contents on the left
 * (collapsible, `[`), the async analysis strip on top of the content, the
 * chapter's content. On mobile the rail lives in a sheet behind a button.
 */
export default function RfpLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const rfpId = params.rfpId as string;
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [railOpen, setRailOpen] = useState(false);
  const { collapsed, toggle } = useCollapsed("consultation-rail", "[");
  const { preparation, chapters, analysis, isLoading } = useConsultation(rfpId);

  const title = preparation?.rfp.title ?? null;
  useAnalysisNotifications(analysis, title);
  const statusLabel = preparation ? (STATUS_LABEL[preparation.rfp.status] ?? preparation.rfp.status) : null;

  const current =
    chapters.find(
      (c) =>
        pathname === c.href ||
        pathname.startsWith(`${c.href}/`) ||
        c.entries.some((e) => pathname === e.href || pathname.startsWith(`${e.href}/`))
    ) ?? null;

  const isWorkspace = pathname.includes("/evaluate");
  const compactMobile = isMobile && isWorkspace;

  return (
    <div className="flex min-h-screen">
      {!isMobile && (
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 border-r border-border transition-[width] duration-150 md:block",
            collapsed ? "w-14" : "w-[232px]"
          )}
        >
          <ConsultationRail
            rfpId={rfpId}
            title={title}
            statusLabel={statusLabel}
            chapters={chapters}
            isLoading={isLoading}
            collapsed={collapsed}
            onToggleCollapsed={toggle}
          />
        </aside>
      )}
      <div className={cn("flex min-w-0 flex-1 flex-col", isWorkspace && "h-screen")}>
        <AnalysisStrip rfpId={rfpId} analysis={analysis} />
        {isMobile && !compactMobile && (
          <div className="flex h-11 items-center gap-2 border-b border-border bg-rail px-2">
            <Button variant="ghost" size="sm" mode="icon" aria-label="Ouvrir le sommaire" onClick={() => setRailOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
            <span className="flex min-w-0 items-baseline gap-2 truncate text-sm font-medium">
              {current?.number !== null && current?.number !== undefined && (
                <span className="article-no">{current.number}</span>
              )}
              <span className="truncate">{current ? current.label : (title ?? "")}</span>
            </span>
          </div>
        )}
        {isMobile && (
          <Sheet open={railOpen} onOpenChange={setRailOpen}>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Sommaire</SheetTitle>
              <ConsultationRail
                rfpId={rfpId}
                title={title}
                statusLabel={statusLabel}
                chapters={chapters}
                isLoading={isLoading}
                onNavigate={() => setRailOpen(false)}
              />
            </SheetContent>
          </Sheet>
        )}
        <main className={cn("min-w-0 flex-1", isWorkspace && "flex min-h-0 flex-col overflow-hidden")}>{children}</main>
      </div>
    </div>
  );
}
