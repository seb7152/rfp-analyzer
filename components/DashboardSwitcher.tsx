"use client";

import { usePathname, useParams } from "next/navigation";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { RFPSwitcher } from "./RFPSwitcher";
import { VersionSwitcher } from "./VersionSwitcher";

export function DashboardSwitcher() {
  const pathname = usePathname();
  const params = useParams();

  // Check if we're on an RFP page
  const isRFPPage = pathname.startsWith("/dashboard/rfp/");
  const rfpId = params.rfpId as string | undefined;

  // Show RFP switcher with Version switcher if we're viewing an RFP
  if (isRFPPage && rfpId) {
    return (
      <div className="flex items-center gap-3">
        <RFPSwitcher />
        <VersionSwitcher />
      </div>
    );
  }

  // Otherwise show organization switcher
  return <OrganizationSwitcher />;
}
