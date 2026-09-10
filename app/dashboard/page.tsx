"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, Plus, Users, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useOrganization } from "@/hooks/use-organization";
import { useRFPs } from "@/hooks/use-rfps";
import { Button } from "@/components/ui/button";
import { ConsultationsTable } from "@/components/home/ConsultationsTable";
import { CreateRFPDialog } from "@/components/CreateRFPDialog";
import { PageState } from "@/components/shell/PageState";

/**
 * The single home: the organisation's consultations, and nothing that belongs
 * to a consultation's own chapters. Organisation administration lives at
 * /dashboard/organizations, access tokens at /dashboard/settings/tokens.
 */
export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { currentOrg, isAdmin, isMember } = useOrganization();
  const { rfps, isLoading: rfpsLoading, error, refetch } = useRFPs();
  const [showCreate, setShowCreate] = useState(false);
  const [copied, setCopied] = useState(false);

  if (authLoading) return null;
  if (!user || !currentOrg) {
    return (
      <PageState
        kind="empty"
        title="Aucune organisation"
        description="Rejoignez une organisation avec le code transmis par son administrateur."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/organizations">Organisations</Link>
          </Button>
        }
      />
    );
  }

  const canCreate = isAdmin || isMember;

  const copyCode = async () => {
    if (!currentOrg.organization_code) return;
    try {
      await navigator.clipboard.writeText(currentOrg.organization_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Le code n'a pas pu être copié.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-col gap-3 px-4 py-5 md:flex-row md:items-end md:justify-between md:px-6">
        <div>
          <h1 className="text-2xl font-semibold leading-7">{currentOrg.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>
              {isAdmin ? "Administrateur" : isMember ? "Membre" : "Lecteur"}
            </span>
            {isAdmin && currentOrg.organization_code && (
              <button
                type="button"
                onClick={copyCode}
                className="inline-flex items-center gap-1 hover:text-foreground"
                aria-label="Copier le code d'organisation"
              >
                Code {currentOrg.organization_code}
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-status-pass" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            {isAdmin && (
              <Link
                href="/dashboard/organizations"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <Users className="h-3.5 w-3.5" />
                Membres
              </Link>
            )}
            <Link
              href="/dashboard/settings/tokens"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Jetons d'accès
            </Link>
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle consultation
          </Button>
        )}
      </header>

      {error ? (
        <PageState
          kind="error"
          title="Les consultations n'ont pas pu être chargées"
          description={(error as Error).message}
          action={
            <Button variant="outline" onClick={() => refetch()}>
              Réessayer
            </Button>
          }
        />
      ) : (
        <ConsultationsTable
          rfps={rfps}
          isLoading={rfpsLoading}
          canDelete={isAdmin}
          onDelete={async (rfpId) => {
            const response = await fetch(`/api/rfps/${rfpId}`, { method: "DELETE" });
            if (!response.ok) {
              const body = await response.json().catch(() => ({}));
              toast.error(body.error || "La consultation n'a pas pu être supprimée.");
              return;
            }
            toast.success("Consultation supprimée.");
            refetch();
          }}
        />
      )}

      {showCreate && (
        <CreateRFPDialog
          organizationId={currentOrg.id}
          onClose={() => setShowCreate(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
