"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Copy, Check, Plus, Building2, AlertCircle } from "lucide-react";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";

interface Organization {
  id: string;
  name: string;
  slug: string;
  organization_code: string;
  role: string;
}

export default function OrganizationsPage() {
  const { user: _user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [newOrgName, setNewOrgName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch("/api/organizations");
      if (!response.ok) throw new Error("Failed to fetch organizations");
      const data = await response.json();
      setOrganizations(data.organizations || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/organizations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create organization");
      }

      const data = await response.json();
      setOrganizations([...organizations, data.organization]);
      setNewOrgName("");
      setSuccess(`Organization "${newOrgName}" created successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getRoleBadge = (role: string) => {
    const config: Record<
      string,
      { variant: "default" | "secondary" | "outline"; label: string }
    > = {
      admin: { variant: "default", label: "Admin" },
      member: { variant: "secondary", label: "Member" },
      viewer: { variant: "outline", label: "Viewer" },
    };
    const { variant, label } = config[role] || {
      variant: "outline",
      label: role,
    };
    return (
      <Badge variant={variant} className="font-medium text-xs">
        {label}
      </Badge>
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-6 py-12 max-w-6xl">
          <div className="space-y-8">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-80" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = organizations.some((org) => org.role === "admin");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.08),_transparent_50%)]">
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        <div className="space-y-10">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl border border-border/20 bg-gradient-to-br from-background via-background to-primary/10 px-8 py-10 shadow-[0_30px_80px_-40px_hsl(var(--primary)/0.6)]">
            <div className="absolute -top-10 right-0 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium text-foreground/80 backdrop-blur-sm dark:border-white/5 dark:bg-white/5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Workspace Control Center
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Organizations
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Monitor memberships, rotate access codes, and spin up new
                  teams without leaving your dashboard.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    label: "Total Organizations",
                    value: organizations.length,
                  },
                  {
                    label: "Admin Access",
                    value: organizations.filter((org) => org.role === "admin")
                      .length,
                  },
                  {
                    label: "Member + Viewer",
                    value: organizations.filter(
                      (org) => org.role === "member" || org.role === "viewer"
                    ).length,
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-sm shadow-inner backdrop-blur-xl dark:border-white/5"
                  >
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      {card.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
              {isAdmin && (
                <div className="flex flex-wrap gap-3">
                  <Button size="sm" className="h-9 rounded-full px-4">
                    Quick Create
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-full border-white/20 bg-transparent text-foreground/80 hover:bg-white/10"
                    onClick={() => document.getElementById("orgName")?.focus()}
                  >
                    Use access code
                  </Button>
                </div>
              )}
            </div>
          </section>

          {/* Alert Messages */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-md bg-red-50 dark:bg-red-950/10 text-red-900 dark:text-red-200">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Error</p>
                <p className="text-sm opacity-90 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 p-4 rounded-md bg-green-50 dark:bg-green-950/10 text-green-900 dark:text-green-200">
              <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Success</p>
                <p className="text-sm opacity-90 mt-0.5">{success}</p>
              </div>
            </div>
          )}

          {/* Organizations Table */}
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Memberships
                </p>
                <h2 className="text-xl font-semibold mt-1">My Organizations</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  View memberships, copy codes, and share access with teammates.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-full border-border/40"
                onClick={fetchOrganizations}
              >
                Refresh
              </Button>
            </div>

            {organizations.length === 0 ? (
              <div className="text-center py-16 rounded-3xl border border-dashed border-border/50 bg-card/30">
                <div className="mx-auto w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mb-4">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg mb-1">
                  No organizations yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Create your first organization or join an existing one with an
                  access code
                </p>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-card/80 backdrop-blur-xl shadow-[0_20px_60px_-40px_hsl(var(--primary)/0.6)]">
                <Table className="[&_thead]:bg-transparent">
                  <TableHeader>
                    <TableRow className="border-b border-border/20">
                      <TableHead className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
                        Organization
                      </TableHead>
                      <TableHead className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
                        Access Code
                      </TableHead>
                      <TableHead className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
                        Role
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org) => (
                      <TableRow
                        key={org.id}
                        className="border-border/10 hover:bg-primary/5 transition-colors"
                      >
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                                {getInitials(org.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-normal text-sm">{org.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {org.slug}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-normal text-foreground/80">
                              {org.organization_code}
                            </span>
                            <div className="rounded-full bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary/80">
                              live
                            </div>
                            <button
                              onClick={() =>
                                copyToClipboard(org.organization_code, org.id)
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                              {copiedId === org.id ? (
                                <Check className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          {getRoleBadge(org.role)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Create Organization Section */}
          {isAdmin && (
            <div className="space-y-5 pt-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Create
              </p>
              <div className="rounded-3xl border border-white/10 bg-background/80 p-8 shadow-[0_20px_60px_-50px_hsl(var(--primary)/0.8)] backdrop-blur-xl sm:max-w-xl">
                <form onSubmit={handleCreateOrganization} className="space-y-6">
                  <FieldSet>
                    <FieldLegend>New organization</FieldLegend>
                    <FieldGroup className="flex-col gap-6">
                      <Field>
                        <FieldLabel htmlFor="orgName">
                          Organization Name
                        </FieldLabel>
                        <FieldContent>
                          <Input
                            id="orgName"
                            type="text"
                            required
                            value={newOrgName}
                            onChange={(e) => setNewOrgName(e.target.value)}
                            placeholder="e.g., ACME Corporation"
                            disabled={creating}
                            className="h-11 rounded-2xl border border-white/10 bg-white/70 text-sm shadow-inner backdrop-blur focus-visible:ring-2 focus-visible:ring-primary/30"
                          />
                          <FieldDescription>
                            This name appears across the dashboard and helps
                            generate a unique slug and access code.
                          </FieldDescription>
                        </FieldContent>
                      </Field>
                    </FieldGroup>
                  </FieldSet>
                  <Button
                    type="submit"
                    disabled={creating || !newOrgName.trim()}
                    size="md"
                    className="h-11 w-full rounded-2xl text-sm font-semibold tracking-tight"
                  >
                    {creating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Create Organization
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
