"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Building2, KeyRound, LogOut, Moon, Sun } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function initialsOf(name: string | null | undefined, fallback = "?") {
  const src = (name || "").trim();
  if (!src) return fallback;
  const words = src.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
  return (words.length > 0 ? words : [src])
    .map((w) => w.match(/[\p{L}\p{N}]/u)?.[0] ?? w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({
  name,
  size = 24,
  className,
  tone = 0,
}: {
  name: string | null | undefined;
  size?: number;
  className?: string;
  tone?: number;
}) {
  const tones = ["bg-accent text-accent-foreground", "bg-status-pass-soft text-status-pass", "bg-status-partial-soft text-status-partial", "bg-status-roadmap-soft text-status-roadmap"];
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", tones[tone % tones.length], className)}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.42)) }}
    >
      {initialsOf(name)}
    </span>
  );
}

/**
 * The signed-in user, at the bottom of every sidebar: organisations, access
 * tokens, theme, sign out.
 */
export function UserMenu({ collapsed = false }: { collapsed?: boolean }) {
  const { user, isLoading, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  if (isLoading || !user) {
    return <div className="mx-2 h-8 animate-pulse rounded-md bg-muted" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-150 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            collapsed && "justify-center px-0"
          )}
          aria-label="Compte"
        >
          <Avatar name={user.full_name || user.email} />
          {!collapsed && (
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{user.full_name || user.email}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-64">
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
                {org.role === "admin" ? "Admin" : org.role === "evaluator" ? "Membre" : "Lecteur"}
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
        <DropdownMenuItem className="gap-2" onSelect={(e) => { e.preventDefault(); setTheme(dark ? "light" : "dark"); }}>
          {dark ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
          {dark ? "Thème clair" : "Thème sombre"}
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onSelect={() => logout()}>
          <LogOut className="h-4 w-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
