"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { EvaluationWorkspace } from "@/components/evaluation/EvaluationWorkspace";
import { PageState } from "@/components/shell/PageState";

export default function EvaluatePage() {
  const params = useParams();
  const rfpId = params.rfpId as string;
  return (
    <Suspense fallback={<PageState kind="loading" title="Chargement de l'évaluation" />}>
      <EvaluationWorkspace rfpId={rfpId} />
    </Suspense>
  );
}
