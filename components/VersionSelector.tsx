"use client";

import { useVersion } from "@/contexts/VersionContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface VersionSelectorProps {
  rfpId: string;
}

export function VersionSelector({ rfpId }: VersionSelectorProps) {
  const { versions, activeVersion, isLoading, setActiveVersionId } =
    useVersion();

  const handleVersionChange = async (versionId: string) => {
    try {
      await setActiveVersionId(versionId);
    } catch (error) {
      console.error("Error changing version:", error);
    }
  };

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Loading versions..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select
      value={activeVersion?.id || ""}
      onValueChange={handleVersionChange}
      disabled={versions.length === 0}
    >
      <SelectTrigger className="w-[250px]">
        <SelectValue placeholder="Select version" />
      </SelectTrigger>
      <SelectContent>
        {versions.map((version) => (
          <SelectItem key={version.id} value={version.id}>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                v{version.version_number}: {version.version_name}
              </span>
              {version.is_active && (
                <Badge variant="default" className="text-xs">
                  Active
                </Badge>
              )}
              {version.finalized_at && (
                <Badge variant="secondary" className="text-xs">
                  Finalized
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
