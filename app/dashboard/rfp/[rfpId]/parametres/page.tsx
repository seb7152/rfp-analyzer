"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { WeightsTab } from "@/components/RFPSummary/WeightsTab";
import { AnalystsTab } from "@/components/RFPSummary/AnalystsTab";
import { SettingsTab } from "@/components/RFPSummary/SettingsTab";
import { VersionsTab } from "@/components/RFPSummary/VersionsTab";
import { SuppliersTab } from "@/components/RFPSummary/SuppliersTab";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageState } from "@/components/shell/PageState";
import { useConsultation } from "@/hooks/use-consultation";
import type { RFP } from "@/lib/supabase/types";

const SECTIONS = [
  { id: "consultation", label: "Consultation" },
  { id: "ponderations", label: "Pondérations" },
  { id: "analystes", label: "Analystes" },
  { id: "fournisseurs", label: "Fournisseurs" },
  { id: "versions", label: "Versions" },
];

/**
 * One-shot configuration, separated from daily piloting: status and peer
 * review, weights, analysts and their access, supplier shortlist, versions.
 */
export default function ParametresPage() {
  const params = useParams();
  const rfpId = params.rfpId as string;
  const { preparation, access, isLoading } = useConsultation(rfpId);
  const { data: rfp } = useQuery<RFP>({
    queryKey: ["rfp", rfpId],
    queryFn: async () => {
      const res = await fetch(`/api/rfps/${rfpId}`);
      if (!res.ok) throw new Error("Consultation introuvable");
      return res.json();
    },
    staleTime: 60_000,
  });

  if (isLoading) return <PageState kind="loading" title="Chargement des paramètres" />;
  if (!preparation) return null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 pb-8">
      <PageHeader
        title="Paramètres"
        lead="Réglages structurants de la consultation. Ils se font une fois, puis se revisitent rarement."
      >
        <nav aria-label="Sections" className="mt-3 flex flex-wrap gap-4 text-sm">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="text-muted-foreground hover:text-foreground">
              {s.label}
            </a>
          ))}
        </nav>
      </PageHeader>

      <section id="consultation" className="panel mx-4 scroll-mt-4 px-4 py-4 md:mx-8 md:px-5">
        <h2 className="mb-3 text-base font-semibold">Consultation</h2>
        {rfp && (
          <SettingsTab
            rfpId={rfpId}
            currentOrganizationId={rfp.organization_id}
            currentStatus={rfp.status}
            peerReviewEnabled={preparation.rfp.peer_review_enabled}
            userAccessLevel={access}
          />
        )}
      </section>

      <section id="ponderations" className="panel mx-4 scroll-mt-4 px-4 py-4 md:mx-8 md:px-5">
        <h2 className="mb-3 text-base font-semibold">Pondérations</h2>
        <WeightsTab rfpId={rfpId} />
      </section>

      <section id="analystes" className="panel mx-4 scroll-mt-4 px-4 py-4 md:mx-8 md:px-5">
        <h2 className="mb-3 text-base font-semibold">Analystes et accès</h2>
        <AnalystsTab rfpId={rfpId} />
      </section>

      <section id="fournisseurs" className="panel mx-4 scroll-mt-4 px-4 py-4 md:mx-8 md:px-5">
        <h2 className="mb-3 text-base font-semibold">Fournisseurs et shortlist</h2>
        <SuppliersTab rfpId={rfpId} />
      </section>

      <section id="versions" className="panel mx-4 scroll-mt-4 px-4 py-4 md:mx-8 md:px-5">
        <h2 className="mb-3 text-base font-semibold">Versions</h2>
        <VersionsTab rfpId={rfpId} />
      </section>
    </div>
  );
}
