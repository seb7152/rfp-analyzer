"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Requirement } from "@/lib/supabase/types";

interface RequirementDetailsProps {
  requirement: Requirement | null;
  isLoading?: boolean;
  onOpenPDF?: (pageNumber?: number) => void;
}

export function RequirementDetails({
  requirement,
  isLoading = false,
  onOpenPDF,
}: RequirementDetailsProps) {
  const [contextExpanded, setContextExpanded] = useState(false);

  if (isLoading || !requirement) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-3">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-32 animate-pulse" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full animate-pulse" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full animate-pulse" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Description Section */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
          Description
        </h3>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {requirement.description ? (
            <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
              {requirement.description}
            </p>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 italic">
              No description available
            </p>
          )}
        </div>
      </div>

      {/* Context Section */}
      {requirement.context && (
        <div className="border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setContextExpanded(!contextExpanded)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Contexte du cahier des charges
            </h3>
            {contextExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            )}
          </button>

          {contextExpanded && (
            <div className="px-6 pb-4 space-y-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
                  {requirement.context}
                </p>
              </div>

              {(requirement.rf_document_id || (requirement.position_in_pdf as any)?.page_number) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const pageNumber = (requirement.position_in_pdf as any)?.page_number;
                    if (onOpenPDF) {
                      onOpenPDF(pageNumber);
                    }
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in PDF
                  {(requirement.position_in_pdf as any)?.page_number && (
                    <span className="text-xs ml-1 opacity-70">
                      (p. {(requirement.position_in_pdf as any).page_number})
                    </span>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Metadata Section */}
      <div className="p-6 bg-slate-50 dark:bg-slate-800/30">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wide">
          Metadata
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-slate-600 dark:text-slate-400">
              Requirement ID
            </dt>
            <dd className="text-slate-900 dark:text-white font-mono">
              {requirement.requirement_id_external}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600 dark:text-slate-400">
              Level
            </dt>
            <dd className="text-slate-900 dark:text-white">
              {requirement.level} of 4
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600 dark:text-slate-400">
              Weight
            </dt>
            <dd className="text-slate-900 dark:text-white">
              {(requirement.weight * 100).toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600 dark:text-slate-400">
              Created
            </dt>
            <dd className="text-slate-900 dark:text-white">
              {new Date(requirement.created_at).toLocaleDateString()}
            </dd>
          </div>
        </div>
      </div>
    </div>
  );
}
