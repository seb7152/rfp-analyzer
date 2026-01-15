"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Save,
  RotateCcw,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { WeightConfigurationTable } from "@/components/dashboard/WeightConfigurationTable";
import { useVersion } from "@/contexts/VersionContext";

interface DashboardData {
  rfp: { title: string };
  globalProgress: {
    completionPercentage: number;
    totalRequirements: number;
    evaluatedRequirements: number;
    statusDistribution: {
      pass: number;
      partial: number;
      fail: number;
      pending: number;
      roadmap: number;
    };
    averageScores: Record<string, number>;
  };
  suppliersAnalysis: {
    comparisonTable: Array<{
      supplierId: string;
      supplierName: string;
      totalScore: number;
      categoryScores: Record<string, number>;
      ranking: number;
    }>;
    performanceMatrix: {
      suppliers: string[];
      categories: string[];
      scores: number[][];
    };
    ranking: Array<{
      supplierId: string;
      supplierName: string;
      finalScore: number;
      ranking: number;
      variation: number;
    }>;
  };
  categoriesAnalysis: {
    categories: Array<{
      id: string;
      title: string;
      currentWeight: number;
      requirementCount: number;
      averageScore: number;
      completionRate: number;
    }>;
    requirementsByCategory: Record<
      string,
      Array<{
        id: string;
        title: string;
        currentWeight: number;
        averageScore: number;
        status: "pass" | "partial" | "fail" | "pending" | "roadmap";
      }>
    >;
  };
  weightsConfiguration: {
    categories: Array<{
      id: string;
      title: string;
      currentWeight: number;
      defaultWeight: number;
    }>;
    requirements: Array<{
      id: string;
      title: string;
      categoryId: string;
      currentWeight: number;
      defaultWeight: number;
    }>;
  };
}

export default function RFPSynthesisPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { activeVersion } = useVersion();
  const rfpId = params.rfpId as string;

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [_selectedSupplier, _setSelectedSupplier] = useState<string | null>(
    null
  );
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modifiedWeights, setModifiedWeights] = useState<{
    categories: Record<string, number>;
    requirements: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const url = `/api/rfps/${rfpId}/dashboard${activeVersion?.id ? `?versionId=${activeVersion.id}` : ""}`;
        const response = await fetch(url, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [rfpId, activeVersion?.id]);

  const handleWeightsChange = (weights: {
    categories: Record<string, number>;
    requirements: Record<string, number>;
  }) => {
    setModifiedWeights(weights);
  };

  // Handle authentication
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900 dark:text-slate-50" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900 dark:text-slate-50" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <h2 className="text-xl font-semibold">Erreur de chargement</h2>
              <p className="text-sm text-slate-500 text-center">
                Impossible de charger les données du dashboard. Vérifiez votre
                connexion et réessayez.
              </p>
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900 dark:text-slate-50" />
      </div>
    );
  }

  const {
    rfp,
    globalProgress,
    suppliersAnalysis,
    categoriesAnalysis,
    weightsConfiguration,
  } = dashboardData;

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ChevronLeft className="h-4 w-4" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                Synthèse {rfp.title}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Analyse comparative et configuration des poids
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => { }}>
              Réinitialiser les poids
            </Button>
            <Button
              size="sm"
              onClick={() => {
                /* Export logic */
              }}
            >
              Exporter
            </Button>
            <Button size="sm" onClick={() => window.location.reload()}>
              Actualiser
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-64 border-r border-slate-200 bg-white/50 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="p-4">
            <h3 className="font-semibold mb-4">Navigation</h3>
            <nav className="space-y-2">
              <Button
                variant={selectedCategory === null ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setSelectedCategory(null)}
              >
                Avancement Global
              </Button>
              <Button
                variant={
                  selectedCategory === "suppliers" ? "secondary" : "ghost"
                }
                className="w-full justify-start"
                onClick={() => setSelectedCategory("suppliers")}
              >
                Analyse Fournisseurs
              </Button>
              <Button
                variant={
                  selectedCategory === "categories" ? "secondary" : "ghost"
                }
                className="w-full justify-start"
                onClick={() => setSelectedCategory("categories")}
              >
                Analyse Catégories
              </Button>
              <Button
                variant={selectedCategory === "weights" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setSelectedCategory("weights")}
              >
                Configuration Poids
              </Button>
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Section Avancement Global */}
          <Card>
            <CardHeader>
              <CardTitle>Avancement Global</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Complétion: {globalProgress.completionPercentage}%</p>
              <p>Total exigences: {globalProgress.totalRequirements}</p>
              <p>Évaluées: {globalProgress.evaluatedRequirements}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-sm font-medium">Validé</p>
                  <Progress
                    value={globalProgress.statusDistribution.pass}
                    className="w-full h-2"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">Partiel</p>
                  <Progress
                    value={globalProgress.statusDistribution.partial}
                    className="w-full h-2"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">Échoué</p>
                  <Progress
                    value={globalProgress.statusDistribution.fail}
                    className="w-full h-2"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">En attente</p>
                  <Progress
                    value={globalProgress.statusDistribution.pending}
                    className="w-full h-2"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">Roadmap</p>
                  <Progress
                    value={globalProgress.statusDistribution.roadmap}
                    className="w-full h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section Fournisseurs */}
          {selectedCategory === "suppliers" || selectedCategory === null ? (
            <Card>
              <CardContent className="pt-6">
                <p>
                  Fournisseurs analysés:{" "}
                  {suppliersAnalysis.comparisonTable.length}
                </p>
                <p>
                  Meilleur score:{" "}
                  {Math.max(
                    ...suppliersAnalysis.comparisonTable.map(
                      (s) => s.totalScore
                    )
                  )}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {suppliersAnalysis.ranking
                    .slice(0, 3)
                    .map((supplier, _index) => (
                      <div
                        key={supplier.supplierId}
                        className="border p-3 rounded"
                      >
                        <p className="font-medium">{supplier.supplierName}</p>
                        <p className="text-sm text-slate-600">
                          Score: {supplier.finalScore.toFixed(1)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Classement: {supplier.ranking}
                        </p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Section Catégories */}
          {selectedCategory === "categories" || selectedCategory === null ? (
            <Card>
              <CardHeader>
                <CardTitle>Analyse par Catégories</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Catégories analysées: {categoriesAnalysis.categories.length}
                </p>
                <div className="space-y-2">
                  {categoriesAnalysis.categories.slice(0, 5).map((category) => (
                    <div
                      key={category.id}
                      className="flex justify-between items-center p-2 border rounded"
                    >
                      <span className="text-sm">{category.title}</span>
                      <span className="text-sm font-medium">
                        {category.averageScore.toFixed(1)}/5
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Section Configuration Poids */}
          {selectedCategory === "weights" ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Configuration des Poids</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Réinitialiser les poids aux valeurs par défaut
                        const defaultWeights = {
                          categories: weightsConfiguration.categories.reduce(
                            (acc, cat) => {
                              acc[cat.id] = cat.defaultWeight;
                              return acc;
                            },
                            {} as Record<string, number>
                          ),
                          requirements:
                            weightsConfiguration.requirements.reduce(
                              (acc, req) => {
                                acc[req.id] = req.defaultWeight;
                                return acc;
                              },
                              {} as Record<string, number>
                            ),
                        };
                        handleWeightsChange(defaultWeights);
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Réinitialiser
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!modifiedWeights) {
                          return;
                        }

                        try {
                          const response = await fetch(
                            `/api/rfps/${rfpId}/weights`,
                            {
                              method: "PUT",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify(modifiedWeights),
                            }
                          );

                          if (!response.ok) {
                            throw new Error("Failed to save weights");
                          }

                          // Rafraîchir les données après sauvegarde
                          window.location.reload();
                        } catch (error) {
                          console.error("Error saving weights:", error);
                          alert("Erreur lors de la sauvegarde des poids");
                        }
                      }}
                      disabled={!modifiedWeights}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Sauvegarder
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm text-slate-600 mb-2">
                    Configurez les poids pour les catégories et les exigences.
                    Les poids relatifs sont calculés automatiquement.
                  </p>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-100 rounded"></div>
                      <span>Catégories</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-grey-100 rounded"></div>
                      <span>Exigences</span>
                    </div>
                  </div>
                </div>
                <WeightConfigurationTable
                  categories={weightsConfiguration.categories}
                  requirements={weightsConfiguration.requirements}
                  onWeightsChange={handleWeightsChange}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
