# Architecture Cloud: Vercel / Supabase / GCP (RFP-Analyzer)

## Vue d'ensemble

L'application utilise une architecture distribuée où chaque service joue un rôle spécifique:

```
Vercel (Frontend + API)
├── Next.js 14 (serveur + client)
├── React (interface utilisateur)
└── API routes (app/api/)
       ↓
Supabase (Backend)
├── PostgreSQL (base de données)
├── Auth (authentification)
└── SDK client/serveur
       ↓
GCP (Stockage de fichiers)
└── Google Cloud Storage (bucket RFP-Analyzer)
```

## Services et responsabilités

| Service      | Rôle                               | Utilisé pour                                                          |
| ------------ | ---------------------------------- | --------------------------------------------------------------------- |
| **Vercel**   | Héberge Next.js + API routes       | Orchestration, génération URLs signées                                |
| **Supabase** | Base de données + Authentification | Metadata fichiers RFP/Réponses, Row Level Security (RLS), audit trail |
| **GCP**      | Stockage de fichiers               | Cahiers des charges (PDF), documents RFP, réponses fournisseurs       |

## Configuration

### Variables d'environnement

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tasfoalqpmsoijnwkbhd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# GCP - RFP-Analyzer Project
GCP_PROJECT_ID=rfp-analyzer-project
GCS_BUCKET=rfp-analyzer-storage
SIGN_URL_TTL_SEC=90
MAX_FILE_SIZE_MB=50

# En production: GCP_SA_KEY_JSON (base64)
# En développement: GCP_SA_KEY_PATH=./gcp/rfp-analyzer-key.json
```

### Authentification GCP

**En local**: Fichier JSON avec credentials du service account

```json
{
  "type": "service_account",
  "project_id": "rfp-analyzer-project",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "rfp-storage@rfp-analyzer-project.iam.gserviceaccount.com"
}
```

**En production (Vercel)**: Variable d'environnement `GCP_SA_KEY_JSON` contenant le JSON échappé

## Structure GCS Bucket

```
rfp-analyzer-storage/
├── rfps/
│   ├── {organization_id}/
│   │   └── {rfp_id}/
│   │       ├── {document_id}-cahier-charges.pdf
│   │       ├── {document_id}-specifications.pdf
│   │       └── {document_id}-technical-brief.pdf
│
├── responses/
│   ├── {organization_id}/
│   │   └── {response_id}/
│   │       ├── {attachment_id}-response-document.pdf
│   │       └── {attachment_id}-technical-proposal.xlsx
│
└── comparisons/
    ├── {organization_id}/
    │   └── {comparison_id}/
    │       └── {export_id}-comparison-export.pdf
```

## Flux d'upload de RFP PDF

### Étape 1: Demander une intention d'upload

```typescript
POST /api/rfps/[rfpId]/documents/upload-intent
Content-Type: application/json
Cookie: supabase-auth=...

Payload:
{
  "filename": "cahier-charges.pdf",
  "mimeType": "application/pdf",
  "fileSize": 2048000,
  "documentType": "cahier_charges" // ou: specifications, brief
}
```

Validations côté serveur:

- Vérifier que la taille du fichier ne dépasse pas `MAX_FILE_SIZE_MB` (50 MB)
- Vérifier que le type MIME est `application/pdf`
- Vérifier que le RFP existe (RLS)
- Vérifier que l'utilisateur a les permissions pour l'éditer

### Étape 2: Réception de l'URL signée

```json
Response 200:
{
  "uploadUrl": "https://storage.googleapis.com/rfp-analyzer-storage/rfps/org-123/rfp-456/doc-789-cahier-charges.pdf?X-Goog-Algorithm=GOOG4-RSA-SHA256&...",
  "documentId": "550e8400-e29b-41d4-a716-446655440000",
  "objectName": "rfps/org-123/rfp-456/doc-789-cahier-charges.pdf",
  "expiresAt": "2025-11-11T12:32:00Z"
}
```

### Étape 3: Upload direct vers GCP

Le navigateur envoie le fichier **directement à Google Cloud Storage** avec l'URL signée:

```typescript
PUT https://storage.googleapis.com/rfp-analyzer-storage/rfps/org-123/rfp-456/doc-789-cahier-charges.pdf?X-Goog-Algorithm=...
Content-Type: application/pdf
[Contenu binaire du fichier]
```

**Avantage**: Le fichier ne passe jamais par les serveurs Vercel, ce qui améliore la scalabilité.

### Étape 4: Finaliser l'upload (Commit)

Après l'upload réussi, on enregistre les métadonnées en base de données:

```typescript
POST /api/rfps/[rfpId]/documents/commit
Cookie: supabase-auth=...
Content-Type: application/json

Payload:
{
  "rfpId": "rfp-456",
  "documentId": "550e8400-e29b-41d4-a716-446655440000",
  "objectName": "rfps/org-123/rfp-456/doc-789-cahier-charges.pdf",
  "filename": "cahier-charges.pdf",
  "mimeType": "application/pdf",
  "fileSize": 2048000,
  "documentType": "cahier_charges"
}
```

Côté serveur:

1. Vérifier que le fichier existe dans GCS
2. Valider la taille du fichier (métadonnées GCS)
3. Vérifier que le RFP existe (RLS)
4. Créer l'entrée dans la table `rfp_documents`
5. Enregistrer l'accès dans `document_access_logs`
6. Mettre à jour le statut du RFP si nécessaire

```json
Response 200:
{
  "success": true,
  "document": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "rfp_id": "rfp-456",
    "filename": "cahier-charges.pdf",
    "file_size": 2048000,
    "mime_type": "application/pdf",
    "document_type": "cahier_charges",
    "uploaded_at": "2025-11-11T12:02:00Z"
  }
}
```

## Flux d'affichage de PDF dans ComparisonView

### Étape 1: Récupérer l'URL de visualisation

```typescript
GET /api/rfps/[rfpId]/documents/[documentId]/view-url
Cookie: supabase-auth=...
```

### Étape 2: Récupérer l'URL signée

L'API route:

1. Récupère le record depuis Supabase
2. Extrait `gcs_object_name`
3. Génère une URL signée temporaire (90 secondes par défaut)
4. Enregistre l'accès dans les logs

```json
Response 200:
{
  "url": "https://storage.googleapis.com/rfp-analyzer-storage/rfps/org-123/rfp-456/doc-789-cahier-charges.pdf?X-Goog-Algorithm=GOOG4-RSA-SHA256&...",
  "expiresAt": "2025-11-11T12:32:00Z",
  "pageCount": 15
}
```

### Étape 3: Afficher le PDF dans le composant

Le composant `RFPDocumentViewer` affiche le PDF avec:

- Navigation par page
- Surlignage des sections correspondant à la requirement actuelle
- Synchronisation avec la `ComparisonView`
- Annotations utilisateur (optionnel)

## Flux de suppression de document RFP

### Étape 1: Demander la suppression

```typescript
DELETE /api/rfps/[rfpId]/documents/[documentId]
Cookie: supabase-auth=...
```

### Étape 2: Traitement côté serveur

```typescript
// 1. Récupérer le record depuis Supabase (avec RLS)
const docRecord = await supabase
  .from("rfp_documents")
  .select("*")
  .eq("id", documentId)
  .eq("rfp_id", rfpId)
  .single();

// 2. Supprimer le fichier depuis GCS
await bucket.file(docRecord.gcs_object_name).delete();

// 3. Supprimer l'enregistrement en base
await supabase.from("rfp_documents").delete().eq("id", documentId);

// 4. Mettre à jour le statut du RFP
await updateRFPStatus(rfpId);
```

## Sécurité

### Row Level Security (RLS) - Supabase

```sql
-- Exemple: autoriser uniquement l'accès aux RFPs appartenant à l'organisation
CREATE POLICY "Users can view their organization RFPs"
ON rfps
FOR SELECT
USING (auth.jwt() ->> 'organization_id' = organization_id);

-- Exemple: pour les documents RFP
CREATE POLICY "Users can access documents of their RFPs"
ON rfp_documents
FOR SELECT
USING (
  rfp_id IN (
    SELECT id FROM rfps
    WHERE organization_id = auth.jwt() ->> 'organization_id'
  )
);
```

Les cookies de session sont automatiquement gérés par le Supabase SSR SDK.

### URLs signées - GCP

- Durée de vie limitée: 90 secondes par défaut
- Signature V4 avec clé privée du service account
- Pas de credentials exposées au client
- Chaque URL est unique et non-réutilisable après expiration

### Access Logs

Chaque accès au fichier est enregistré:

```typescript
await supabase.from("document_access_logs").insert({
  document_id: documentId,
  user_id: userId,
  action: "view", // ou 'download', 'upload', 'delete'
  ip_address: request.headers.get("x-forwarded-for"),
  user_agent: request.headers.get("user-agent"),
  timestamp: new Date(),
});
```

## Architecture détaillée

### Diagramme de flux - Upload RFP PDF

```
┌─────────────────────────────────────────────────────┐
│ FRONTEND (React dans Vercel)                        │
│ ├─ Formulaire d'upload RFP                          │
│ ├─ Gère le drag-drop des fichiers                   │
│ └─ Affiche l'état de progression                    │
└─────────────────────────────────────────────────────┘
       │                          │                      │
       ↓                          ↓                      ↓
   upload-intent            Direct upload         Commit upload
       │                          │                      │
       ↓                          ↓                      ↓
┌──────────────────────────┐  ┌────────────────────┐  ┌─────────────┐
│ VERCEL API ROUTES        │  │ GOOGLE CLOUD       │  │ VERCEL API  │
│ POST /api/rfps/[id]/     │  │ STORAGE            │  │ POST /api/  │
│ documents/upload-intent  │  │                    │  │ rfps/[id]/  │
│                          │  │ bucket:            │  │ documents/  │
│ ├─ Valide le fichier     │  │ rfp-analyzer-      │  │ commit      │
│ ├─ Génère URL signée     │  │ storage/           │  │             │
│ └─ Retourne UUID         │  │ rfps/{org}/{rfp}/  │  │ ├─ Valide   │
└──────────────────────────┘  │ {doc}-cahier.pdf   │  │ ├─ Enregistr│
                              └────────────────────┘  │ └─ Log      │
                                                        └─────────────┘
                                                                ↓
                                        ┌─────────────────────────────┐
                                        │ SUPABASE (PostgreSQL)       │
                                        │                             │
                                        │ Tables:                     │
                                        │ ├─ rfp_documents            │
                                        │ │  (metadata + ref GCS)     │
                                        │ ├─ document_access_logs     │
                                        │ │  (audit trail)            │
                                        │ └─ rfps (proposition)       │
                                        └─────────────────────────────┘
```

### Diagramme de flux - Affichage PDF dans ComparisonView

```
ComparisonView
│
├─ SupplierResponseCard (pour chaque fournisseur)
│
├─ RFPDocumentViewer (🆕)
│  ├─ Récupère l'URL signée
│  ├─ Affiche le PDF avec react-pdf
│  ├─ Navigation par page
│  └─ Surlignage des sections pertinentes
│
└─ Synchronisation bidirectionnelle
   ├─ Clic sur requirement → Scroll PDF vers section
   └─ Clic sur PDF → Focus requirement dans l'arbre
```

## Code sources clés

### Configuration GCS

**File**: `lib/gcs.ts`

```typescript
import { Storage } from "@google-cloud/storage";

const storageConfig = {
  projectId: process.env.GCP_PROJECT_ID,
  credentials: JSON.parse(process.env.GCP_SA_KEY_JSON!),
};

const storage = new Storage(storageConfig);
export const bucket = storage.bucket(process.env.GCS_BUCKET!);
```

### Service d'upload

**File**: `lib/fileUploadService.ts`

Classe réutilisable pour gérer l'upload de fichiers RFP:

- `getRFPUploadIntent()` - Génère une URL signée
- `commitRFPUpload()` - Enregistre les métadonnées
- `deleteRFPDocument()` - Supprime fichier + metadata
- `getDocumentViewUrl()` - Génère une URL pour visualisation
- `logDocumentAccess()` - Enregistre un accès

### Route API - Upload Intent

**File**: `app/api/rfps/[rfpId]/documents/upload-intent/route.ts`

Endpoint pour demander une intention d'upload. Retourne une URL signée.

### Route API - Commit

**File**: `app/api/rfps/[rfpId]/documents/commit/route.ts`

Endpoint pour finaliser l'upload après que le fichier soit en GCS.

### Composant Viewer

**File**: `components/RFPDocumentViewer.tsx`

Composant React pour afficher le PDF avec:

- Navigation dans le document
- Surlignage des sections
- Intégration avec la ComparisonView

## Gestion des erreurs

### Scénarios et résolutions

| Scénario                              | Gestion                    |
| ------------------------------------- | -------------------------- |
| Fichier dépasse `MAX_FILE_SIZE_MB`    | ❌ 400 Bad Request         |
| Type MIME non PDF                     | ❌ 400 Bad Request         |
| URL signée expirée                    | ❌ 403 Forbidden (par GCS) |
| Fichier non trouvé en GCS             | ❌ 404 Not Found           |
| Taille mismatch GCS vs metadata       | ❌ 400 Bad Request         |
| Erreur Supabase RLS                   | ❌ 403 Forbidden           |
| Upload non finalisé (commit manquant) | ⚠️ Fichier orphelin en GCS |

### Nettoyage automatique

Si l'étape "commit" échoue, le fichier est supprimé de GCS:

```typescript
if (dbError) {
  await file.delete().catch(console.error);
  throw new Error(`Failed to save file metadata: ${dbError.message}`);
}
```

## Performance et optimisations

### Upload direct vers GCS

- Les gros fichiers ne passent **jamais** par Vercel
- Réduit la charge sur les serveurs Vercel
- Améliore la latence pour l'utilisateur (direct vers GCP)

### URLs signées

- Pas de secret exposé au client
- Expiration courte (90s) = moins de risque de vol d'URL
- Signature V4 = plus sécurisé que V2

### Mise en cache PDF

- Les URLs signées expirent après 90 secondes
- Implémenter un cache côté client avec revalidation au besoin
- Utiliser react-pdf avec virtualisation pour les longs documents

## Développement local

### Setup GCP

1. Créer un service account GCP pour le projet RFP-Analyzer
2. Télécharger les credentials JSON
3. Placer dans `gcp/rfp-analyzer-key.json`
4. Ajouter les variables d'environnement dans `.env.local`

```bash
# Tester la connexion GCP
gsutil -m ls gs://rfp-analyzer-storage
```

### Tester les uploads

```bash
# 1. Demander une intention d'upload
curl -X POST http://localhost:3000/api/rfps/rfp-456/documents/upload-intent \
  -H "Content-Type: application/json" \
  -H "Cookie: supabase-auth=..." \
  -d '{
    "filename": "cahier-charges.pdf",
    "mimeType": "application/pdf",
    "fileSize": 2048000,
    "documentType": "cahier_charges"
  }'

# 2. Uploader le fichier (utiliser l'URL reçue)
curl -X PUT "https://storage.googleapis.com/..." \
  -H "Content-Type: application/pdf" \
  --data-binary @cahier-charges.pdf

# 3. Finaliser l'upload
curl -X POST http://localhost:3000/api/rfps/rfp-456/documents/commit \
  -H "Content-Type: application/json" \
  -H "Cookie: supabase-auth=..." \
  -d '{
    "rfpId": "rfp-456",
    "documentId": "550e8400-e29b-41d4-a716-446655440000",
    "objectName": "rfps/org-123/rfp-456/doc-789-cahier-charges.pdf",
    "filename": "cahier-charges.pdf",
    "mimeType": "application/pdf",
    "fileSize": 2048000,
    "documentType": "cahier_charges"
  }'
```

## Production (Vercel)

### Configuration

1. Ajouter `GCP_SA_KEY_JSON` dans Vercel Environment Variables
2. Vérifier les permissions du service account GCP
3. Tester les uploads avec des fichiers réels

### Monitoring

- Vérifier les logs Vercel pour les erreurs API
- Vérifier les logs GCS pour les uploads
- Vérifier `document_access_logs` pour les anomalies d'accès

## Ressources utiles

- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Google Cloud Storage](https://cloud.google.com/storage/docs)
- [Signed URLs - GCS](https://cloud.google.com/storage/docs/access-control/signed-urls)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [@supabase/supabase-js](https://github.com/supabase/supabase-js)
- [@google-cloud/storage](https://github.com/googleapis/nodejs-storage)
- [react-pdf](https://github.com/wojtekmaj/react-pdf)
