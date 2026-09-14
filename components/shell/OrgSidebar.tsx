"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, FolderOpen, KeyRound, Users, Check } from "lucide-react";
import { useOrganization } from "@/hooks/use-organization";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserMenu, initialsOf } from "@/components/shell/UserMenu";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Consultations", icon: FolderOpen, exact: true },
  { href: "/dashboard/organizations", label: "Organisation et membres", icon: Users, exact: false },
  { href: "/dashboard/settings/tokens", label: "Jetons d'accès", icon: KeyRound, exact: false },
];

/**
 * Organisation-level sidebar: switch organisation, reach the three
 * organisation screens, account at the bottom. 232 px on desktop.
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
            </li>
          );
        })}
      </ul>

      <div className="flex-1" />
      <UserMenu />
    </nav>
  );
}
