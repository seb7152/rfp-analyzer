"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useRequirement } from "@/hooks/use-requirements";
import { Sidebar } from "@/components/Sidebar";
import { RequirementHeader } from "@/components/RequirementHeader";
import { RequirementDetails } from "@/components/RequirementDetails";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Loader2 } from "lucide-react";

interface EvaluatePageProps {
  params: {
    rfpId: string;
  };
}

export default function EvaluatePage({ params }: EvaluatePageProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [selectedRequirementId, setSelectedRequirementId] = useState<
    string | null
  >(null);

  const {
    requirement: selectedRequirement,
    breadcrumb,
    isLoading: selectedLoading,
  } = useRequirement(selectedRequirementId);

  // Redirect if not authenticated
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-50">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-slate-400 hover:text-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-50">
                RFP Evaluation
              </h1>
              <p className="text-sm text-slate-400">
                Navigate and evaluate requirements
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with Tree */}
        <div className="w-80 border-r border-slate-800 bg-slate-900">
          <Sidebar
            rfpId={params.rfpId}
            selectedRequirementId={selectedRequirementId}
            onSelectRequirement={setSelectedRequirementId}
          />
        </div>

        {/* Details Panel */}
        <div className="flex-1 overflow-auto">
          {!selectedRequirementId ? (
            <div className="flex h-full items-center justify-center">
              <Card className="border-slate-700 bg-slate-800 text-center">
                <div className="p-12">
                  <p className="text-lg text-slate-300">
                    Select a requirement from the left sidebar to view details
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Use search to find requirements by ID or title
                  </p>
                </div>
              </Card>
            </div>
          ) : (
            <div className="space-y-6 p-6">
              <RequirementHeader
                requirement={selectedRequirement || null}
                breadcrumb={breadcrumb || []}
                isComplete={false}
                isLoading={selectedLoading}
              />

              <RequirementDetails
                requirement={selectedRequirement || null}
                isLoading={selectedLoading}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
