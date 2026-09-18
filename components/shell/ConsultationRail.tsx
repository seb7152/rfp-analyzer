"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ChevronsLeft, ChevronsRight, ChevronsUpDown, Check, Layers, Settings } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Chapter } from "@/hooks/use-consultation";
import { useRFPs } from "@/hooks/use-rfps";
import { useVersion } from "@/contexts/VersionContext";
import { StateGlyph, stateLabel } from "@/components/shell/StateGlyph";
import { UserMenu } from "@/components/shell/UserMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ConsultationRailProps {
  rfpId: string;
  title: string | null;
  statusLabel: string | null;
  chapters: Chapter[];
  isLoading: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
  className?: string;
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The consultation's table of contents: one line per chapter with its icon,
 * a state dot and a short figure. Collapses to 56 px (icon + dot) with `[`.
 */
export function ConsultationRail({
  rfpId,
  title,
  statusLabel,
  chapters,
  isLoading,
  collapsed = false,
  onToggleCollapsed,
  onNavigate,
  className,
}: ConsultationRailProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { rfps } = useRFPs();
  const { versions, activeVersion, setActiveVersionId } = useVersion();

  const switchVersion = async (versionId: string) => {
    try {
      await setActiveVersionId(versionId);
    } catch {
      toast.error("La version n'a pas pu être activée.", {
        description: "Vérifiez votre connexion, puis réessayez.",
      });
    }
  };

  const settings = chapters.find((c) => c.id === "parametres");
  const numbered = chapters.filter((c) => c.id !== "parametres");

  return (
    <nav
      aria-label="Sommaire de la consultation"
      className={cn("flex h-full flex-col gap-3 bg-rail", collapsed ? "items-stretch p-2" : "p-2.5", className)}
    >
      {/* En-tête : retour, titre (sélecteur), version */}
      <div className={cn("flex flex-col gap-2", collapsed && "items-center")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-1")}>
          {!collapsed && (
            <Link
              href="/dashboard"
              onClick={onNavigate}
              className="flex h-7 flex-1 items-center gap-1.5 rounded-md px-1.5 text-xs text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Consultations
            </Link>
          )}
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Déplier le sommaire" : "Replier le sommaire"}
              title={`${collapsed ? "Déplier" : "Replier"} le sommaire ([)`}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </button>
          )}
        </div>

        {!collapsed && (
          <div className="px-1.5">
            {isLoading || !title ? (
              <div className="space-y-1.5">
                <div className="h-4 w-4/5 animate-pulse rounded-sm bg-muted" />
                <div className="h-3 w-2/5 animate-pulse rounded-sm bg-muted" />
              </div>
            ) : (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-start gap-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Changer de consultation"
                    >
                      <span className="line-clamp-2 flex-1 text-sm font-semibold leading-[18px]">{title}</span>
                      <ChevronsUpDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72">
                    <DropdownMenuLabel>Consultations</DropdownMenuLabel>
                    {rfps.map((r) => (
                      <DropdownMenuItem key={r.id} className="gap-2" onSelect={() => r.id !== rfpId && router.push(`/dashboard/rfp/${r.id}`)}>
                        <span className="flex-1 truncate">{r.title}</span>
                        {r.id === rfpId && <Check className="h-4 w-4 text-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {statusLabel && <span className="text-xs text-muted-foreground">{statusLabel}</span>}
                  {activeVersion && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-6 max-w-full items-center gap-1 rounded-md border border-border bg-card px-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`Version ${activeVersion.version_number} — changer de version`}
                          title="Version de l'évaluation"
                        >
                          <Layers className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            V{activeVersion.version_number}
                            {activeVersion.version_name ? ` · ${activeVersion.version_name}` : ""}
                          </span>
                          <ChevronsUpDown className="h-3 w-3 shrink-0" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64">
                        <DropdownMenuLabel>Versions de l&apos;évaluation</DropdownMenuLabel>
                        {versions.map((v) => (
                          <DropdownMenuItem key={v.id} className="gap-2" onSelect={() => { if (!v.is_active) void switchVersion(v.id); }}>
                            <span className="num text-2xs text-muted-foreground">V{v.version_number}</span>
                            <span className="flex-1 truncate">{v.version_name || "Sans nom"}</span>
                            {v.is_active && <Check className="h-4 w-4 text-primary" />}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/rfp/${rfpId}/parametres#versions`}>Gérer les versions</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Chapitres */}
      <ol className="flex flex-col gap-0.5">
        {isLoading && chapters.length === 0
          ? Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="px-2 py-1.5">
                <div className="h-4 w-3/4 animate-pulse rounded-sm bg-muted" />
              </li>
            ))
          : numbered.map((chapter) => {
              const active = isActive(pathname, chapter.href);
              const entryActive = chapter.entries.some((e) => isActive(pathname, e.href));
              const Icon = chapter.icon;
              return (
                <li key={chapter.id}>
                  <Link
                    href={chapter.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? `${chapter.label}${chapter.figure ? ` · ${chapter.figure}` : ""} · ${stateLabel(chapter.state)}` : undefined}
                    className={cn(
                      "relative flex items-center rounded-md text-sm transition-colors duration-150",
                      collapsed ? "h-9 justify-center" : "h-8 gap-2.5 px-2.5",
                      active || entryActive
                        ? "bg-accent font-medium text-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active || entryActive ? "text-foreground" : "text-muted-foreground")} />
                    {collapsed ? (
                      <span className="absolute right-1.5 top-1.5">
                        <StateGlyph state={chapter.state} className="h-1.5 w-1.5" />
                      </span>
                    ) : (
                      <>
                        <span className="flex-1 truncate">{chapter.label}</span>
                        {chapter.figure && <span className="num text-2xs text-muted-foreground">{chapter.figure}</span>}
                        <StateGlyph state={chapter.state} />
                        <span className="sr-only">{stateLabel(chapter.state)}</span>
                      </>
                    )}
                  </Link>
                  {!collapsed && chapter.entries.length > 0 && (active || entryActive) && (
                    <ul className="mb-1 mt-0.5 flex flex-col gap-0.5">
                      {chapter.entries.map((entry) => {
                        const ea = isActive(pathname, entry.href);
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
      </ol>

      {settings && (
        <div className="border-t border-border pt-2">
          <Link
            href={settings.href}
            onClick={onNavigate}
            aria-current={isActive(pathname, settings.href) ? "page" : undefined}
            title={collapsed ? "Paramètres" : undefined}
            className={cn(
              "flex items-center rounded-md text-sm transition-colors duration-150",
              collapsed ? "h-9 justify-center" : "h-8 gap-2.5 px-2.5",
              isActive(pathname, settings.href) ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Paramètres</span>}
          </Link>
        </div>
      )}

      <div className="flex-1" />
      <UserMenu collapsed={collapsed} />
    </nav>
  );
}
