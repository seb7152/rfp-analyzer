"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { ConsultationSettings } from "@/components/parametres/ConsultationSettings";
import { AnalystsSettings } from "@/components/parametres/AnalystsSettings";
import { SuppliersSettings } from "@/components/parametres/SuppliersSettings";
import { VersionsSettings } from "@/components/parametres/VersionsSettings";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageState } from "@/components/shell/PageState";
import { useConsultation } from "@/hooks/use-consultation";
import { useOrganization } from "@/hooks/use-organization";
import { useVersion } from "@/contexts/VersionContext";

const SECTIONS = [
  { id: "consultation", label: "Consultation" },
  { id: "analystes", label: "Analystes" },
  { id: "fournisseurs", label: "Fournisseurs" },
  { id: "versions", label: "Versions" },
];

/**
 * One-shot configuration, apart from daily piloting: the consultation's
 * state and review mode, who works on it, which suppliers count in the
 * active version, and the versions themselves. Weights live with the
 * requirements (Référentiel › Vue arbre et poids); AI settings with the
 * organisation (Agents & IA).
 */
export default function ParametresPage() {
  const params = useParams();
  const rfpId = params.rfpId as string;
  const { preparation, access, isLoading } = useConsultation(rfpId);
  const { currentOrg } = useOrganization();
  const { activeVersion } = useVersion();

  if (isLoading) return <PageState kind="loading" title="Chargement des paramètres" />;
  if (!preparation) return null;
  const canEdit = access === "owner" || access === "admin";
  if (!canEdit) {
    return <PageState kind="empty" title="Réservé aux pilotes" description="Les paramètres de la consultation se règlent par son pilote ou un administrateur de l'organisation." />;
  }
  const organizationId = currentOrg?.id ?? "";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 pb-8">
      <PageHeader title="Paramètres" lead="Réglages structurants de la consultation. Ils se font une fois, puis se revisitent rarement.">
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
        <ConsultationSettings
          rfpId={rfpId}
          status={preparation.rfp.status}
          peerReviewEnabled={preparation.rfp.peer_review_enabled}
          organizationId={organizationId}
          canEdit={canEdit}
        />
      </section>

      <section id="analystes" className="panel mx-4 scroll-mt-4 px-4 py-4 md:mx-8 md:px-5">
        <h2 className="mb-3 text-base font-semibold">Analystes et accès</h2>
        <AnalystsSettings rfpId={rfpId} organizationId={organizationId} canEdit={canEdit} />
      </section>

      <section id="fournisseurs" className="panel mx-4 scroll-mt-4 px-4 py-4 md:mx-8 md:px-5">
        <h2 className="mb-3 text-base font-semibold">Fournisseurs de la version active</h2>
        <SuppliersSettings rfpId={rfpId} versionId={activeVersion?.id ?? null} versionName={activeVersion?.version_name ?? null} canEdit={canEdit} />
      </section>

      <section id="versions" className="panel mx-4 scroll-mt-4 px-4 py-4 md:mx-8 md:px-5">
        <h2 className="mb-3 text-base font-semibold">Versions d&apos;évaluation</h2>
        <VersionsSettings rfpId={rfpId} canEdit={canEdit} />
      </section>

      <p className="mx-4 text-xs text-muted-foreground md:mx-8">
        Les pondérations se règlent avec le référentiel :{" "}
        <Link href={`/dashboard/rfp/${rfpId}/tree-view`} className="inline-flex items-center gap-0.5 text-accent-foreground hover:underline underline-offset-2">
          Vue arbre et poids
          <ArrowUpRight className="h-3 w-3" />
        </Link>
        . Les agents et l&apos;assistance IA se règlent pour l&apos;organisation dans{" "}
        <Link href="/dashboard/agents" className="text-accent-foreground hover:underline underline-offset-2">
          Agents &amp; IA
        </Link>
        .
      </p>
    </div>
  );
}
