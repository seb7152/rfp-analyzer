import { useVersion } from "@/contexts/VersionContext";
import { useSuppliersByVersion } from "@/hooks/use-suppliers-by-version";
import { PresentationReport } from "./PresentationReport";

export function PresentationReportWrapper({ rfpId }: { rfpId: string }) {
  const { activeVersion } = useVersion();
  const { suppliers, loading } = useSuppliersByVersion(
    rfpId,
    activeVersion?.id
  );

  if (loading) {
    return (
      <div className="h-64 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-2xl" />
    );
  }

  return (
    <PresentationReport
      rfpId={rfpId}
      suppliers={suppliers}
      versionId={activeVersion?.id}
    />
  );
}
