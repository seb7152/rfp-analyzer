"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserPlus,
  Trash2,
  Mail,
  Shield,
  Eye,
  Users,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Member {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "evaluator" | "viewer";
  joined_at: string;
  avatar_url: string | null;
}

export default function MembersPage() {
  const params = useParams();
  const organizationId = params.organizationId as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"evaluator" | "viewer">(
    "evaluator"
  );
  const [inviting, setInviting] = useState(false);
  const [openInviteDialog, setOpenInviteDialog] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<"admin" | "evaluator" | "viewer">(
    "evaluator"
  );
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // Fetch members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/organizations/${organizationId}/members`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch members");
        }

        const data = await response.json();
        setMembers(data.members || []);

        // Get current user's role
        const userResponse = await fetch("/api/auth/me");
        if (userResponse.ok) {
          const userData = await userResponse.json();
          const org = userData.user.organizations.find(
            (o: any) => o.id === organizationId
          );
          setCurrentUserRole(org?.role);
        }
      } catch (error) {
        console.error("Failed to fetch members:", error);
        toast.error("Erreur lors du chargement des membres");
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchMembers();
    }
  }, [organizationId]);

  // Handle invite
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteEmail.trim()) {
      toast.error("Veuillez entrer une adresse email");
      return;
    }

    try {
      setInviting(true);
      const response = await fetch(
        `/api/organizations/${organizationId}/invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: inviteEmail,
            role: inviteRole,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to invite member");
      }

      const data = await response.json();
      setMembers([...members, data.member]);
      setInviteEmail("");
      setInviteRole("evaluator");
      setOpenInviteDialog(false);
      toast.success("Membre invité avec succès");
    } catch (error) {
      console.error("Failed to invite member:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de l'invitation"
      );
    } finally {
      setInviting(false);
    }
  };

  // Handle role change
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/members/${userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update member role");
      }

      setMembers(
        members.map((m) =>
          m.user_id === userId ? { ...m, role: newRole as any } : m
        )
      );
      setEditingUserId(null);
      toast.success("Rôle mis à jour");
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Erreur lors de la mise à jour du rôle");
    }
  };

  // Handle delete
  const handleDelete = async (userId: string) => {
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/members/${userId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove member");
      }

      setMembers(members.filter((m) => m.user_id !== userId));
      toast.success("Membre supprimé");
    } catch (error) {
      console.error("Failed to delete member:", error);
      toast.error("Erreur lors de la suppression du membre");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-4 h-4" />;
      case "evaluator":
        return <Users className="w-4 h-4" />;
      case "viewer":
        return <Eye className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge variant="default" className="bg-red-600">
            {getRoleIcon(role)}
            <span className="ml-1">Admin</span>
          </Badge>
        );
      case "evaluator":
        return (
          <Badge variant="secondary">
            {getRoleIcon(role)}
            <span className="ml-1">Évaluateur</span>
          </Badge>
        );
      case "viewer":
        return (
          <Badge variant="outline">
            {getRoleIcon(role)}
            <span className="ml-1">Lecteur</span>
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const canManageMembers = currentUserRole === "admin";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/organizations"
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux organisations
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Gestion des membres
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Gérez les membres de votre organisation et leurs rôles
              </p>
            </div>
            {canManageMembers && (
              <Dialog open={openInviteDialog} onOpenChange={setOpenInviteDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Inviter un membre
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Inviter un nouveau membre</DialogTitle>
                    <DialogDescription>
                      Entrez l'email et le rôle du nouveau membre
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleInvite}>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-slate-900 dark:text-white block mb-2">
                          Email
                        </label>
                        <Input
                          type="email"
                          placeholder="email@exemple.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          disabled={inviting}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-900 dark:text-white block mb-2">
                          Rôle
                        </label>
                        <Select
                          value={inviteRole}
                          onValueChange={(value) =>
                            setInviteRole(value as "evaluator" | "viewer")
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="evaluator">
                              Évaluateur
                            </SelectItem>
                            <SelectItem value="viewer">Lecteur</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          Les évaluateurs peuvent créer et évaluer les RFP.
                          Les lecteurs ont accès en lecture seule.
                        </p>
                      </div>
                    </div>
                    <DialogFooter className="mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpenInviteDialog(false)}
                        disabled={inviting}
                      >
                        Annuler
                      </Button>
                      <Button type="submit" disabled={inviting}>
                        {inviting ? "Invitation..." : "Inviter"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Members Table */}
        <Card>
          <CardHeader>
            <CardTitle>Membres de l'organisation</CardTitle>
            <CardDescription>
              {members.length} membre{members.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 dark:text-slate-400">
                  Aucun membre actuellement
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Membre depuis</TableHead>
                      {canManageMembers && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.user_id}>
                        <TableCell className="font-medium">
                          {member.full_name || "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-400" />
                            {member.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {editingUserId === member.user_id && canManageMembers ? (
                            <Select
                              value={editingRole}
                              onValueChange={(newRole) => {
                                setEditingRole(
                                  newRole as "admin" | "evaluator" | "viewer"
                                );
                                handleRoleChange(member.user_id, newRole);
                              }}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="evaluator">
                                  Évaluateur
                                </SelectItem>
                                <SelectItem value="viewer">Lecteur</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            getRoleBadge(member.role)
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(member.joined_at)}
                        </TableCell>
                        {canManageMembers && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setEditingUserId(
                                    editingUserId === member.user_id
                                      ? null
                                      : member.user_id
                                  )
                                }
                              >
                                {editingUserId === member.user_id
                                  ? "Fermer"
                                  : "Modifier"}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Supprimer le membre
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Êtes-vous sûr de vouloir supprimer{" "}
                                      <strong>{member.email}</strong> de
                                      l'organisation ? Cette action ne peut pas
                                      être annulée.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() =>
                                      handleDelete(member.user_id)
                                    }
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Information */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Rôles et permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold">Admin</h3>
                </div>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <li>✓ Gérer l'organisation</li>
                  <li>✓ Inviter des membres</li>
                  <li>✓ Créer et supprimer RFP</li>
                  <li>✓ Assigner des évaluateurs</li>
                  <li>✓ Voir les analyses</li>
                </ul>
              </div>
              <div className="border rounded-lg p-4 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold">Évaluateur</h3>
                </div>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <li>✓ Créer RFP</li>
                  <li>✓ Évaluer les réponses</li>
                  <li>✓ Utiliser les fonctionnalités IA</li>
                  <li>✗ Gérer les utilisateurs</li>
                  <li>✗ Supprimer RFP</li>
                </ul>
              </div>
              <div className="border rounded-lg p-4 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-5 h-5 text-slate-600" />
                  <h3 className="font-semibold">Lecteur</h3>
                </div>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <li>✓ Voir les RFP</li>
                  <li>✓ Voir les analyses</li>
                  <li>✗ Créer RFP</li>
                  <li>✗ Modifier</li>
                  <li>✗ Utiliser l'IA</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
