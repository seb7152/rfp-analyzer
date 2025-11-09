# Système de Code d'Organisation

## Overview

Le système a été modifié pour que les utilisateurs ne créent plus automatiquement une organisation lors de l'inscription. À la place, ils doivent entrer un **code d'organisation à 10 chiffres** fourni par leur organisation.

## Architecture

### 1. Enregistrement (Register)
- **URL**: `http://localhost:3001/register`
- **Champs requis**:
  - Nom complet
  - Email
  - Mot de passe (min 8 caractères)
  - **Code d'organisation** (10 chiffres)
- **Processus**:
  1. L'utilisateur remplissait le formulaire
  2. Supabase Auth crée l'utilisateur
  3. Appel API `/api/auth/register` avec le code
  4. L'API cherche l'organisation par le code
  5. L'utilisateur est ajouté en tant que **"member"** (pas admin)
  6. Redirection vers `/dashboard`

### 2. Gestion des Organisations
- **URL**: `http://localhost:3001/dashboard/organizations`
- **Fonctionnalités**:
  - Voir toutes les organisations dont vous êtes membre
  - Afficher le code de chaque organisation
  - Copier le code avec un bouton (les utilisateurs peuvent le partager)
  - Les administrateurs peuvent créer de nouvelles organisations
  - Les nouvelles organisations reçoivent automatiquement un code à 10 chiffres

### 3. Création d'Organisation
- **Endpoint**: `POST /api/organizations/create`
- **Authentification**: Requise (utilisateur authentifié)
- **Corps de la requête**:
  ```json
  {
    "name": "Ma Nouvelle Organisation"
  }
  ```
- **Réponse**: Organisation avec code généré automatiquement
  ```json
  {
    "success": true,
    "organization": {
      "id": "uuid",
      "name": "Ma Nouvelle Organisation",
      "slug": "ma-nouvelle-organisation",
      "organization_code": "1234567890"
    }
  }
  ```

## Codes d'Organisation Existants

Pour tester le système, utilisez ces codes:

| Organisation | Code |
|---|---|
| Test Organization | 5525548542 |
| My Organization | 8534584434 |
| Test Org | 8726755826 |
| seb's corp | 6664718785 |

## Workflow Complet

### Pour un nouvel utilisateur (sans organisation)
1. L'administrateur/propriétaire crée une organisation via `/dashboard/organizations`
2. L'organisation reçoit automatiquement un code à 10 chiffres
3. L'administrateur partage ce code avec les nouveaux utilisateurs
4. Les nouveaux utilisateurs vont à `/register` et entrent le code
5. Ils sont automatiquement ajoutés à l'organisation en tant que "member"

### Pour un administrateur (créer une organisation)
1. Aller à `/dashboard/organizations`
2. Section "Créer une nouvelle organisation"
3. Entrer le nom de l'organisation
4. Cliquer "Créer l'organisation"
5. Un code à 10 chiffres est généré automatiquement
6. Partager le code avec les utilisateurs

## Bases de Données

### Table: `organizations`
- `id` (UUID) - Clé primaire
- `name` (TEXT) - Nom de l'organisation
- `slug` (TEXT) - Slug unique
- `organization_code` (VARCHAR(10)) - **Code unique à 10 chiffres**
- `subscription_tier` (TEXT) - Tier d'abonnement
- `max_users` (INT) - Nombre maximum d'utilisateurs
- `max_rfps` (INT) - Nombre maximum de RFP
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Constraints
- `organization_code` est UNIQUE
- Index créé sur `organization_code` pour les recherches rapides

### Table: `user_organizations`
- `user_id` + `organization_id` = UNIQUE
- `role` accepte: `admin`, `member`, `viewer`

## Tests

### Test d'enregistrement valide
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "email": "user@example.com",
    "fullName": "John Doe",
    "organizationCode": "5525548542"
  }'
```

### Erreur: Code invalide
```bash
# Code trop court
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "email": "user@example.com",
    "fullName": "John Doe",
    "organizationCode": "123"
  }'
# Réponse: "Code must be exactly 10 digits"
```

### Erreur: Organisation inexistante
```bash
# Code qui n'existe pas
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "email": "user@example.com",
    "fullName": "John Doe",
    "organizationCode": "9999999999"
  }'
# Réponse: "Organization not found"
```

## Prochaines Étapes

1. **UI pour gestion des rôles**: Permettre aux admins de changer les rôles des utilisateurs
2. **Invitations**: Système d'invitation plutôt que partage de code
3. **Supprimer des membres**: Permet aux admins de supprimer des membres
4. **Audit logs**: Tracker les changements de rôle et ajouts/suppressions

## Notes de Sécurité

- RLS est désactivé sur la table `organizations` (à refaire pour la production)
- Les codes à 10 chiffres ne sont pas cryptés dans la base de données
- Considérer d'ajouter un taux limite sur l'enregistrement pour éviter les abus
