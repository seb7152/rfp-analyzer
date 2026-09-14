"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useConsultation } from "@/hooks/use-consultation";
import { PageState } from "@/components/shell/PageState";

/**
 * Opening a consultation without a chapter lands on the chapter matching the
 * dossier's progression for the user's role (viewer → decision, evaluator →
 * evaluation, owner → the first unfinished phase).
 */
export default function RfpIndexPage() {
  const params = useParams();
  const router = useRouter();
  const rfpId = params.rfpId as string;
  const { landing, error } = useConsultation(rfpId);

  useEffect(() => {
    if (landing) router.replace(landing);
  }, [landing, router]);

  if (error) {
    return (
      <PageState
        kind="error"
        title="Consultation inaccessible"
        description={error.message}
      />
    );
  }
  return <PageState kind="loading" title="Ouverture de la consultation" />;
}
