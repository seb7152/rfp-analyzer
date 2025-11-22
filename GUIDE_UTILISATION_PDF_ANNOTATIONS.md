# Guide d'utilisation - Lecteur PDF avec Annotations

## 🎯 Ce qui a été configuré

✅ Le provider `PDFAnnotationProvider` a été ajouté dans `app/providers.tsx`
✅ Tous les composants sont prêts à l'emploi

## 📖 3 façons d'utiliser le lecteur PDF

### Option 1 : Remplacement simple de PDFViewerSheet (RECOMMANDÉ)

Si vous voulez juste remplacer votre viewer actuel par le nouveau avec annotations :

```tsx
// Avant
import { PDFViewerSheet } from "@/components/PDFViewerSheet";

// Après - créer un nouveau wrapper
import { PDFViewerWithAnnotations } from "@/components/pdf/PDFViewerWithAnnotations";

// Dans votre composant
<PDFViewerWithAnnotations
  url={pdfUrl}
  documentId={documentId}
  organizationId={organizationId}
  initialPage={1}
  showAnnotationPanel={true}
/>;
```

### Option 2 : Dans une page dédiée (pour tester)

Créez une page de test pour essayer le système :

```tsx
// app/test-pdf/page.tsx
"use client";

import { PDFViewerWithAnnotations } from "@/components/pdf/PDFViewerWithAnnotations";
import { useState, useEffect } from "react";

export default function TestPDFPage() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);

  // Charger un PDF depuis votre API
  useEffect(() => {
    async function loadPDF() {
      const response = await fetch(
        "/api/rfps/YOUR_RFP_ID/documents/YOUR_DOC_ID/view-url",
      );
      const data = await response.json();
      setPdfUrl(data.url);
      setDocumentId("YOUR_DOC_ID");
    }
    loadPDF();
  }, []);

  if (!pdfUrl || !documentId) {
    return <div className="p-8">Chargement...</div>;
  }

  return (
    <div className="h-screen">
      <PDFViewerWithAnnotations
        url={pdfUrl}
        documentId={documentId}
        organizationId="YOUR_ORG_ID" // Récupérer depuis le contexte utilisateur
        showAnnotationPanel={true}
      />
    </div>
  );
}
```

### Option 3 : Intégration dans PDFViewerSheet (mise à jour progressive)

Modifiez votre `PDFViewerSheet.tsx` existant pour utiliser le nouveau viewer :

```tsx
// components/PDFViewerSheet.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, ChevronRight } from "lucide-react";
import { PDFViewerWithAnnotations } from "./pdf/PDFViewerWithAnnotations";

export interface PDFDocument {
  id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
}

interface PDFViewerSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  documents: PDFDocument[];
  rfpId?: string;
  organizationId: string; // NOUVEAU: ajouter l'organizationId
  requirementId?: string; // OPTIONNEL: pour filtrer les annotations
}

export function PDFViewerSheet({
  isOpen,
  onOpenChange,
  documents,
  rfpId,
  organizationId,
  requirementId,
}: PDFViewerSheetProps) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const pdfDocuments = documents.filter(
    (doc) => doc.mime_type === "application/pdf",
  );
  const selectedDoc = pdfDocuments.find((doc) => doc.id === selectedDocId);

  // Charger le PDF quand le document change
  useEffect(() => {
    if (!selectedDoc || !rfpId) {
      setPdfUrl(null);
      return;
    }

    async function fetchPdfUrl() {
      try {
        const response = await fetch(
          `/api/rfps/${rfpId}/documents/${selectedDoc.id}/view-url`,
        );
        const data = await response.json();
        setPdfUrl(data.url);
      } catch (err) {
        console.error("Error fetching PDF URL:", err);
      }
    }

    fetchPdfUrl();
  }, [selectedDoc, rfpId]);

  if (pdfDocuments.length === 0) return null;

  return (
    <>
      <div
        className={`fixed top-0 right-0 bottom-0 w-1/2 bg-white border-l transition-transform duration-300 z-40 flex flex-col ${
          isOpen && !isMinimized ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header avec sélecteur */}
        <div className="border-b px-6 py-3 flex items-center justify-between gap-4">
          <Select value={selectedDocId || ""} onValueChange={setSelectedDocId}>
            <SelectTrigger className="flex-1 max-w-xs">
              <SelectValue placeholder="Sélectionner un PDF" />
            </SelectTrigger>
            <SelectContent>
              {pdfDocuments.map((doc) => (
                <SelectItem key={doc.id} value={doc.id}>
                  {doc.original_filename || doc.filename}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(true)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* NOUVEAU Viewer avec annotations */}
        <PDFViewerWithAnnotations
          url={pdfUrl}
          documentId={selectedDocId}
          organizationId={organizationId}
          requirementId={requirementId}
          showAnnotationPanel={true}
          className="flex-1"
        />
      </div>

      {/* Overlay */}
      {isOpen && !isMinimized && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Bouton minimisé */}
      {isMinimized && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button onClick={() => setIsMinimized(false)}>
            <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
            Lecteur PDF
          </Button>
        </div>
      )}
    </>
  );
}
```

## 🎨 Utilisation dans ComparisonView (afficher les annotations)

Dans votre interface d'évaluation, ajoutez une section pour voir les annotations :

```tsx
// components/ComparisonView.tsx
import { AnnotationList } from "@/components/pdf/annotations/AnnotationList";
import { usePDFAnnotations } from "@/components/pdf/hooks/usePDFAnnotations";

function ComparisonView(
  {
    /* vos props */
  },
) {
  const currentRequirement = requirements[currentIndex];

  // Récupérer les annotations du document du fournisseur actuel
  const { annotations } = usePDFAnnotations(
    currentSupplierDocumentId, // ID du document PDF du fournisseur
    organizationId,
  );

  return (
    <div>
      {/* Votre interface existante */}

      {/* NOUVEAU : Section des preuves documentaires */}
      <div className="mt-6 border-t pt-4">
        <h3 className="text-sm font-semibold mb-3">📎 Preuves documentaires</h3>
        <AnnotationList
          annotations={annotations}
          requirementId={currentRequirement?.id}
          compact
        />
      </div>
    </div>
  );
}
```

## 🔄 Navigation bidirectionnelle

Pour naviguer depuis une annotation vers le PDF :

```tsx
import { usePDFAnnotationNavigation } from "@/components/pdf/contexts/PDFAnnotationContext";

function MyComponent() {
  const { navigateToAnnotation } = usePDFAnnotationNavigation();

  const handleShowInPDF = (annotation) => {
    navigateToAnnotation({
      documentId: annotation.documentId,
      pageNumber: annotation.pageNumber,
      annotationId: annotation.id,
      highlight: true, // Active l'animation
    });
  };

  return (
    <button onClick={() => handleShowInPDF(annotation)}>
      📄 Voir dans le PDF
    </button>
  );
}
```

## 📝 Props du composant PDFViewerWithAnnotations

```typescript
interface PDFViewerWithAnnotationsProps {
  url: string | null; // URL signée du PDF
  documentId: string | null; // ID du document dans la DB
  organizationId: string; // ID de l'organisation (pour RLS)
  initialPage?: number; // Page initiale (défaut: 1)
  requirementId?: string; // Pour filtrer les annotations
  onPageChange?: (page: number) => void; // Callback changement de page
  className?: string; // Classes CSS additionnelles
  showAnnotationPanel?: boolean; // Afficher le panel latéral (défaut: true)
}
```

## 🎯 Fonctionnalités disponibles

### En tant qu'utilisateur :

1. **Mode Surlignage** 🖍️
   - Cliquer sur "Surligner"
   - Sélectionner du texte dans le PDF
   - Choisir une couleur
   - Ajouter une note (optionnel)

2. **Mode Signet** 📌
   - Cliquer sur "Signet"
   - Cliquer à l'endroit désiré dans le PDF
   - Ajouter une note

3. **Rechercher des annotations** 🔍
   - Utiliser la barre de recherche dans le panel
   - Filtrer par type (surlignage/signet/note)
   - Groupées par page

4. **Naviguer vers une annotation**
   - Cliquer sur une annotation dans la liste
   - Le PDF s'ouvre automatiquement à la bonne page
   - L'annotation est mise en évidence

## 🗄️ Migration de base de données

**IMPORTANT** : Avant d'utiliser, appliquer la migration :

```bash
cd supabase
npx supabase db push
```

Cela créera les tables :

- `pdf_annotations`
- `annotation_groups`
- `annotation_group_members`
- Vue `annotation_details`

## 🐛 Debugging

### Le PDF ne se charge pas

```tsx
// Vérifier que l'URL est valide
console.log("PDF URL:", pdfUrl);

// Vérifier les CORS si PDF externe
// Vérifier que documentId n'est pas null
```

### Les annotations ne s'affichent pas

```tsx
// Vérifier que organizationId est correct
// Vérifier que la migration est appliquée
// Vérifier les policies RLS dans Supabase
```

### Erreur "PDFAnnotationProvider not found"

```tsx
// Vérifier que app/providers.tsx a été mis à jour
// et contient <PDFAnnotationProvider>
```

## 📚 Exemples complets

Consultez :

- `PDF_ANNOTATIONS_README.md` - Documentation technique complète
- `IMPLEMENTATION_PLAN_PDF_ANNOTATIONS.md` - Architecture détaillée

## 🎉 Prêt à utiliser !

Le système est maintenant configuré. Vous pouvez :

1. **Tester** : Créer une page de test (Option 2)
2. **Intégrer progressivement** : Mettre à jour PDFViewerSheet (Option 3)
3. **Utiliser directement** : Remplacer les anciens viewers (Option 1)

Besoin d'aide ? Consultez les fichiers de documentation ou posez vos questions !
