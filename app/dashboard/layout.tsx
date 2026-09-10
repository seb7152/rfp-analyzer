"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { TopBar } from "@/components/shell/TopBar";
import { VersionProvider } from "@/contexts/VersionContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useAuth();
  const params = useParams();
  const rfpId = typeof params?.rfpId === "string" ? params.rfpId : null;

  const content = isLoading ? (
    <div className="mx-auto max-w-5xl space-y-3 p-6" aria-busy="true">
      <div className="h-5 w-1/3 animate-pulse rounded-sm bg-muted" />
      <div className="h-4 w-2/3 animate-pulse rounded-sm bg-muted" />
      <div className="h-40 w-full animate-pulse rounded-sm bg-muted" />
    </div>
  ) : (
    children
  );

  return (
    <>
      <TopBar />
      <div className="min-h-[calc(100vh-3rem)] bg-background">
        {rfpId ? (
          <VersionProvider rfpId={rfpId}>{content}</VersionProvider>
        ) : (
          content
        )}
      </div>
    </>
  );
}
