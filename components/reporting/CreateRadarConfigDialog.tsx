"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tag, Supplier } from "@/lib/supabase/types";
import { X } from "lucide-react";

interface CreateRadarConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfpId: string;
  onSuccess: () => void;
}

export function CreateRadarConfigDialog({
  open,
  onOpenChange,
  rfpId,
  onSuccess,
}: CreateRadarConfigDialogProps) {
  const [name, setName] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [supplierId, setSupplierId] = useState<string>("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all tags
        const tagsResponse = await fetch(`/api/rfps/${rfpId}/tags`);
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json();
          setAllTags(tagsData.tags || []);
        }

        // Fetch all suppliers
        const suppliersResponse = await fetch(`/api/rfps/${rfpId}/suppliers`);
        if (suppliersResponse.ok) {
          const suppliersData = await suppliersResponse.json();
          setSuppliers(suppliersData.suppliers || []);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error("Error loading dialog data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, rfpId]);

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tagId)) {
        // Remove tag
        return prev.filter((id) => id !== tagId);
      } else {
        // Add tag if within limits
        if (prev.length < 8) {
          return [...prev, tagId];
        }
        return prev;
      }
    });
  };

  const handleCreate = async () => {
    // Validate
    if (!name.trim()) {
      setError("Configuration name is required");
      return;
    }

    if (selectedTags.length < 3 || selectedTags.length > 8) {
      setError("You must select between 3 and 8 tags");
      return;
    }

    if (!supplierId) {
      setError("You must select a supplier");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/rfps/${rfpId}/dashboard-configs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          type: "radar",
          config: {
            selectedTagIds: selectedTags,
            supplierId,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create configuration");
      }

      onSuccess();
      onOpenChange(false);
      // Reset form
      setName("");
      setSelectedTags([]);
      setSupplierId("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Error creating configuration:", err);
    } finally {
      setSaving(false);
    }
  };

  const remainingTags = 8 - selectedTags.length;
  const canAddMore = remainingTags > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Radar Chart Configuration</DialogTitle>
          <DialogDescription>
            Configure a new radar chart by selecting 3-8 tags as axes and
            choosing a supplier to display
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading configuration data...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Configuration Name */}
            <div className="space-y-2">
              <Label htmlFor="config-name">Configuration Name</Label>
              <Input
                id="config-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Supplier A Performance"
                disabled={saving}
              />
            </div>

            {/* Supplier Selection */}
            <div className="space-y-2">
              <Label htmlFor="supplier-select">Supplier</Label>
              {suppliers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No suppliers found. Please add suppliers first.
                </p>
              ) : (
                <Select
                  value={supplierId}
                  onValueChange={setSupplierId}
                  disabled={saving}
                >
                  <SelectTrigger id="supplier-select">
                    <SelectValue placeholder="Select a supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Tag Selection */}
            <div className="space-y-2">
              <Label>Tags for Radar Axes ({selectedTags.length}/8)</Label>
              <p className="text-sm text-muted-foreground">
                Select between 3 and 8 tags. These will become the axes of your
                radar chart.
              </p>

              <div className="border rounded-lg p-4 space-y-3">
                {/* Selected Tags */}
                {selectedTags.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Selected Tags:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tagId) => {
                        const tag = allTags.find((t) => t.id === tagId);
                        return tag ? (
                          <Badge
                            key={tagId}
                            variant="default"
                            className="cursor-pointer hover:opacity-80"
                            onClick={() => toggleTag(tagId)}
                          >
                            {tag.name}
                            <X className="h-3 w-3 ml-1" />
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {/* Available Tags to Add */}
                {allTags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No tags found. Please create tags first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Available Tags {canAddMore ? "" : "(Max reached)"}:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => {
                        const isSelected = selectedTags.includes(tag.id);
                        return (
                          <Badge
                            key={tag.id}
                            variant={isSelected ? "default" : "outline"}
                            className={
                              !isSelected && canAddMore
                                ? "cursor-pointer hover:bg-secondary"
                                : isSelected
                                  ? "cursor-pointer hover:opacity-80"
                                  : "opacity-50 cursor-not-allowed"
                            }
                            onClick={() => {
                              if (isSelected || canAddMore) {
                                toggleTag(tag.id);
                              }
                            }}
                          >
                            {tag.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {selectedTags.length < 3 && (
                <p className="text-sm text-amber-600">
                  Please select at least 3 tags
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  saving ||
                  selectedTags.length < 3 ||
                  selectedTags.length > 8 ||
                  !supplierId ||
                  !name.trim() ||
                  suppliers.length === 0 ||
                  allTags.length === 0
                }
              >
                {saving ? "Creating..." : "Create Configuration"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
