"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Menu } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useOrganization } from "@/hooks/use-organization";
import { useIsMobile } from "@/hooks/use-mobile";
import { VersionProvider } from "@/contexts/VersionContext";
import { OrgSidebar } from "@/components/shell/OrgSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

/**
 * Application frame. Outside a consultation: the organisation sidebar.
 * Inside one, the consultation layout brings its own rail.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useAuth();
  const { currentOrg } = useOrganization();
  const params = useParams();
  const isMobile = useIsMobile();
  const rfpId = typeof params?.rfpId === "string" ? params.rfpId : null;
  const [menuOpen, setMenuOpen] = useState(false);

  const content = isLoading ? (
    <div className="mx-auto max-w-5xl space-y-3 p-6" aria-busy="true">
      <div className="h-5 w-1/3 animate-pulse rounded-sm bg-muted" />
      <div className="h-4 w-2/3 animate-pulse rounded-sm bg-muted" />
      <div className="h-40 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  ) : (
    children
  );

  if (rfpId) {
    return (
      <VersionProvider rfpId={rfpId}>
        <div className="min-h-screen bg-background">{content}</div>
      </VersionProvider>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {!isMobile && (
        <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 border-r border-border md:block">
          <OrgSidebar />
        </aside>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {isMobile && (
          <div className="flex h-11 items-center gap-2 border-b border-border bg-rail px-2">
            <Button variant="ghost" size="sm" mode="icon" aria-label="Ouvrir le menu" onClick={() => setMenuOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
            <span className="truncate text-sm font-semibold">{currentOrg?.name ?? "RFP Analyzer"}</span>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <OrgSidebar onNavigate={() => setMenuOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        )}
        <main className="min-w-0 flex-1">{content}</main>
      </div>
    </div>
  );
}
