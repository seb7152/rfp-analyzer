"use client";

import { PageHeader } from "@/components/shell/PageHeader";
import { PageState } from "@/components/shell/PageState";
import { AiAssistSettings } from "@/components/agents/AiAssistSettings";
import { useOrganization } from "@/hooks/use-organization";

/** Organisation settings › Agents & IA › Assistance: dictation and rewriting. */
export default function AssistancePage() {
  const { currentOrg, isAdmin, isLoading } = useOrganization();
  if (isLoading) return <PageState kind="loading" title="Chargement des réglages" />;
  if (!currentOrg) return <PageState kind="empty" title="Aucune organisation" />;
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 pb-8">
      <PageHeader
        title="Assistance à la saisie"
        lead="La dictée et la remise en forme des commentaires et questions de l'évaluation. Modèles, prompts et vocabulaire valent pour toute l'organisation."
      />
      <div className="mx-4 md:mx-8">
        <AiAssistSettings organizationId={currentOrg.id} canEdit={isAdmin} />
      </div>
    </div>
  );
}
