"use client";

import { usePathname, useParams } from "next/navigation";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { RFPSwitcher } from "./RFPSwitcher";
import { VersionSwitcher } from "./VersionSwitcher";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function DashboardSwitcher() {
  const pathname = usePathname();
  const params = useParams();
  const isMobile = useIsMobile();

  // Check if we're on an RFP page
  const isRFPPage = pathname.startsWith("/dashboard/rfp/");
  const rfpId = params.rfpId as string | undefined;

  // Show RFP switcher with Version switcher if we're viewing an RFP
  if (isRFPPage && rfpId) {
    return (
      <div className={cn(
        "flex items-center",
        isMobile ? "gap-1" : "gap-3"
      )}>
        <RFPSwitcher />
        <VersionSwitcher />
      </div>
    );
  }

  // Otherwise show organization switcher
  return <OrganizationSwitcher />;
}
