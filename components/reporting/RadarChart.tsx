"use client";

import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart as RechartsRadarChart,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { RadarConfigModal } from "./RadarConfigModal";
import { DashboardConfiguration, RadarChartData } from "@/lib/supabase/types";

interface RadarChartProps {
  rfpId: string;
  configId: string;
  onConfigUpdate?: () => void;
}

const chartConfig = {
  value: {
    label: "Score",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function RadarChart({
  rfpId,
  configId,
  onConfigUpdate,
}: RadarChartProps) {
  const [data, setData] = useState<RadarChartData | null>(null);
  const [config, setConfig] = useState<DashboardConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch configuration
        const configResponse = await fetch(
          `/api/rfps/${rfpId}/dashboard-configs/${configId}`
        );
        if (!configResponse.ok) {
          throw new Error("Failed to fetch configuration");
        }
        const configData = await configResponse.json();
        setConfig(configData.config);

        // Fetch chart data
        const dataResponse = await fetch(
          `/api/rfps/${rfpId}/dashboard-configs/${configId}/data`
        );
        if (!dataResponse.ok) {
          throw new Error("Failed to fetch chart data");
        }
        const chartData = await dataResponse.json();
        console.log("Radar chart data received:", chartData);
        setData(chartData);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error("Error loading radar chart:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [rfpId, configId]);

  const handleConfigUpdate = async () => {
    setShowModal(false);
    // Refresh the data
    const dataResponse = await fetch(
      `/api/rfps/${rfpId}/dashboard-configs/${configId}/data`
    );
    if (dataResponse.ok) {
      const chartData = await dataResponse.json();
      setData(chartData);
    }
    onConfigUpdate?.();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading radar chart...</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading configuration...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Error loading radar chart</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!config || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No data available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configuration or data not found
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>{config.name}</CardTitle>
          {data.supplierName && (
            <CardDescription>Supplier: {data.supplierName}</CardDescription>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowModal(true)}
          title="Configure radar chart"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pb-0">
        {data.data.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[400px]"
          >
            <RechartsRadarChart
              data={data.data}
              margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
            >
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <PolarAngleAxis dataKey="axis" />
              <PolarGrid />
              <Radar
                name="Score"
                dataKey="value"
                stroke="var(--color-value)"
                fill="var(--color-value)"
                fillOpacity={0.5}
                isAnimationActive={true}
              />
            </RechartsRadarChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-muted-foreground">
              No data available for the selected tags
            </p>
          </div>
        )}
      </CardContent>

      {showModal && (
        <RadarConfigModal
          open={showModal}
          onOpenChange={setShowModal}
          rfpId={rfpId}
          configId={configId}
          initialConfig={config}
          onSuccess={handleConfigUpdate}
        />
      )}
    </Card>
  );
}
