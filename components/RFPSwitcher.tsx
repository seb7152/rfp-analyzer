"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/hooks/use-organization";
import { useRFPs } from "@/hooks/use-rfps";
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

export function RFPSwitcher() {
  const params = useParams();
  const rfpId = params.rfpId as string;
  const router = useRouter();
  const { currentOrg } = useOrganization();
  const { rfps, isLoading } = useRFPs();
  const [open, setOpen] = React.useState(false);

  const currentRfp = rfps.find((rfp) => rfp.id === rfpId);

  // Show loading state
  if (!currentOrg || isLoading) {
    return (
      <div className="h-9 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
    );
  }

  // Show error state if no RFP found
  if (!currentRfp) {
    return (
      <div className="h-9 w-40 bg-red-100 dark:bg-red-900 rounded flex items-center px-3 text-xs text-red-700 dark:text-red-200">
        RFP not found
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          <span className="truncate">
            {currentRfp?.title || "Select RFP..."}
          </span>
          <ChevronsUpDown className="opacity-50 h-4 w-4 ml-2 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search RFPs..." className="h-9" />
          <CommandList>
            <CommandEmpty>No RFP found.</CommandEmpty>
            <CommandGroup>
              {rfps.map((rfp) => (
                <CommandItem
                  key={rfp.id}
                  value={rfp.id}
                  onSelect={(selectedId) => {
                    router.push(`/dashboard/rfp/${selectedId}/summary`);
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium text-sm">{rfp.title}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {rfp.status}
                    </span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto flex-shrink-0",
                      currentRfp?.id === rfp.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
