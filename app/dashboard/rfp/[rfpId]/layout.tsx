import { ReactNode } from "react";
import { VersionProvider } from "@/contexts/VersionContext";

export default function RFPLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { rfpId: string };
}) {
  return <VersionProvider rfpId={params.rfpId}>{children}</VersionProvider>;
}
