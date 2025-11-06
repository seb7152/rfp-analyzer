"use client";

import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useAuth();

  return (
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
}
