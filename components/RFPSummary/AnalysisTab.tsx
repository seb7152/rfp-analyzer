"use client";

import { Card } from "@/components/ui/card";

interface AnalysisTabProps {
  rfpId: string;
}

export function AnalysisTab({}: AnalysisTabProps) {
  return (
    <Card className="p-8 text-center">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Analyse</h3>
        <p className="text-muted-foreground">
          Cette fonctionnalité sera disponible prochainement.
        </p>
      </div>
    </Card>
  );
}
