# Plan d'Intégration : Navigation PDF avec Numéro de Page depuis Vertex AI Search

## Contexte

**Problème actuel** : Les liens PDF dans les résultats de recherche Vertex AI (`VertexRAGSearch.tsx`) utilisent des signed URLs GCS qui s'ouvrent dans un nouvel onglet sans pouvoir naviguer vers une page spécifique.

**Solution existante** : L'application dispose déjà d'un système complet de visualisation PDF avec navigation par page via `PDFViewerSheet.tsx` et `PDFViewerWithAnnotations.tsx`.

**Objectif** : Modifier `VertexRAGSearch.tsx` pour avoir un **comportement conditionnel** :
- **Dans `/evaluate`** : Utiliser le PDF viewer intégré avec annotations et navigation vers page
- **Dans `/summary`** : Ouvrir dans un nouvel onglet (comportement actuel)

---

## Architecture Actuelle du PDF Viewer

### Composants Existants

1. **`PDFViewerSheet.tsx`** (Principal)
   - Sheet drawer qui affiche le PDF avec toolbar et annotations
   - Supporte `initialDocumentId` et `initialPage` props
   - Utilise localStorage pour persister la position de scroll par document
   - Appelle `/api/rfps/{rfpId}/documents/{documentId}/view-url` pour obtenir signed URL
   - Intègre `PDFViewerWithAnnotations` avec support des annotations

2. **`PDFViewerWithAnnotations.tsx`**
   - Wrapper qui ajoute les annotations et le panel latéral
   - Prop `initialPage` pour navigation automatique
   - Prop `onPageChange` pour sauvegarder la position

3. **`PDFViewer.tsx`** (Composant de base)
   - Gestion du PDF avec PDF.js
   - Toolbar avec navigation, zoom, modes d'annotation
   - Hook `usePDFDocument(url)` pour charger le PDF

4. **API Route** : `/api/rfps/[rfpId]/documents/[documentId]/view-url/route.ts`
   - Authentification et vérification d'accès
   - Génère signed URL GCS avec TTL 1h
   - Log de l'accès dans `document_access_logs`
   - Retourne `{ url, expiresAt, pageCount }`

### Utilisation Actuelle

**Dans `ComparisonView.tsx`** :
```typescript
<PDFViewerSheet
  isOpen={isPdfViewerOpen}
  onOpenChange={setIsPdfViewerOpen}
  documents={supplierDocuments}
  rfpId={rfpId}
  requirementId={selectedRequirement?.id}
  requirements={allRequirements}
  initialDocumentId={pdfInitialDocument}
  initialPage={pdfInitialPage}
/>
```

---

## Solution Proposée : Comportement Conditionnel selon le Contexte

### Approche

**Comportement différencié** selon la page d'utilisation :

1. **Dans `/evaluate`** (contexte d'évaluation détaillée) :
   - ✅ Utiliser `PDFViewerSheet` avec annotations et navigation
   - ✅ Ouvrir le viewer intégré avec `initialPage`
   - ✅ Support complet des annotations
   - ✅ Reste dans le contexte de l'app

2. **Dans `/summary`** (vue d'ensemble multi-fournisseurs) :
   - ✅ Ouvrir dans un nouvel onglet avec signed URL GCS
   - ✅ Comportement actuel conservé (simple et rapide)
   - ✅ Pas besoin d'annotations à ce niveau

**Mécanisme** : Ajouter une prop `enableIntegratedViewer?: boolean` au composant `VertexRAGSearch`

### Avantages

✅ **Contexte approprié** : Annotations seulement quand pertinent (evaluate)
✅ **Performance** : Pas de charge inutile dans summary
✅ **Flexibilité** : Comportement configurable via prop
✅ **UX cohérente** : Chaque page a le bon workflow
✅ **Code réutilisé** : Même composant, comportement adapté

---

## Modifications Requises

### 1. Backend : Aucune modification nécessaire ✅

L'API `/api/rfps/{rfpId}/documents/{documentId}/view-url` existe déjà et fonctionne.
L'API `/api/rfps/{rfpId}/documents` existe également pour récupérer la liste des documents.

### 2. Frontend : Modifications dans `VertexRAGSearch.tsx`

#### 2.1 Ajouter Prop `enableIntegratedViewer`

**Interface Props (ligne ~16)** :

```diff
 interface VertexRAGSearchProps {
   rfpId: string;
   supplierId?: string;
   suppliers?: Array<{ id: string; name: string }>;
   defaultOpen?: boolean;
+  enableIntegratedViewer?: boolean; // true = PDFViewerSheet, false = nouvel onglet
 }
```

#### 2.2 Ajouter State pour PDF Viewer

**Ligne ~46 (après `const [cachedResult, setCachedResult] = useState<SearchResult | null>(null);`)** :

```typescript
// State pour PDF Viewer (seulement utilisé si enableIntegratedViewer = true)
const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
const [pdfInitialDocument, setPdfInitialDocument] = useState<string | null>(null);
const [pdfInitialPage, setPdfInitialPage] = useState<number | null>(null);
```

#### 2.3 Importer PDFViewerSheet

**Ligne ~14 (après les imports existants)** :

```typescript
import { PDFViewerSheet } from "@/components/PDFViewerSheet";
import type { PDFDocument } from "@/components/PDFViewerSheet";
```

#### 2.4 Récupérer les Documents du RFP (Conditionnel)

**Ligne ~72 (après le query des résultats Vertex)** :

```typescript
// Récupérer les documents du RFP pour le PDF viewer (seulement si viewer intégré)
const { data: rfpDocuments = [] } = useQuery<PDFDocument[]>({
  queryKey: ["rfp-documents", rfpId],
  queryFn: async () => {
    const res = await fetch(`/api/rfps/${rfpId}/documents`);
    if (!res.ok) throw new Error("Erreur lors du chargement des documents");
    return res.json();
  },
  enabled: enableIntegratedViewer, // ⚠️ IMPORTANT: Seulement si activé
  staleTime: 5 * 60 * 1000,
});
```

#### 2.5 Modifier le Bouton "Voir PDF" (Comportement Conditionnel)

**Remplacer la section du bouton (ligne 329-343)** :

```typescript
{(source.documentId || source.signedUrl) && (
  <Button
    variant="ghost"
    size="sm"
    className="gap-1.5 text-xs h-8"
    onClick={() => {
      if (enableIntegratedViewer && source.documentId) {
        // Mode evaluate: Ouvrir le PDF viewer intégré avec annotations
        setPdfInitialDocument(source.documentId);
        setPdfInitialPage(source.pageNumber);
        setIsPdfViewerOpen(true);
      } else if (source.signedUrl) {
        // Mode summary: Ouvrir dans un nouvel onglet
        window.open(source.signedUrl, "_blank");
      }
    }}
  >
    <ExternalLink className="h-3 w-3" />
    Voir PDF
  </Button>
)}
```

**Logique clé** :
1. Si `enableIntegratedViewer === true` ET `documentId` disponible → PDF viewer intégré
2. Sinon si `signedUrl` disponible → Nouvel onglet
3. Sinon bouton masqué

#### 2.6 Ajouter le Composant PDFViewerSheet (Conditionnel)

**Après la fermeture du `</Card>` (ligne ~362)** :

```typescript
{/* PDF Viewer Sheet - Only in evaluate mode */}
{enableIntegratedViewer && (
  <PDFViewerSheet
    isOpen={isPdfViewerOpen}
    onOpenChange={setIsPdfViewerOpen}
    documents={rfpDocuments}
    rfpId={rfpId}
    initialDocumentId={pdfInitialDocument}
    initialPage={pdfInitialPage}
  />
)}
```

**⚠️ IMPORTANT** : Changer le return de la fonction pour wrapper avec `<>` fragment :

```diff
 export function VertexRAGSearch({
   rfpId,
   supplierId,
   suppliers = [],
+  enableIntegratedViewer = false, // false par défaut (mode summary)
 }: VertexRAGSearchProps) {
   // ... state ...

   return (
+    <>
       <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
         {/* ... existing card content ... */}
       </Card>

+      {/* PDF Viewer Sheet - Only in evaluate mode */}
+      {enableIntegratedViewer && (
+        <PDFViewerSheet
+          isOpen={isPdfViewerOpen}
+          onOpenChange={setIsPdfViewerOpen}
+          documents={rfpDocuments}
+          rfpId={rfpId}
+          initialDocumentId={pdfInitialDocument}
+          initialPage={pdfInitialPage}
+        />
+      )}
+    </>
   );
 }
```

---

## Modifications dans les Pages d'Utilisation

### 3.1 Summary Page (`app/dashboard/rfp/[rfpId]/summary/page.tsx`)

**Aucune modification** ou passer explicitement `false` :

```tsx
<TabsContent value="search" className="space-y-6">
  {loading ? (
    <Skeleton className="h-96 rounded-2xl" />
  ) : (
    <VertexRAGSearch
      rfpId={rfpId}
      suppliers={suppliersForExport.map((s) => ({ id: s.id, name: s.name }))}
      // enableIntegratedViewer={false} - Par défaut, mode nouvel onglet
    />
  )}
</TabsContent>
```

**Comportement** : Les PDFs s'ouvrent dans un nouvel onglet (pas d'annotations)

### 3.2 Evaluate Page (`app/dashboard/rfp/[rfpId]/evaluate/page.tsx`)

**Modification : Passer `enableIntegratedViewer={true}`**

Trouver le composant `VertexRAGSearch` dans le Sheet drawer (autour de la ligne ~611) :

```diff
 <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
   <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
     <div className="py-6">
       <VertexRAGSearch
         rfpId={params.rfpId}
         supplierId={supplierId || undefined}
         suppliers={suppliers}
+        enableIntegratedViewer={true}
       />
     </div>
   </SheetContent>
 </Sheet>
```

**Comportement** : Le PDF viewer intégré s'ouvre avec annotations et navigation vers la page spécifique

---

## Tests End-to-End

### Scénario 1 : Recherche dans Summary (Nouvel Onglet)

**Contexte** : Page `/dashboard/rfp/{rfpId}/summary`, onglet "Recherche"

1. **Action** : Entrer "Quel est le planning ?" et rechercher
2. **Action** : Cliquer sur "Voir PDF" pour la source [2]
3. **Vérifier** :
   - ✅ PDF s'ouvre dans un nouvel onglet
   - ✅ URL est une signed URL GCS
   - ✅ Pas de viewer intégré

### Scénario 2 : Recherche dans Evaluate (Viewer Intégré)

**Contexte** : Page `/dashboard/rfp/{rfpId}/evaluate`, drawer recherche ouvert

1. **Action** : Entrer "Quel est le planning ?" et rechercher
2. **Action** : Cliquer sur "Voir PDF" pour la source [2] (page 24)
3. **Vérifier** :
   - ✅ PDF viewer drawer s'ouvre sur le côté droit
   - ✅ Document correct sélectionné
   - ✅ PDF s'ouvre directement à la page 24
   - ✅ Toolbar affiche "24 / XX"
   - ✅ Annotations visibles si disponibles

### Scénario 3 : Navigation entre Sources (Evaluate)

**Contexte** : Suite du scénario 2, PDF viewer ouvert

1. **Action** : Fermer le PDF viewer (bouton X)
2. **Action** : Cliquer sur "Voir PDF" pour source [4] (page 12, document différent)
3. **Vérifier** :
   - ✅ PDF viewer se rouvre
   - ✅ Nouveau document sélectionné
   - ✅ Ouvre à la page 12

### Scénario 4 : Z-Index (Pas de Conflit)

**Contexte** : Evaluate page avec drawer de recherche ouvert

1. **Action** : Ouvrir un PDF depuis les résultats de recherche
2. **Vérifier** :
   - ✅ PDF viewer apparaît correctement
   - ✅ Backdrop gris couvre tout
   - ✅ Pas de problème de z-index

---

## Considérations Techniques

### 1. Performance

**Query Documents Conditionnel** :
- `enabled: enableIntegratedViewer` évite requête inutile dans summary
- Cache React Query partagé avec autres composants (ex: ComparisonView)

### 2. Z-Index

**PDFViewerSheet** : `z-40` (drawer) + `z-30` (backdrop)
**Sheet de recherche** : `z-40`

**Résultat** : Le PDF viewer couvre tout, pas de conflit.

### 3. Signed URLs

**Question** : Faut-il encore générer `signedUrl` dans le backend pour summary ?

**Réponse** : **OUI**, car :
- Nécessaire pour mode summary (nouvel onglet)
- Pas de coût significatif
- Flexibilité future

---

## Checklist d'Implémentation

- [ ] **Frontend : Modifier VertexRAGSearch.tsx**
  - [ ] Ajouter prop `enableIntegratedViewer?: boolean` à l'interface
  - [ ] Ajouter imports (`PDFViewerSheet`, `PDFDocument`)
  - [ ] Ajouter state (`isPdfViewerOpen`, `pdfInitialDocument`, `pdfInitialPage`)
  - [ ] Ajouter query React Query pour documents (avec `enabled: enableIntegratedViewer`)
  - [ ] Modifier bouton "Voir PDF" (logique conditionnelle)
  - [ ] Ajouter `<PDFViewerSheet />` conditionnel dans le return
  - [ ] Wrapper return avec fragment `<>...</>`

- [ ] **Frontend : Modifier Evaluate Page**
  - [ ] Ajouter `enableIntegratedViewer={true}` au composant VertexRAGSearch

- [ ] **Tests End-to-End**
  - [ ] Tester mode summary (nouvel onglet)
  - [ ] Tester mode evaluate (viewer intégré + navigation vers page)
  - [ ] Tester navigation entre plusieurs sources
  - [ ] Vérifier z-index et overlay
  - [ ] Tester sur mobile/desktop

---

## Estimation Temps

- **Modifications Frontend** : 30 minutes
- **Tests E2E** : 20 minutes

**Total estimé** : ~50 minutes

---

## Résumé des Changements

### Fichier : `components/VertexRAGSearch.tsx`

1. **Interface** : Ajouter prop `enableIntegratedViewer?: boolean`
2. **Imports** : Ajouter `PDFViewerSheet` et `PDFDocument`
3. **State** : Ajouter state pour PDF viewer
4. **Query** : Ajouter query documents (conditionnel)
5. **Bouton** : Logique conditionnelle (intégré vs nouvel onglet)
6. **Render** : Ajouter `<PDFViewerSheet />` conditionnel

### Fichier : `app/dashboard/rfp/[rfpId]/evaluate/page.tsx`

1. **Props** : Passer `enableIntegratedViewer={true}` au composant VertexRAGSearch

### Fichier : `app/dashboard/rfp/[rfpId]/summary/page.tsx`

Aucune modification (comportement par défaut = nouvel onglet)

---

## Conclusion

Cette solution offre le **meilleur des deux mondes** :

- **Summary** : Vue simple et rapide avec ouverture dans nouvel onglet
- **Evaluate** : Expérience complète avec annotations et navigation précise

✅ **Prêt pour implémentation immédiate**
