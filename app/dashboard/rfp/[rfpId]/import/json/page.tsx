"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PageState } from "@/components/shell/PageState";

/** L'ancien assistant par étapes ; son adresse mène désormais à l'atelier d'import. */
export default function JsonImportPage() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    const supplier = search.get("supplier");
    const query = new URLSearchParams();
    if (supplier) {
      query.set("dataset", "reponses");
      query.set("supplier", supplier);
    }
    const suffix = query.toString();
    router.replace(`/dashboard/rfp/${params.rfpId}/import${suffix ? `?${suffix}` : ""}`);
  }, [params.rfpId, router, search]);

  return <PageState kind="loading" title="Ouverture de l'atelier d'import" />;
}
