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
import { useAnalysisNotifications } from "@/hooks/use-analysis-notifications";

const STATUS_LABEL: Record<string, string> = {
  in_progress: "En cours",
  completed: "Terminée",
  archived: "Archivée",
};

/**
 * Shell of a consultation: the numbered table of contents on the left, the
 * async analysis strip on top, the chapter's content on the right. On mobile
 * the rail lives in a sheet behind a single button.
 */
export default function RfpLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const rfpId = params.rfpId as string;
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [railOpen, setRailOpen] = useState(false);
  const { preparation, chapters, analysis, isLoading } = useConsultation(rfpId);

  const title = preparation?.rfp.title ?? null;
  useAnalysisNotifications(analysis, title);
  const statusLine = preparation
    ? [
        STATUS_LABEL[preparation.rfp.status] ?? preparation.rfp.status,
        preparation.activeVersion
          ? `version ${preparation.activeVersion.version_number}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  const current =
    chapters.find(
      (c) =>
        pathname === c.href ||
        pathname.startsWith(`${c.href}/`) ||
        c.entries.some((e) => pathname === e.href || pathname.startsWith(`${e.href}/`))
    ) ?? null;

  // The evaluation workspace on mobile needs every pixel: no chapter row there.
  const compactMobile = isMobile && pathname.includes("/evaluate");

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col">
      <AnalysisStrip rfpId={rfpId} analysis={analysis} />
      <div className="flex flex-1">
        {!isMobile && (
          <aside className="sticky top-12 hidden h-[calc(100vh-3rem)] w-60 shrink-0 border-r border-border md:block">
            <ConsultationRail
              title={title}
              statusLine={statusLine}
              chapters={chapters}
              isLoading={isLoading}
            />
          </aside>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          {isMobile && !compactMobile && (
            <div className="flex h-10 items-center gap-2 border-b border-border bg-secondary/60 px-2">
              <Button
                variant="ghost"
                size="sm"
                mode="icon"
                aria-label="Ouvrir le sommaire"
                onClick={() => setRailOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <span className="min-w-0 truncate text-sm font-medium">
                {current
                  ? `${current.number !== null ? `${current.number}. ` : ""}${current.label}`
                  : (title ?? "")}
              </span>
            </div>
          )}
          {isMobile && (
            <Sheet open={railOpen} onOpenChange={setRailOpen}>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Sommaire</SheetTitle>
                <ConsultationRail
                  title={title}
                  statusLine={statusLine}
                  chapters={chapters}
                  isLoading={isLoading}
                  onNavigate={() => setRailOpen(false)}
                />
              </SheetContent>
            </Sheet>
          )}
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
