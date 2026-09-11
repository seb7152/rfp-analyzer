"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useOrganization } from "@/hooks/use-organization";
import { useRFPs } from "@/hooks/use-rfps";
import { useConsultationsOverview } from "@/hooks/use-consultations-overview";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreateRFPDialog } from "@/components/CreateRFPDialog";
import { PageState } from "@/components/shell/PageState";
import { TodayPanel } from "@/components/home/TodayPanel";
import { ConsultationCard } from "@/components/home/ConsultationCard";
import { ActivityPanel } from "@/components/home/ActivityPanel";
import { CommandPalette } from "@/components/home/CommandPalette";
import type { RFP } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "in_progress" | "completed" | "archived";

/**
 * The single home: what needs the pilot today, then the organisation's
 * consultations as cards (phase, progress per supplier, people, activity).
 */
export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { currentOrg, isAdmin, isMember } = useOrganization();
  const { rfps, isLoading: rfpsLoading, error, refetch } = useRFPs();
  const overview = useConsultationsOverview(rfps);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [pendingDelete, setPendingDelete] = useState<RFP | null>(null);

  const counts = useMemo(() => {
    const c = { all: rfps.length, in_progress: 0, completed: 0, archived: 0 };
    for (const r of rfps) if (r.status in c) c[r.status as keyof typeof c]++;
    return c;
  }, [rfps]);

  const visible = useMemo(
    () =>
      overview
        .filter((o) => filter === "all" || o.rfp.status === filter)
        .sort((a, b) => (a.rfp.created_at < b.rfp.created_at ? 1 : -1)),
    [overview, filter]
  );

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
  const filters: Array<{ id: StatusFilter; label: string }> = [
    { id: "all", label: "Toutes" },
    { id: "in_progress", label: "En cours" },
    { id: "completed", label: "Terminées" },
    { id: "archived", label: "Archivées" },
  ];

  const deleteRfp = async (rfp: RFP) => {
    const response = await fetch(`/api/rfps/${rfp.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error || "La consultation n'a pas pu être supprimée.");
      return;
    }
    toast.success("Consultation supprimée.");
    refetch();
  };

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 py-5 md:px-8 md:py-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-semibold leading-7 tracking-[-0.01em]">Consultations</h1>
        <CommandPalette rfps={rfps} />
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
          action={<Button variant="outline" onClick={() => refetch()}>Réessayer</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-5">
            <TodayPanel items={overview} />

            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-semibold">
                <span className="num">{counts.all}</span> {counts.all > 1 ? "consultations" : "consultation"}
              </span>
              <div role="tablist" aria-label="Filtrer par statut" className="inline-flex overflow-hidden rounded-md border border-input text-xs">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    role="tab"
                    aria-selected={filter === f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "px-2.5 py-1 transition-colors duration-150",
                      filter === f.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {f.label} <span className="num text-muted-foreground">{counts[f.id]}</span>
                  </button>
                ))}
              </div>
            </div>

            {rfpsLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="panel h-28 animate-pulse" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <p className="panel px-4 py-8 text-sm text-muted-foreground">
                {rfps.length === 0 ? "Aucune consultation dans cette organisation." : "Aucune consultation avec ce statut."}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {visible.map((item) => (
                  <ConsultationCard key={item.rfp.id} item={item} canDelete={isAdmin} onDelete={() => setPendingDelete(item.rfp)} />
                ))}
              </div>
            )}
          </div>
          <ActivityPanel items={overview} />
        </div>
      )}

      {showCreate && (
        <CreateRFPDialog organizationId={currentOrg.id} onClose={() => setShowCreate(false)} onSuccess={() => refetch()} />
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la consultation</AlertDialogTitle>
            <AlertDialogDescription>
              « {pendingDelete?.title} » et l'ensemble de ses exigences, réponses et évaluations seront supprimés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (pendingDelete) await deleteRfp(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
