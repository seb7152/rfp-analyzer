"use client";

import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/use-auth";
import { VersionProvider } from "@/contexts/VersionContext";
import { useParams } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useAuth();
  const params = useParams();
  const rfpId = params?.rfpId as string | undefined;

  // Wrap with VersionProvider if we're on an RFP page
  const content = (
    <>
      <Navbar />
      <main className="min-h-screen bg-white dark:bg-slate-950">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="space-y-4">
              <div className="h-12 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-12 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </>
  );

  // Only provide VersionContext when we're on an RFP page
  if (rfpId) {
    return <VersionProvider rfpId={rfpId}>{content}</VersionProvider>;
  }

  return content;
}
