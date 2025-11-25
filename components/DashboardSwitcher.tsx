"use client";

import { usePathname, useParams } from "next/navigation";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { RFPSwitcher } from "./RFPSwitcher";

export function DashboardSwitcher() {
  const pathname = usePathname();
  const params = useParams();

  // Check if we're on an RFP page
  const isRFPPage = pathname.startsWith("/dashboard/rfp/");
  const rfpId = params.rfpId as string | undefined;

  // Show RFP switcher if we're viewing an RFP
  if (isRFPPage && rfpId) {
    return <RFPSwitcher />;
  }

  // Otherwise show organization switcher
  return <OrganizationSwitcher />;
}
