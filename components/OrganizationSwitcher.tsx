"use client"

import { useOrganization } from "@/hooks/use-organization"
import { Button } from "@/components/ui/button"
import { ChevronDown, Plus } from "lucide-react"
import { useState } from "react"

export function OrganizationSwitcher() {
  const { currentOrganization, organizations, switchOrganization } = useOrganization()
  const [isOpen, setIsOpen] = useState(false)

  if (!currentOrganization) {
    return null
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-[200px] justify-between"
      >
        <span className="truncate">{currentOrganization.name}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[200px] rounded-md border bg-white dark:bg-slate-900 shadow-md">
          <div className="max-h-[300px] overflow-y-auto">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  switchOrganization(org.id)
                  setIsOpen(false)
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${
                  org.id === currentOrganization.id
                    ? "bg-slate-100 dark:bg-slate-800 font-semibold"
                    : ""
                }`}
              >
                <div>{org.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {org.role}
                </div>
              </button>
            ))}
          </div>

          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Nouvelle org</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
