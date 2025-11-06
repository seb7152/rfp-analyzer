"use client";

import { useAuth } from "@/hooks/use-auth";
import { useOrganization } from "@/hooks/use-organization";
import { Card } from "@/components/ui/card";

export default function DashboardPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Tableau de bord</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Bienvenue sur RFP Analyzer
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Informations utilisateur */}
        <div className="border rounded-lg p-6 bg-slate-50 dark:bg-slate-800">
          <h2 className="text-xl font-semibold mb-4">👤 Utilisateur</h2>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Nom</p>
              <p className="font-medium">{user?.full_name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Créé le
              </p>
              <p className="font-medium">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("fr-FR")
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Organisation actuelle */}
        <div className="border rounded-lg p-6 bg-slate-50 dark:bg-slate-800">
          <h2 className="text-xl font-semibold mb-4">
            🏢 Organisation actuelle
          </h2>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Nom</p>
              <p className="font-medium text-lg">{currentOrganization?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Slug</p>
              <p className="font-medium">{currentOrganization?.slug}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Rôle</p>
              <div className="flex gap-2 items-center">
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  {currentOrganization?.role === "admin"
                    ? "👑 Administrateur"
                    : currentOrganization?.role === "evaluator"
                      ? "📊 Évaluateur"
                      : "👁️ Lecteur"}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Limite d'utilisateurs
              </p>
              <p className="font-medium">
                {currentOrganization?.max_users} utilisateurs max
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Limite de RFP
              </p>
              <p className="font-medium">
                {currentOrganization?.max_rfps} RFP max
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Organisations disponibles */}
      <div className="border rounded-lg p-6 bg-slate-50 dark:bg-slate-800">
        <h2 className="text-xl font-semibold mb-4">
          📑 Organisations disponibles ({user?.organizations.length || 0})
        </h2>
        {user?.organizations && user.organizations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.organizations.map((org) => (
              <div
                key={org.id}
                className={`p-4 rounded-lg border-2 transition ${
                  org.id === currentOrganization?.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900"
                }`}
              >
                <h3 className="font-semibold">{org.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {org.slug}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                    {org.role}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {org.subscription_tier}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            Aucune organisation disponible
          </p>
        )}
      </div>

      {/* Instructions de test */}
      <div className="border border-yellow-400 bg-yellow-50 dark:bg-yellow-950 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-3">💡 Pour tester :</h2>
        <ul className="space-y-2 text-sm">
          <li>
            ✅ Cliquez sur le <strong>sélecteur d'organisation</strong> en haut
            à gauche pour changer d'organisation
          </li>
          <li>
            ✅ Cliquez sur l'icône <strong>soleil/lune</strong> en haut à droite
            pour changer le thème
          </li>
          <li>
            ✅ Cliquez sur l'icône <strong>utilisateur</strong> en haut à droite
            pour voir le menu et vous déconnecter
          </li>
          <li>
            ✅ Consultez{" "}
            <code className="bg-white dark:bg-slate-800 px-2 py-1 rounded text-xs">
              TEST_ORGANIZATIONS.md
            </code>{" "}
            pour le guide complet de test
          </li>
        </ul>
      </div>
    </div>
  );
}
