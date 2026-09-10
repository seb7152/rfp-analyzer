"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, ChevronRight, KeyRound, LogOut, Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useOrganization } from "@/hooks/use-organization";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { RFPSwitcher } from "@/components/RFPSwitcher";
import { VersionSwitcher } from "@/components/VersionSwitcher";
import { ClientOnly } from "@/components/ClientOnly";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      mode="icon"
      size="sm"
      aria-label={dark ? "Passer en thème clair" : "Passer en thème sombre"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export function TopBar() {
  const { user, isLoading, logout } = useAuth();
  const { currentOrg } = useOrganization();
  const params = useParams();
  const pathname = usePathname();
  const rfpId = typeof params?.rfpId === "string" ? params.rfpId : null;
  const insideRfp = !!rfpId && pathname.startsWith("/dashboard/rfp/");

  return (
    <header className="sticky top-0 z-40 h-12 border-b border-border bg-background">
      <div className="flex h-full items-center justify-between gap-3 px-3 md:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/dashboard"
            className="shrink-0 text-sm font-bold tracking-tight text-foreground"
          >
            RFP Analyzer
          </Link>
          {isLoading || !user ? (
            <div className="h-7 w-40 animate-pulse rounded-sm bg-muted" />
          ) : insideRfp ? (
            <ClientOnly>
              <nav
                aria-label="Fil d'Ariane"
                className="flex min-w-0 items-center gap-1 text-sm"
              >
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {currentOrg && (
                  <>
                    <Link
                      href="/dashboard"
                      className="hidden max-w-[160px] truncate text-muted-foreground hover:text-foreground md:inline"
                    >
                      {currentOrg.name}
                    </Link>
                    <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground md:inline" />
                  </>
                )}
                <RFPSwitcher />
                <VersionSwitcher />
              </nav>
            </ClientOnly>
          ) : (
            <ClientOnly>
              <div className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <OrganizationSwitcher />
              </div>
            </ClientOnly>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          {isLoading || !user ? (
            <div className="h-7 w-24 animate-pulse rounded-sm bg-muted" />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-muted text-xs font-semibold">
                    {(user.full_name || user.email || "?")
                      .split(" ")
                      .map((s) => s[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <span className="hidden max-w-[140px] truncate text-sm sm:inline">
                    {user.full_name || user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <div className="text-sm font-semibold">{user.full_name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user.organizations?.map((org) => (
                  <DropdownMenuItem key={org.id} asChild>
                    <Link href="/dashboard/organizations" className="gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{org.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {org.role === "admin"
                          ? "Admin"
                          : org.role === "evaluator"
                            ? "Membre"
                            : "Lecteur"}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings/tokens" className="gap-2">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    Jetons d'accès
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-destructive focus:text-destructive"
                  onSelect={() => logout()}
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
