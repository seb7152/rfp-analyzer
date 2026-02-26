"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, Copy, Key } from "lucide-react";

interface Token {
  id: string;
  name: string;
  token_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface TokensManagerCardProps {
  organizationId: string;
  isAdmin: boolean;
}

export function TokensManagerCard({
  organizationId,
  isAdmin,
}: TokensManagerCardProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchTokens();
  }, [organizationId]);

  async function fetchTokens() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tokens?organizationId=${organizationId}`
      );
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function createToken() {
    if (!newTokenName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTokenName.trim(),
          organizationId,
          expires_in_days: expiresInDays ? parseInt(expiresInDays) : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedToken(data.token.raw);
        setNewTokenName("");
        setExpiresInDays("90");
        setShowCreateDialog(false);
        await fetchTokens();
      }
    } finally {
      setCreating(false);
    }
  }

  async function revokeToken(tokenId: string) {
    await fetch(`/api/tokens/${tokenId}`, { method: "DELETE" });
    await fetchTokens();
  }

  function copyToken() {
    if (!createdToken) return;
    navigator.clipboard.writeText(createdToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <>
      <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Tokens d'accès API
            </CardTitle>
            <CardDescription>
              Créez et gérez vos clés d'authentification pour l'intégration MCP
            </CardDescription>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowCreateDialog(true)}>
              Nouveau token
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Format d'utilisation */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Deux formats d'authentification
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Via header (recommandé)
                </p>
                <code className="text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded block text-slate-700 dark:text-slate-200 font-mono break-all">
                  Authorization: Bearer &lt;token&gt;
                </code>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Via URL (query parameter)
                </p>
                <code className="text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded block text-slate-700 dark:text-slate-200 font-mono break-all">
                  /api/mcp?token=&lt;token&gt;
                </code>
              </div>
            </div>
          </div>

          {/* Tokens list */}
          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
              Chargement...
            </p>
          ) : tokens.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-6 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aucun token actif. {isAdmin && "Créez-en un pour commencer."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Tokens actifs ({tokens.length})
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Préfixe</TableHead>
                    <TableHead>Dernière utilisation</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Créé le</TableHead>
                    {isAdmin && <TableHead></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map((token) => (
                    <TableRow key={token.id}>
                      <TableCell className="font-medium">
                        {token.name}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {token.token_prefix}...
                        </code>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(token.last_used_at)}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(token.expires_at)}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(token.created_at)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                Révoquer
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Révoquer ce token ?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Le token <strong>{token.name}</strong> sera
                                  immédiatement invalide. Les clients MCP qui
                                  l'utilisent cesseront de fonctionner.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="flex justify-end gap-2 mt-4">
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => revokeToken(token.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Révoquer
                                </AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
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

      {/* Create token dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau token</DialogTitle>
            <DialogDescription>
              Donnez un nom à ce token pour l'identifier facilement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="token-name">Nom</Label>
              <Input
                id="token-name"
                placeholder="ex : Claude Desktop local"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createToken()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="token-expiry">
                Expiration (jours){" "}
                <span className="text-slate-500 dark:text-slate-400 font-normal">
                  — laisser vide pour ne jamais expirer
                </span>
              </Label>
              <Input
                id="token-expiry"
                type="number"
                min={1}
                placeholder="ex : 90"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={createToken}
              disabled={creating || !newTokenName.trim()}
            >
              {creating ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show created token — one time only */}
      <Dialog
        open={!!createdToken}
        onOpenChange={(open) => {
          if (!open) setCreatedToken(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Token créé</DialogTitle>
            <DialogDescription>
              Copiez ce token maintenant. Il ne sera plus affiché après la
              fermeture de cette fenêtre.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-md p-3 font-mono text-sm break-all select-all">
            {createdToken}
          </div>
          <DialogFooter>
            <Button onClick={copyToken} className="w-full">
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copier le token
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
