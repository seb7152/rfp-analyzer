"use client";

import { useState } from "react";
import { useVersion } from "@/contexts/VersionContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VersionsTabProps {
  rfpId: string;
}

export function VersionsTab({ rfpId }: VersionsTabProps) {
  const { versions, isLoading, refreshVersions } = useVersion();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [description, setDescription] = useState("");
  const [copyFromVersion, setCopyFromVersion] = useState<string | undefined>();
  const [inheritStatus, setInheritStatus] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateVersion = async () => {
    try {
      setError(null);
      setIsCreating(true);

      const response = await fetch(`/api/rfps/${rfpId}/versions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version_name: versionName,
          description: description || undefined,
          copy_from_version_id: copyFromVersion || undefined,
          inherit_supplier_status: inheritStatus,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create version");
      }

      await refreshVersions();
      setShowCreateDialog(false);
      setVersionName("");
      setDescription("");
      setCopyFromVersion(undefined);
      setInheritStatus(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Error creating version:", err);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Loading versions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Evaluation Versions</h2>
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Create Version
        </Button>
      </div>

      {/* Create Version Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Version</DialogTitle>
            <DialogDescription>
              Create a new evaluation version for progressive evaluation
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {/* Version Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Version Name</label>
              <Input
                placeholder="e.g., Version post-soutenance"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                disabled={isCreating}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Optional description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isCreating}
                rows={3}
              />
            </div>

            {/* Copy from Version */}
            {versions.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Copy from Version</label>
                <select
                  value={copyFromVersion || ""}
                  onChange={(e) =>
                    setCopyFromVersion(e.target.value || undefined)
                  }
                  disabled={isCreating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Start Fresh (No Copy)</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version_number}: {v.version_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Info Text */}
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-800">
                {copyFromVersion
                  ? "Responses from the selected version will be copied to this new version automatically."
                  : "Starting fresh - no responses will be copied."}
              </p>
            </div>

            {/* Inherit Supplier Status */}
            {copyFromVersion && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="inheritStatus"
                  checked={inheritStatus}
                  onChange={(e) => setInheritStatus(e.target.checked)}
                  disabled={isCreating}
                  className="rounded"
                />
                <label htmlFor="inheritStatus" className="text-sm">
                  Inherit supplier shortlist status from previous version
                </label>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateVersion}
                disabled={!versionName || isCreating}
              >
                {isCreating ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Versions List */}
      <div className="space-y-4">
        {versions.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">
                No versions yet. Create the first version to start evaluating.
              </p>
            </CardContent>
          </Card>
        ) : (
          versions.map((version) => (
            <Card key={version.id} className="border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">
                        v{version.version_number}: {version.version_name}
                      </CardTitle>
                      {version.is_active && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                    {version.description && (
                      <p className="text-sm text-gray-600">
                        {version.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-600">Active Suppliers</p>
                    <p className="text-lg font-semibold">
                      {version.active_suppliers_count || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-600">Removed</p>
                    <p className="text-lg font-semibold">
                      {version.removed_suppliers_count || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-600">Completion</p>
                    <p className="text-lg font-semibold">
                      {version.completion_percentage || 0}%
                    </p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="text-xs text-gray-500 space-y-1">
                  <p>
                    Created: {new Date(version.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
