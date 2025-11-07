"use client"

import React from "react"
import { CheckCircle2, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Requirement } from "@/lib/supabase/types"

interface RequirementHeaderProps {
  requirement: Requirement | null
  breadcrumb: Requirement[]
  isComplete: boolean
  isLoading?: boolean
}

export function RequirementHeader({
  requirement,
  breadcrumb,
  isComplete,
  isLoading = false,
}: RequirementHeaderProps) {
  if (isLoading || !requirement) {
    return (
      <div className="border-b border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3 animate-pulse" />
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-2/3 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="border-b border-slate-200 dark:border-slate-800 p-6 space-y-4">
      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 flex-wrap">
          {breadcrumb.map((item, index) => (
            <React.Fragment key={item.id}>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {item.requirement_id_external}
              </span>
              {index < breadcrumb.length - 1 && (
                <span className="text-slate-400">/</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Title with Completion Badge */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {requirement.requirement_id_external}
          </h1>
          <h2 className="text-xl text-slate-700 dark:text-slate-300 mt-2">
            {requirement.title}
          </h2>
        </div>

        {/* Completion Badge */}
        <Badge
          className={`flex-shrink-0 px-3 py-1.5 gap-2 text-sm font-medium ${
            isComplete
              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700"
              : "bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700"
          }`}
        >
          {isComplete ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete</span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4" />
              <span>In Progress</span>
            </>
          )}
        </Badge>
      </div>

      {/* Metadata */}
      {requirement.weight !== undefined && (
        <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
          <div>
            <span className="font-medium">Weight:</span>
            <span className="ml-2">{(requirement.weight * 100).toFixed(0)}%</span>
          </div>
          <div>
            <span className="font-medium">Level:</span>
            <span className="ml-2">{requirement.level}</span>
          </div>
        </div>
      )}
    </div>
  )
}
