"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { ImportWorkspace } from "@/components/import/ImportWorkspace";
import { PageState } from "@/components/shell/PageState";

/** Chapitre 1 · Import : les quatre jeux de données et leur lecture. */
export default function ImportPage() {
  const params = useParams();
  const rfpId = params.rfpId as string;
  return (
    <Suspense fallback={<PageState kind="loading" title="Chargement des jeux de données" />}>
      <ImportWorkspace rfpId={rfpId} />
    </Suspense>
  );
}
