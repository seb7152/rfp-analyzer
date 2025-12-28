"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";

interface AnalystData {
  id: string;
  fullName: string;
  email: string;
  accessLevel: "owner" | "evaluator" | "viewer";
  avatarUrl?: string;
  assignedAt: string;
}

interface OrganizationMember {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

interface AnalystsTabProps {
  rfpId: string;
}

const accessLevelColors: Record<string, string> = {
  owner: "bg-red-100 text-red-800",
  evaluator: "bg-blue-100 text-blue-800",
  viewer: "bg-gray-100 text-gray-800",
};

const accessLevelLabels: Record<string, string> = {
  owner: "Propriétaire",
  evaluator: "Évaluateur",
  viewer: "Spectateur",
};

export function AnalystsTab({ rfpId }: AnalystsTabProps) {
  const [analysts, setAnalysts] = useState<AnalystData[]>([]);
  const [organizationMembers, setOrganizationMembers] = useState<
    OrganizationMember[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<
    "owner" | "evaluator" | "viewer"
  >("evaluator");
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch current RFP assignments
        const assignmentsResponse = await fetch(
          `/api/rfps/${rfpId}/assignments`
        );
        if (!assignmentsResponse.ok)
          throw new Error("Failed to fetch analysts");

        const assignmentsData = await assignmentsResponse.json();
        const formattedAnalysts = assignmentsData.assignments.map(
          (assignment: any) => ({
            id: assignment.user_id,
            fullName: assignment.user.full_name || assignment.user.email,
            email: assignment.user.email,
            accessLevel: assignment.access_level,
            avatarUrl: assignment.user.avatar_url,
            assignedAt: assignment.assigned_at,
          })
        );

        setAnalysts(formattedAnalysts);

        // Fetch organization members to get the list of available users
        // First, we need to get the organization_id from the RFP
        const rfpResponse = await fetch(`/api/rfps/${rfpId}`);
        if (!rfpResponse.ok) {
          throw new Error("Failed to fetch RFP details");
        }

        const rfpData = await rfpResponse.json();
        const orgId = rfpData.organization_id;

        if (orgId) {
          const membersResponse = await fetch(
            `/api/organizations/${orgId}/members`
          );
          if (!membersResponse.ok) {
            throw new Error(`Failed to fetch organization members: ${membersResponse.status}`);
          }

          const membersData = await membersResponse.json();
          console.log("Organization members fetched:", membersData);
          setOrganizationMembers(membersData.members || []);
        }
      } catch (err) {
        console.error("AnalystsTab error:", err);
        setError(
          err instanceof Error ? err.message : "Une erreur est survenue"
        );
      } finally {
        setLoading(false);
      }
    };

    if (rfpId) {
      fetchData();
    }
  }, [rfpId]);

  const handleRemoveAnalyst = async (userId: string) => {
    try {
      const response = await fetch(`/api/rfps/${rfpId}/assignments/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove analyst");

      setAnalysts((prev) => prev.filter((a) => a.id !== userId));
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la suppression"
      );
    }
  };

  const handleAddUser = async () => {
    if (!selectedUserId || !selectedRole) {
      setError("Veuillez sélectionner un utilisateur et un rôle");
      return;
    }

    try {
      setAddingUser(true);
      setError(null);

      const response = await fetch(`/api/rfps/${rfpId}/assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: selectedUserId,
          access_level: selectedRole,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add user");
      }

      await response.json();
      const selectedMember = organizationMembers.find(
        (m) => m.id === selectedUserId
      );

      if (selectedMember) {
        setAnalysts((prev) => [
          ...prev,
          {
            id: selectedUserId,
            fullName: selectedMember.full_name || selectedMember.email,
            email: selectedMember.email,
            accessLevel: selectedRole,
            avatarUrl: selectedMember.avatar_url,
            assignedAt: new Date().toISOString(),
          },
        ]);
      }

      // Reset form
      setSelectedUserId("");
      setSelectedRole("evaluator");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout");
    } finally {
      setAddingUser(false);
    }
  };

  // Show all members, even if already assigned (to allow role changes)
  const availableMembers = organizationMembers;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-500">
          Chargement des analystes...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-200 text-sm">
          {error}
        </div>
      )}

      <Card className="p-6">
        <div className="space-y-6">
          {/* Add User Section */}
          <div className="border-b pb-6">
            <h4 className="font-semibold mb-4">Ajouter un utilisateur</h4>
            <div className="flex gap-3">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Sélectionner un utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <span>{member.full_name || member.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedRole}
                onValueChange={(value) =>
                  setSelectedRole(value as "owner" | "evaluator" | "viewer")
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">
                    {accessLevelLabels["owner"]}
                  </SelectItem>
                  <SelectItem value="evaluator">
                    {accessLevelLabels["evaluator"]}
                  </SelectItem>
                  <SelectItem value="viewer">
                    {accessLevelLabels["viewer"]}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleAddUser}
                disabled={!selectedUserId || addingUser}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {addingUser ? "Ajout..." : "Ajouter"}
              </Button>
            </div>
          </div>

          {/* Analysts List */}
          <div>
            <h3 className="font-semibold mb-4">
              {analysts.length} analyste(s) autorisé(s)
            </h3>
            {analysts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Aucun analyste assigné
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Assigné le</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysts.map((analyst) => (
                      <TableRow key={analyst.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={analyst.avatarUrl} />
                              <AvatarFallback>
                                {analyst.fullName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {analyst.fullName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {analyst.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={accessLevelColors[analyst.accessLevel]}
                          >
                            {accessLevelLabels[analyst.accessLevel]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(analyst.assignedAt).toLocaleDateString(
                            "fr-FR"
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAnalyst(analyst.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
