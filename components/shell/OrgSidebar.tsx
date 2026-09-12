"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, FolderOpen, Users, Check, Bot } from "lucide-react";
import { useOrganization } from "@/hooks/use-organization";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserMenu, initialsOf } from "@/components/shell/UserMenu";
import { cn } from "@/lib/utils";

const NAV: Array<{ href: string; label: string; icon: typeof FolderOpen; exact: boolean; entries?: Array<{ href: string; label: string; exact?: boolean }> }> = [
  { href: "/dashboard", label: "Consultations", icon: FolderOpen, exact: true },
  { href: "/dashboard/organizations", label: "Organisation et membres", icon: Users, exact: false },
  {
    href: "/dashboard/agents",
    label: "Agents & IA",
    icon: Bot,
    exact: false,
    entries: [
      { href: "/dashboard/agents", label: "Agents", exact: true },
      { href: "/dashboard/agents/assistance", label: "Assistance à la saisie" },
      { href: "/dashboard/agents/connecteurs", label: "Connecteurs" },
      { href: "/dashboard/agents/mcp", label: "MCP" },
    ],
  },
];

/** An agent sheet (/dashboard/agents/<id>) belongs to the Agents entry. */
function entryActive(pathname: string, entry: { href: string; exact?: boolean }, siblings: Array<{ href: string }>): boolean {
  if (pathname === entry.href) return true;
  if (entry.exact) return !siblings.some((s) => s.href !== entry.href && pathname.startsWith(s.href));
  return pathname.startsWith(entry.href);
}

/**
 * Organisation-level sidebar: switch organisation, reach the organisation
 * screens (Agents & IA opens its three entries), account at the bottom.
 * 232 px on desktop.
 */
export function OrgSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { currentOrg, organizations, switchOrganization, isLoading } = useOrganization();

  return (
    <nav aria-label="Navigation principale" className="flex h-full flex-col gap-4 bg-rail p-2.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-9 w-full items-center gap-2.5 rounded-md px-1.5 text-left transition-colors duration-150 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Changer d'organisation"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-action text-2xs font-bold text-action-foreground">
              {isLoading ? "" : initialsOf(currentOrg?.name, "RA")}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {isLoading ? <span className="block h-3.5 w-24 animate-pulse rounded-sm bg-muted" /> : currentOrg?.name ?? "Organisation"}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          {organizations.map((org) => (
            <DropdownMenuItem key={org.id} className="gap-2" onSelect={() => org.id !== currentOrg?.id && switchOrganization(org.id)}>
              <span className="flex-1 truncate">{org.name}</span>
              {org.id === currentOrg?.id ? <Check className="h-4 w-4 text-primary" /> : <span className="text-xs text-muted-foreground">{org.role}</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ul className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-150",
                  active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
              {item.entries && active && (
                <ul className="mb-1 mt-0.5 flex flex-col gap-0.5">
                  {item.entries.map((entry) => {
                    const ea = entryActive(pathname, entry, item.entries!);
                    return (
                      <li key={entry.href}>
                        <Link
                          href={entry.href}
                          onClick={onNavigate}
                          aria-current={ea ? "page" : undefined}
                          className={cn(
                            "flex h-7 items-center rounded-md pl-9 pr-2.5 text-sm transition-colors duration-150",
                            ea ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {entry.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex-1" />
      <UserMenu />
    </nav>
  );
}
