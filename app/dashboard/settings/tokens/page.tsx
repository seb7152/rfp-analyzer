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

interface Token {
  id: string;
  name: string;
  token_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export default function TokensPage() {
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
  }, []);

  async function fetchTokens() {
    setLoading(true);
    try {
      const res = await fetch("/api/tokens");
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
          expires_in_days: expiresInDays ? parseInt(expiresInDays) : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedToken(data.token.raw);
        setNewTokenName("");
        setExpiresInDays("");
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
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Personal Access Tokens</h1>
        <p className="text-muted-foreground mt-1">
          Les tokens permettent d'authentifier les clients MCP sans utiliser vos
          identifiants de session.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Tokens actifs</CardTitle>
            <CardDescription>
              Utilisez ces tokens dans le header{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                Authorization: Bearer &lt;token&gt;
              </code>
            </CardDescription>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            Nouveau token
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Chargement...
            </p>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucun token actif. Créez-en un pour commencer.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Préfixe</TableHead>
                  <TableHead>Dernière utilisation</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell className="font-medium">{token.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {token.token_prefix}...
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(token.last_used_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(token.expires_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(token.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            Révoquer
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Révoquer ce token ?</AlertDialogTitle>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                <span className="text-muted-foreground font-normal">
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
            <Button onClick={createToken} disabled={creating || !newTokenName.trim()}>
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
          <div className="bg-muted rounded-md p-3 font-mono text-sm break-all select-all">
            {createdToken}
          </div>
          <DialogFooter>
            <Button onClick={copyToken} className="w-full">
              {copied ? "Copié !" : "Copier le token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
