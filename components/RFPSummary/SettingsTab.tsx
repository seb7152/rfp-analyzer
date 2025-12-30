"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Building2 } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  role: "admin" | "evaluator" | "viewer";
}

interface SettingsTabProps {
  rfpId: string;
  currentOrganizationId: string;
}

export function SettingsTab({
  rfpId,
  currentOrganizationId,
}: SettingsTabProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState(currentOrganizationId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch user's organizations
        const orgsResponse = await fetch("/api/organizations");
        if (!orgsResponse.ok) {
          throw new Error("Failed to fetch organizations");
        }

        const orgsData = await orgsResponse.json();
        // Filter to only admin organizations
        const adminOrgs = orgsData.organizations.filter(
          (org: Organization) => org.role === "admin"
        );
        setOrganizations(adminOrgs);

        // Find current organization
        const current = adminOrgs.find(
          (org: Organization) => org.id === currentOrganizationId
        );
        setCurrentOrg(current || null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Une erreur est survenue"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentOrganizationId]);

  const selectedOrg = organizations.find((org) => org.id === selectedOrgId);
  const hasChanges = selectedOrgId !== currentOrganizationId;

  const handleChangeOrganization = async () => {
    if (!selectedOrgId || selectedOrgId === currentOrganizationId) {
      return;
    }

    try {
      setIsChanging(true);
      setError(null);

      const response = await fetch(`/api/rfps/${rfpId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organization_id: selectedOrgId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error || "Erreur lors du changement d'organisation"
        );
      }

      await response.json();
      setCurrentOrg(selectedOrg || null);
      setShowConfirmation(false);

      // Show success message
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors du changement d'organisation"
      );
      // Reset selection on error
      setSelectedOrgId(currentOrganizationId);
    } finally {
      setIsChanging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-500">
          Chargement des paramètres...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-200 text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Card className="p-6">
        <div className="space-y-6">
          {/* Organization Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-slate-600" />
              <h3 className="font-semibold text-lg">Organisation</h3>
            </div>

            {currentOrg && (
              <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                <p className="text-sm text-muted-foreground">
                  Organisation actuelle
                </p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {currentOrg.name}
                </p>
              </div>
            )}

            {organizations.length > 1 && (
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  Changer d'organisation
                </label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une organisation" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                        {org.id === currentOrganizationId && " (actuelle)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasChanges && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Attention :</strong> Les accès des membres de
                      l'organisation actuelle seront réinitialisés lors du
                      changement d'organisation.
                    </p>
                  </div>
                )}

                <Button
                  onClick={() => setShowConfirmation(true)}
                  disabled={!hasChanges || isChanging}
                  className="w-full"
                >
                  {isChanging
                    ? "Changement en cours..."
                    : "Changer d'organisation"}
                </Button>
              </div>
            )}

            {organizations.length === 1 && (
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm">
                Vous n'êtes administrateur que d'une seule organisation. Aucun
                changement possible.
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmer le changement d'organisation
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir déplacer ce RFP de{" "}
              <strong>{currentOrg?.name}</strong> vers{" "}
              <strong>{selectedOrg?.name}</strong> ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 my-4">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              Cette action réinitialise les accès des membres de l'organisation
              actuelle. Les membres de la nouvelle organisation pourront être
              assignés après le changement.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleChangeOrganization}
              disabled={isChanging}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isChanging ? "Changement..." : "Confirmer"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
