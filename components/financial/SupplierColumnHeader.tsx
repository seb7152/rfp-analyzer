"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Upload, Plus, Edit2 } from "lucide-react";
import { FinancialOfferVersion } from "@/types/financial";
import { cn } from "@/lib/utils";

interface SupplierColumnHeaderProps {
  supplierId: string;
  supplierName: string;
  versions: FinancialOfferVersion[];
  selectedVersionId: string;
  onVersionChange: (versionId: string) => void;
  onNewVersion: () => void;
  onImportVersion: () => void;
  onEditManual: () => void;
  isEditing: boolean;
}

export function SupplierColumnHeader({
  supplierName,
  versions,
  selectedVersionId,
  onVersionChange,
  onNewVersion,
  onImportVersion,
  onEditManual,
  isEditing,
}: SupplierColumnHeaderProps) {
  if (isEditing) {
    return (
      <div
        className={cn(
          "flex flex-col gap-2 p-2 border-b border-orange-400 bg-orange-50"
        )}
      >
        <div className="flex justify-between items-center">
          <span className="font-semibold text-sm truncate" title={supplierName}>
            {supplierName}
          </span>
          <span className="text-xs font-medium bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded">
            En édition
          </span>
        </div>
        {/* Placeholder to match height of the normal header */}
        <div className="h-7 w-full"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2 min-w-[180px]">
      <div className="font-semibold text-sm truncate" title={supplierName}>
        {supplierName}
      </div>
      <div className="flex gap-1 items-center">
        <Select
          value={selectedVersionId}
          onValueChange={onVersionChange}
          disabled={versions.length === 0}
        >
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue
              placeholder={
                versions.length === 0 ? "Aucune version" : "Sélectionner..."
              }
            />
          </SelectTrigger>
          <SelectContent>
            {versions.map((v) => (
              <SelectItem key={v.id} value={v.id} className="text-xs">
                {v.version_name || new Date(v.created_at).toLocaleDateString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-gray-900"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onNewVersion}>
              <Plus className="mr-2 h-4 w-4" /> Nouvelle version
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onImportVersion}>
              <Upload className="mr-2 h-4 w-4" /> Importer JSON
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onEditManual}
              disabled={versions.length === 0 || !selectedVersionId}
            >
              <Edit2 className="mr-2 h-4 w-4" /> Éditer manuellement
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
