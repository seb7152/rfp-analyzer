"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface GlobalProgressCardProps {
  completionPercentage: number;
  totalRequirements: number;
  evaluatedRequirements: number;
  statusDistribution: {
    pass: number;
    partial: number;
    fail: number;
    pending: number;
  };
  averageScores: Record<string, number>;
}

export function GlobalProgressCard({
  completionPercentage,
  totalRequirements,
  evaluatedRequirements,
  statusDistribution,
  averageScores,
}: GlobalProgressCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Avancement Global</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Completion Circle */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
              <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {completionPercentage}%
                </span>
              </div>
            </div>
            <div className="absolute inset-0 w-32 h-32 rounded-full border-8 border-blue-200 dark:border-blue-800"></div>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Exigences Totales
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {totalRequirements}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Évaluées
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {evaluatedRequirements}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Score Moyen
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {Object.values(averageScores).length > 0
                ? Math.round(
                    Object.values(averageScores).reduce((a, b) => a + b, 0) /
                      Object.values(averageScores).length
                  )
                : 0}
              /5
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Fournisseurs
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {Object.keys(averageScores).length}
            </p>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Validé
            </p>
            <Progress value={statusDistribution.pass} className="w-full h-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {statusDistribution.pass}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Partiel
            </p>
            <Progress
              value={statusDistribution.partial}
              className="w-full h-2"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {statusDistribution.partial}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Échoué
            </p>
            <Progress value={statusDistribution.fail} className="w-full h-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {statusDistribution.fail}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              En attente
            </p>
            <Progress
              value={statusDistribution.pending}
              className="w-full h-2"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {statusDistribution.pending}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
