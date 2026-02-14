"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Eye, Trash2 } from "lucide-react";
import type { RFP } from "@/lib/supabase/types";
import { useRFPCompletion } from "@/hooks/use-completion";

function RFPProgressCell({ rfpId }: { rfpId: string }) {
  const { percentage, isLoading } = useRFPCompletion(rfpId);

  if (isLoading) {
    return <Skeleton className="h-4 w-24 bg-slate-200 dark:bg-slate-700" />;
  }

  return (
    <span className="text-sm font-medium tabular-nums text-slate-600 dark:text-slate-400">
      {percentage}%
    </span>
  );
}

interface RFPsTableProps {
  rfps: RFP[];
  isLoading: boolean;
  onDelete?: (rfpId: string) => Promise<void> | void;
}

export function RFPsTable({ rfps, isLoading, onDelete }: RFPsTableProps) {
  const router = useRouter();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; text: string }> = {
      in_progress: {
        bg: "bg-blue-100 dark:bg-blue-950",
        text: "text-blue-700 dark:text-blue-200",
      },
      completed: {
        bg: "bg-green-100 dark:bg-green-950",
        text: "text-green-700 dark:text-green-200",
      },
      archived: {
        bg: "bg-slate-200 dark:bg-slate-800",
        text: "text-slate-700 dark:text-slate-300",
      },
    };

    const variant = variants[status] || variants.in_progress;
    return (
      <Badge className={`${variant.bg} border-none ${variant.text}`}>
        {status === "in_progress" ? "In Progress" : status}
      </Badge>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <CardHeader>
          <CardTitle>RFPs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-12 bg-slate-200 dark:bg-slate-700"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (rfps.length === 0) {
    return (
      <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <CardHeader>
          <CardTitle>RFPs</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            No RFPs created yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-slate-400 dark:text-slate-600 mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              Create your first RFP to get started
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <CardHeader>
        <CardTitle>RFPs</CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">
          {rfps.length} RFP{rfps.length > 1 ? "s" : ""} in your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-700 dark:text-slate-300">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-600 dark:border-slate-700 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium">Avancement</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {rfps.map((rfp) => (
                <tr
                  key={rfp.id}
                  className="hover:bg-slate-100/50 transition-colors dark:hover:bg-slate-800/50 cursor-pointer"
                  onDoubleClick={() =>
                    router.push(`/dashboard/rfp/${rfp.id}/summary`)
                  }
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-50">
                        {rfp.title}
                      </p>
                      {rfp.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                          {rfp.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(rfp.status)}</td>
                  <td className="px-4 py-3 text-center">
                    <RFPProgressCell rfpId={rfp.id} />
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {formatDate(rfp.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/rfp/${rfp.id}/summary`);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-slate-800"
                        title="Consulter RFP"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete?.(rfp.id);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-slate-800"
                        title="Supprimer RFP"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
