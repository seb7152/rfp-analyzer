"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/hooks/use-organization";
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

export function OrganizationSwitcher() {
  const { currentOrg, organizations, switchOrganization } = useOrganization();
  const [open, setOpen] = React.useState(false);

  // Show loading state
  if (!currentOrg) {
    return (
      <div className="h-9 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
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
            {currentOrg?.name || "Select organization..."}
          </span>
          <ChevronsUpDown className="opacity-50 h-4 w-4 ml-2 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search organizations..." className="h-9" />
          <CommandList>
            <CommandEmpty>No organization found.</CommandEmpty>
            <CommandGroup>
              {organizations.map((org) => (
                <CommandItem
                  key={org.id}
                  value={org.id}
                  onSelect={(selectedId) => {
                    switchOrganization(selectedId);
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium">{org.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {org.role}
                    </span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto flex-shrink-0",
                      currentOrg.id === org.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>New organization</span>
            </Button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
