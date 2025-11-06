# Guide de test - Gestion des Organisations

## Prérequis
- Application Next.js en cours d'exécution sur `http://localhost:3000`
- Base de données Supabase connectée
- Un utilisateur créé lors de l'inscription

---

## Étape 1 : Vérifier l'organisation créée lors de l'inscription

### 1.1 Après l'inscription, vérifiez en base de données :

```bash
# Via Supabase dashboard ou psql
SELECT id, name, slug, subscription_tier, max_users, max_rfps 
FROM organizations 
ORDER BY created_at DESC 
LIMIT 1;
```

**Résultat attendu :**
```
id                                   | name             | slug             | subscription_tier | max_users | max_rfps
a242bfb5-982d-404a-84f3-7837296e9b73 | Test Organization| test-organization| free              | 10        | 5
```

### 1.2 Vérifiez le lien utilisateur-organisation :

```sql
SELECT uo.*, u.email 
FROM user_organizations uo
JOIN users u ON uo.user_id = u.id
WHERE uo.organization_id = 'a242bfb5-982d-404a-84f3-7837296e9b73';
```

**Résultat attendu :**
```
id      | user_id | organization_id | role  | joined_at | invited_by | email
[UUID]  | [UUID]  | [org-id]        | admin | NOW()     | NULL       | test@example.com
```

---

## Étape 2 : Tester les API d'organisations

### 2.1 Lister ses organisations

```bash
curl -X GET http://localhost:3000/api/organizations \
  -H "Content-Type: application/json"
```

**Résultat attendu (200):**
```json
{
  "organizations": [
    {
      "id": "a242bfb5-982d-404a-84f3-7837296e9b73",
      "name": "Test Organization",
      "slug": "test-organization",
      "subscription_tier": "free",
      "max_users": 10,
      "max_rfps": 5,
      "role": "admin",
      "created_at": "2025-11-06T22:50:06.649770+00:00"
    }
  ]
}
```

### 2.2 Créer une nouvelle organisation

```bash
curl -X POST http://localhost:3000/api/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ma Nouvelle Organisation"
  }'
```

**Résultat attendu (200):**
```json
{
  "success": true,
  "organization": {
    "id": "[new-uuid]",
    "name": "Ma Nouvelle Organisation",
    "slug": "ma-nouvelle-organisation",
    "subscription_tier": "free",
    "max_users": 10,
    "max_rfps": 5,
    "role": "admin"
  }
}
```

### 2.3 Obtenir les détails d'une organisation

```bash
curl -X GET http://localhost:3000/api/organizations/a242bfb5-982d-404a-84f3-7837296e9b73 \
  -H "Content-Type: application/json"
```

**Résultat attendu (200):**
```json
{
  "organization": {
    "id": "a242bfb5-982d-404a-84f3-7837296e9b73",
    "name": "Test Organization",
    "slug": "test-organization",
    "subscription_tier": "free",
    "max_users": 10,
    "max_rfps": 5,
    "userRole": "admin"
  }
}
```

### 2.4 Mettre à jour une organisation (admin uniquement)

```bash
curl -X PUT http://localhost:3000/api/organizations/a242bfb5-982d-404a-84f3-7837296e9b73 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Organisation Renommée",
    "settings": {"theme": "dark"}
  }'
```

**Résultat attendu (200):**
```json
{
  "success": true,
  "organization": {
    "id": "a242bfb5-982d-404a-84f3-7837296e9b73",
    "name": "Organisation Renommée",
    "settings": {"theme": "dark"},
    "updated_at": "2025-11-07T10:30:00.000000+00:00"
  }
}
```

---

## Étape 3 : Tester la gestion des membres

### 3.1 Lister les membres d'une organisation

```bash
curl -X GET http://localhost:3000/api/organizations/a242bfb5-982d-404a-84f3-7837296e9b73/members \
  -H "Content-Type: application/json"
```

**Résultat attendu (200):**
```json
{
  "members": [
    {
      "id": "[user-uuid]",
      "email": "test@example.com",
      "full_name": "Test User",
      "avatar_url": null,
      "role": "admin",
      "joined_at": "2025-11-06T22:50:06.649770+00:00",
      "membershipId": "[membership-uuid]"
    }
  ]
}
```

### 3.2 Inviter un utilisateur (admin uniquement)

**D'abord, créez un 2e utilisateur :**
1. Ouvrez une fenêtre incognito/privée
2. Allez à `http://localhost:3000/register`
3. Créez un compte avec email: `user2@example.com`

**Puis invitez-le :**

```bash
curl -X POST http://localhost:3000/api/organizations/a242bfb5-982d-404a-84f3-7837296e9b73/invite \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user2@example.com",
    "role": "evaluator"
  }'
```

**Résultat attendu (200):**
```json
{
  "success": true,
  "message": "User user2@example.com has been invited as evaluator",
  "membership": {
    "id": "[membership-uuid]",
    "user_id": "[user2-uuid]",
    "organization_id": "a242bfb5-982d-404a-84f3-7837296e9b73",
    "role": "evaluator",
    "joined_at": "2025-11-07T10:35:00.000000+00:00"
  }
}
```

### 3.3 Changer le rôle d'un membre (admin uniquement)

```bash
curl -X PATCH http://localhost:3000/api/organizations/a242bfb5-982d-404a-84f3-7837296e9b73/members/[user2-uuid] \
  -H "Content-Type: application/json" \
  -d '{
    "role": "admin"
  }'
```

**Résultat attendu (200):**
```json
{
  "success": true,
  "message": "Member role updated",
  "membership": {
    "user_id": "[user2-uuid]",
    "role": "admin"
  }
}
```

### 3.4 Supprimer un membre (admin uniquement)

```bash
curl -X DELETE http://localhost:3000/api/organizations/a242bfb5-982d-404a-84f3-7837296e9b73/members/[user2-uuid] \
  -H "Content-Type: application/json"
```

**Résultat attendu (200):**
```json
{
  "success": true,
  "message": "Member removed from organization"
}
```

---

## Étape 4 : Tester les composants UI

### 4.1 Vérifier le OrganizationSwitcher

1. Créez une 2e organisation via l'API (ou créez plusieurs users dans la même org)
2. Allez à `http://localhost:3000/dashboard` (devrait afficher 404 car page non créée)
3. Le Navbar n'existe que sur les pages protégées (dashboard, etc.)

**Pour voir le Navbar, il faut d'abord créer la page dashboard:**

```bash
cat > /Users/seb7152/Documents/RFP\ analyzer/RFP-Analyer/app/dashboard/layout.tsx << 'EOF'
"use client"

import { Navbar } from "@/components/Navbar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <Navbar />
      <main className="min-h-screen bg-white dark:bg-slate-950">
        {children}
      </main>
    </div>
  )
}
EOF
```

Puis créez une page de test :

```bash
cat > /Users/seb7152/Documents/RFP\ analyzer/RFP-Analyer/app/dashboard/page.tsx << 'EOF'
"use client"

import { useAuth } from "@/hooks/use-auth"
import { useOrganization } from "@/hooks/use-organization"

export default function DashboardPage() {
  const { user } = useAuth()
  const { currentOrganization } = useOrganization()

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Tableau de bord</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Utilisateur</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {user?.full_name} ({user?.email})
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Organisation actuelle</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {currentOrganization?.name}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Slug: {currentOrganization?.slug}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Rôle: {currentOrganization?.role}
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Organisations disponibles</h2>
          <ul className="space-y-2">
            {user?.organizations.map((org) => (
              <li key={org.id} className="text-gray-600 dark:text-gray-400">
                {org.name} ({org.role})
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
EOF
```

### 4.2 Tester le switching d'organisation

1. Allez à `http://localhost:3000/dashboard`
2. Cliquez sur le sélecteur d'organisation en haut à gauche
3. Changez d'organisation - vous devriez voir "Organisation actuelle" changer
4. Le choix est persisté en localStorage

### 4.3 Tester le theme toggle

1. Cliquez sur l'icône lune/soleil dans la Navbar
2. L'interface devrait basculer entre les modes clair et sombre
3. Rechargez la page - le thème devrait être mémorisé

### 4.4 Tester le menu utilisateur

1. Cliquez sur l'icône utilisateur en haut à droite
2. Vous devriez voir le menu avec :
   - Nom et email
   - Bouton "Déconnexion"
3. Cliquez sur "Déconnexion" - vous devriez être redirigé vers `/login`

---

## Étape 5 : Tester le RLS (Row Level Security)

### 5.1 Vérifier l'isolation multi-tenant

**Créez 2 organisations avec des users différents :**

1. User A crée Org A et crée un RFP dans Org A
2. User B crée Org B et crée un RFP dans Org B
3. User A ne devrait voir que le RFP d'Org A (même s'il connaît l'UUID)
4. User B ne devrait voir que le RFP d'Org B

Les policies RLS empêchent les utilisateurs de voir les données d'autres organisations.

### 5.2 Tester le contrôle d'accès

**Rôles et permissions :**

| Permission | Admin | Evaluator | Viewer |
|-----------|-------|-----------|--------|
| Créer RFP | ✅ | ✅ | ❌ |
| Modifier RFP | ✅ | ❌ | ❌ |
| Supprimer RFP | ✅ | ❌ | ❌ |
| Inviter users | ✅ | ❌ | ❌ |
| Gérer rôles | ✅ | ❌ | ❌ |
| Évaluer réponses | ✅ | ✅ | ❌ |
| Voir analytics | ✅ | ✅ | ❌ |

---

## Tests d'erreur à vérifier

### 401 Non authentifié
```bash
curl -X GET http://localhost:3000/api/organizations
# Sans cookies de session → 401
```

### 403 Accès refusé
```bash
# User A try to delete User B from User A's org
curl -X DELETE http://localhost:3000/api/organizations/[org-a-id]/members/[user-b-id]
# User A is not admin → 403
```

### 404 Non trouvé
```bash
curl -X GET http://localhost:3000/api/organizations/invalid-uuid
# Org doesn't exist → 404
```

### 409 Conflit
```bash
curl -X POST http://localhost:3000/api/organizations/[org-id]/invite \
  -d '{"email": "already-member@example.com", "role": "evaluator"}'
# User already in org → 409
```

---

## Vérification de la base de données

### Voir toutes les organisations et leurs membres

```sql
SELECT 
  o.id,
  o.name,
  o.slug,
  COUNT(uo.id) as member_count,
  STRING_AGG(CONCAT(u.email, ' (', uo.role, ')'), ', ') as members
FROM organizations o
LEFT JOIN user_organizations uo ON o.id = uo.organization_id
LEFT JOIN users u ON uo.user_id = u.id
GROUP BY o.id, o.name, o.slug
ORDER BY o.created_at DESC;
```

### Voir la hiérarchie d'une organisation

```sql
SELECT 
  u.email,
  uo.role,
  uo.joined_at
FROM user_organizations uo
JOIN users u ON uo.user_id = u.id
WHERE uo.organization_id = '[org-id]'
ORDER BY uo.role DESC, u.email;
```

---

## Checklist de test complète

- [ ] Inscription crée une organisation automatiquement
- [ ] Organisation créée avec slug unique
- [ ] User devient admin de sa première organisation
- [ ] API GET /organizations liste les organisations de l'user
- [ ] API POST /organizations crée une nouvelle organisation
- [ ] API GET /organizations/[id] retourne les détails
- [ ] API PUT /organizations/[id] met à jour (admin only)
- [ ] API GET /organizations/[id]/members liste les membres
- [ ] API POST /organizations/[id]/invite invite un user
- [ ] API PATCH /organizations/[id]/members/[userId] change le rôle
- [ ] API DELETE /organizations/[id]/members/[userId] supprime un membre
- [ ] OrganizationSwitcher affiche la liste des organisations
- [ ] Changer d'organisation met à jour currentOrganization
- [ ] Navbar affiche le nom de l'organisation actuelle
- [ ] Theme toggle fonctionne (light/dark)
- [ ] Menu utilisateur affiche email et bouton déconnexion
- [ ] Déconnexion redirige vers /login
- [ ] RLS empêche l'accès aux données d'autres organisations
