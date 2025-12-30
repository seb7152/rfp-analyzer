"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useOrganization } from "@/hooks/use-organization";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowUpRight,
  BarChart3,
  Copy,
  Check,
  FileText,
  Users,
  Zap,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { CreateRFPDialog } from "@/components/CreateRFPDialog";
import { RFPsTable } from "@/components/RFPsTable";
import { useRFPs } from "@/hooks/use-rfps";
import { useRFPCompletion } from "@/hooks/use-completion";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    currentOrg,
    currentOrgId,
    isAdmin,
    isMember,
    isLoading: orgLoading,
  } = useOrganization();
  const [copiedCode, setCopiedCode] = useState(false);
  const [showCreateRFP, setShowCreateRFP] = useState(false);
  const {
    rfps,
    isLoading: rfpsLoading,
    refetch: refetchRFPs,
  } = useRFPs(currentOrgId);

  // Find the most recent RFP in progress, or the most recent RFP overall
  const activeRFP =
    rfps?.find((rfp) => rfp.status === "in_progress") || rfps?.[0] || null;
  const { percentage: progressPercentage } = useRFPCompletion(
    activeRFP?.id || null
  );

  if (authLoading || orgLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user || !currentOrg) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="pt-6">
            <p className="text-yellow-800 dark:text-yellow-200">
              Erreur de chargement. Veuillez rafraîchir la page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const copyCode = () => {
    if (!currentOrg.organization_code) return;
    navigator.clipboard.writeText(currentOrg.organization_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const userInitials =
    user.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?";

  const kpis = [
    {
      icon: FileText,
      label: "Appels d'offres",
      value: String(rfps?.length || 0),
      hint: "Premiers dossiers en préparation",
      tone: "from-slate-100 to-white dark:from-slate-900 dark:to-slate-950",
    },
    {
      icon: Users,
      label: "Organisations",
      value: String(user.organizations?.length || 0),
      hint: "Espaces auxquels vous avez accès",
      tone: "from-zinc-100 to-white dark:from-slate-900 dark:to-slate-950",
      href: "/dashboard/organizations",
    },
    {
      icon: BarChart3,
      label: "Progression",
      value: `${Math.round(progressPercentage)}%`,
      hint: activeRFP
        ? `Avancement du RFP: ${activeRFP.title}`
        : "Aucun RFP en cours",
      tone: "from-neutral-100 to-white dark:from-slate-900 dark:to-slate-950",
    },
  ];

  const roleBadge = isAdmin
    ? { label: "Administrateur", icon: Shield }
    : isMember
      ? { label: "Membre", icon: Zap }
      : null;
  const RoleIcon = roleBadge?.icon;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                Dashboard
              </p>
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
                Bonjour {user.full_name?.split(" ")[0] || "là"},
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Surveillez vos organisations et préparez vos prochaines analyses
                RFP.
              </p>
            </div>
            {roleBadge && RoleIcon && (
              <Badge className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <RoleIcon className="h-3 w-3" />
                {roleBadge.label}
              </Badge>
            )}
          </div>

          <div className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 text-slate-900 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 dark:text-white lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 rounded-full border border-slate-200 dark:border-slate-800">
                <AvatarImage
                  src={user.avatar_url || undefined}
                  alt={user.full_name || "Utilisateur"}
                />
                <AvatarFallback className="bg-slate-200 text-base font-semibold text-slate-800 dark:bg-slate-800 dark:text-white">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Organisation active
                </p>
                <h2 className="text-2xl font-semibold">{currentOrg.name}</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Slug&nbsp;: {currentOrg.slug}
                </p>
              </div>
            </div>
            <div className="space-y-2 lg:max-w-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Code d'organisation
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <code className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-4 text-center text-xl font-semibold tracking-[0.4em] text-slate-900 shadow-inner dark:border-slate-800 dark:bg-slate-900/70 dark:text-white">
                  {currentOrg.organization_code ?? "—"}
                </code>
                <Button
                  variant="outline"
                  onClick={copyCode}
                  disabled={!currentOrg.organization_code}
                  className="gap-2 border-slate-200 text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-700 dark:text-white"
                >
                  {copiedCode ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copier
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Partagez ce code pour inviter de nouveaux collaborateurs.
              </p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {kpis.map((item) => {
            const Icon = item.icon;

            return (
              <Card
                key={item.label}
                className={`group overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b ${item.tone} p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800`}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      {item.label}
                    </p>
                    <p className="text-3xl font-semibold text-slate-900 dark:text-white">
                      {item.value}
                    </p>
                  </div>
                  <span className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                  {item.hint}
                </p>
                {item.label === "Appels d'offres" && isAdmin && (
                  <button
                    onClick={() => setShowCreateRFP(true)}
                    className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-slate-700 transition hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
                  >
                    Créer un RFP
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                )}
                {item.href && (
                  <Link
                    href={item.href}
                    className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-slate-700 transition hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
                  >
                    Accéder aux organisations
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                )}
              </Card>
            );
          })}
        </section>

        {/* RFPs Table */}
        <div className="mt-8">
          <RFPsTable
            rfps={rfps}
            isLoading={rfpsLoading}
            onDelete={async (rfpId) => {
              if (
                !confirm(
                  "Are you sure you want to delete this RFP? This action cannot be undone."
                )
              ) {
                return;
              }

              try {
                const response = await fetch(`/api/rfps/${rfpId}`, {
                  method: "DELETE",
                });

                if (!response.ok) {
                  const error = await response.json();
                  alert(`Failed to delete RFP: ${error.error}`);
                  return;
                }

                refetchRFPs();
              } catch (error) {
                console.error("Delete error:", error);
                alert("Failed to delete RFP. Please try again.");
              }
            }}
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex w-full gap-1 rounded-2xl border border-slate-200 bg-white/80 p-2 dark:border-slate-800 dark:bg-slate-900/60">
            <TabsTrigger
              value="overview"
              className="flex-1 rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:text-slate-400 dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900"
            >
              Aperçu
            </TabsTrigger>
            <TabsTrigger
              value="organization"
              className="flex-1 rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:text-slate-400 dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900"
            >
              Organisation
            </TabsTrigger>
            <TabsTrigger
              value="account"
              className="flex-1 rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:text-slate-400 dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900"
            >
              Compte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <CardHeader className="flex justify-between space-y-0">
                <div>
                  <CardTitle>Vue rapide</CardTitle>
                  <CardDescription>
                    Rassemblez votre équipe et préparez le prochain cycle
                    d&apos;analyse.
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Mode collaboratif
                </Badge>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Actions rapides
                  </p>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                      <span>Créer un nouveau RFP</span>
                      <ArrowUpRight className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                      <span>Inviter un membre</span>
                      <ArrowUpRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Roadmap
                  </p>
                  <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    {[
                      "Configurer vos gabarits d'évaluation",
                      "Planifier les réunions d'analyse",
                      "Centraliser les réponses fournisseurs",
                    ].map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white/70 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/40"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-900 dark:bg-white" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <CardHeader>
                  <CardTitle>État des espaces</CardTitle>
                  <CardDescription>
                    Une vision synthétique de vos organisations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                    <span>Espaces actifs</span>
                    <strong>{user.organizations?.length || 0}</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                    <span>Invitations en attente</span>
                    <strong>0</strong>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <CardHeader>
                  <CardTitle>Activité récente</CardTitle>
                  <CardDescription>
                    Derniers événements côté organisations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  {["Aucune création récente", "Aucune note publiée"].map(
                    (entry) => (
                      <div
                        key={entry}
                        className="rounded-xl border border-dashed border-slate-200 px-4 py-3 dark:border-slate-700"
                      >
                        {entry}
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="organization" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <CardHeader>
                  <CardTitle>Paramètres clés</CardTitle>
                  <CardDescription>Identifiants et plan actif.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-slate-500 dark:text-slate-400">Nom</p>
                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                      {currentOrg.name}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-500 dark:text-slate-400">Slug</p>
                    <code className="inline-flex rounded-xl bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {currentOrg.slug}
                    </code>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-500 dark:text-slate-400">Plan</p>
                    <Badge
                      variant="outline"
                      className="border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
                    >
                      {currentOrg.subscription_tier}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <CardHeader>
                  <CardTitle>Capacités</CardTitle>
                  <CardDescription>
                    Suivi des quotas disponibles.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  <div className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400">
                      Utilisateurs
                    </p>
                    <p className="text-lg font-semibold">
                      {currentOrg.max_users}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400">RFP</p>
                    <p className="text-lg font-semibold">
                      {currentOrg.max_rfps}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="account" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <CardHeader>
                  <CardTitle>Profil</CardTitle>
                  <CardDescription>
                    Vos informations personnelles.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <Avatar className="h-12 w-12 rounded-full border border-slate-200 dark:border-slate-700">
                      <AvatarImage
                        src={user.avatar_url || undefined}
                        alt={user.full_name || "Utilisateur"}
                      />
                      <AvatarFallback className="bg-slate-100 text-sm font-semibold text-slate-800 dark:bg-slate-800 dark:text-white">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Nom
                      </p>
                      <p className="text-base font-semibold text-slate-900 dark:text-white">
                        {user.full_name}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Email
                    </p>
                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                      {user.email}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <CardHeader>
                  <CardTitle>Vos organisations</CardTitle>
                  <CardDescription>
                    Rôles attribués selon les espaces.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {user.organizations?.length ? (
                    user.organizations.map((org) => (
                      <div
                        key={org.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700"
                      >
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {org.name}
                          </p>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                            Rôle
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="capitalize border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
                        >
                          {org.role}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      Vous ne faites partie d&apos;aucune organisation
                      supplémentaire.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create RFP Dialog */}
      {showCreateRFP && currentOrg && (
        <CreateRFPDialog
          organizationId={currentOrg.id}
          onClose={() => setShowCreateRFP(false)}
          onSuccess={() => {
            setShowCreateRFP(false);
            refetchRFPs();
          }}
        />
      )}
    </div>
  );
}
