"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Create user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error("Échec de création du compte")
      }

      // Call API to create organization and link user
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authData.user.id,
          email,
          fullName,
          organizationName,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Erreur lors de la création de l'organisation")
      }

      // Redirect to dashboard
      router.push("/dashboard")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'inscription")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Créer un compte
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Commencez à analyser vos appels d'offres
          </p>
        </div>

        <div className="mt-8 bg-white dark:bg-gray-800 py-8 px-6 shadow sm:rounded-lg">
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jean Dupont"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@exemple.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Minimum 8 caractères
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationName">Nom de l'organisation</Label>
              <Input
                id="organizationName"
                name="organizationName"
                type="text"
                required
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Mon Entreprise"
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Vous pourrez inviter d'autres utilisateurs plus tard
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {error}
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Création du compte..." : "Créer mon compte"}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">
                  Vous avez déjà un compte ?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Se connecter
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
