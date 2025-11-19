"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadarChart } from "@/components/reporting/RadarChart";
import { CreateRadarConfigDialog } from "@/components/reporting/CreateRadarConfigDialog";
import { DashboardConfiguration } from "@/lib/supabase/types";

interface TestPageProps {
  params: {
    rfpId: string;
  };
}

export default function TestPage({ params }: TestPageProps) {
  const { rfpId } = params;
  const [configs, setConfigs] = useState<DashboardConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/rfps/${rfpId}/dashboard-configs?type=radar`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch configurations");
      }
      const data = await response.json();
      setConfigs(data.configs || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Error fetching configs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [rfpId]);

  const handleConfigCreated = () => {
    setShowCreateDialog(false);
    fetchConfigs();
  };

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Radar Chart Reporting</h1>
          <p className="text-muted-foreground mt-1">
            Test and configure radar chart dashboards
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Radar Config
        </Button>
      </div>

      {/* Create Dialog */}
      {showCreateDialog && (
        <CreateRadarConfigDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          rfpId={rfpId}
          onSuccess={handleConfigCreated}
        />
      )}

      {/* Configurations Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading radar charts...
        </div>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No radar configurations yet.{" "}
              <button
                onClick={() => setShowCreateDialog(true)}
                className="text-primary hover:underline"
              >
                Create one to get started
              </button>
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {configs.map((config) => (
            <RadarChart
              key={config.id}
              rfpId={rfpId}
              configId={config.id}
              onConfigUpdate={fetchConfigs}
            />
          ))}
        </div>
      )}
    </div>
  );
}
