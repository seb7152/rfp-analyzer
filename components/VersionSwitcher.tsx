"use client";

import * as React from "react";
import { useContext } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { VersionContext } from "@/contexts/VersionContext";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ClientOnly } from "@/components/ClientOnly";

export function VersionSwitcher() {
  const versionContext = useContext(VersionContext);
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();

  // If no VersionProvider, don't render anything
  if (!versionContext) {
    return null;
  }

  const { versions, activeVersion, setActiveVersionId, isLoading } =
    versionContext;

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-9 w-[160px] bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
    );
  }

  // Don't show if no versions available
  if (!versions || versions.length === 0) {
    return null;
  }

  const handleSelectVersion = async (versionId: string) => {
    try {
      await setActiveVersionId(versionId);
      setOpen(false);
    } catch (error) {
      console.error("Error selecting version:", error);
    }
  };

  return (
    <ClientOnly>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("justify-between", isMobile ? "w-16" : "w-[160px]")}
          >
            <span className="truncate">
              {activeVersion
                ? isMobile
                  ? `V${activeVersion.version_number}`
                  : activeVersion.version_name ||
                    `Version ${activeVersion.version_number}`
                : isMobile
                  ? "V"
                  : "Select version..."}
            </span>
            <ChevronsUpDown className="opacity-50 h-4 w-4 ml-2 flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn("p-0", isMobile ? "w-48" : "w-[160px]")}>
          <Command>
            <CommandInput placeholder="Search versions..." className="h-9" />
            <CommandList>
              <CommandEmpty>No version found.</CommandEmpty>
              <CommandGroup>
                {versions.map((version) => (
                  <CommandItem
                    key={version.id}
                    value={version.id}
                    onSelect={() => handleSelectVersion(version.id)}
                  >
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium text-sm">
                        {version.version_name ||
                          `Version ${version.version_number}`}
                      </span>
                      {version.is_active && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          Active
                        </span>
                      )}
                    </div>
                    <Check
                      className={cn(
                        "ml-auto flex-shrink-0",
                        activeVersion?.id === version.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </ClientOnly>
  );
}
