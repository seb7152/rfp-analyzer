'use client';

import { PDFViewerWithAnnotations } from '@/components/pdf/PDFViewerWithAnnotations';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Page de test pour le système d'annotations PDF
 *
 * Pour tester :
 * 1. Récupérer l'URL d'un PDF de votre API
 * 2. Entrer les informations dans les champs
 * 3. Cliquer sur "Charger le PDF"
 * 4. Tester les annotations !
 */
export default function TestPDFAnnotationsPage() {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [documentId, setDocumentId] = useState<string>('');
  const [organizationId, setOrganizationId] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  const handleLoadPDF = () => {
    if (pdfUrl && documentId && organizationId) {
      setIsReady(true);
    } else {
      alert('Veuillez remplir tous les champs');
    }
  };

  const handleReset = () => {
    setIsReady(false);
    setPdfUrl('');
    setDocumentId('');
    setOrganizationId('');
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">🧪 Test des Annotations PDF</h1>
          <p className="text-gray-600 mb-8">
            Page de test pour essayer le système d'annotations PDF
          </p>

          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                URL du PDF
              </label>
              <Input
                type="text"
                placeholder="https://example.com/document.pdf ou URL signée"
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Astuce : Utilisez /api/rfps/[rfpId]/documents/[docId]/view-url pour obtenir une URL signée
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Document ID
              </label>
              <Input
                type="text"
                placeholder="uuid-du-document"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                L'ID du document dans votre base de données
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Organization ID
              </label>
              <Input
                type="text"
                placeholder="uuid-de-l-organisation"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                L'ID de votre organisation (pour les permissions)
              </p>
            </div>

            <Button onClick={handleLoadPDF} className="w-full" size="lg">
              📄 Charger le PDF
            </Button>
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              📚 Comment obtenir ces informations ?
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>URL du PDF</strong> : Via votre API de documents</li>
              <li>• <strong>Document ID</strong> : Depuis la table rfp_documents</li>
              <li>• <strong>Organization ID</strong> : Depuis votre session utilisateur</li>
            </ul>
          </div>

          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">
              ⚠️ Avant de commencer
            </h3>
            <p className="text-sm text-yellow-800">
              Assurez-vous d'avoir appliqué la migration de base de données :
              <code className="block mt-2 bg-yellow-100 p-2 rounded">
                cd supabase && npx supabase db push
              </code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">🧪 Test des Annotations PDF</h1>
          <p className="text-sm text-gray-600">
            Essayez de surligner du texte, créer des signets et ajouter des notes !
          </p>
        </div>
        <Button variant="outline" onClick={handleReset}>
          ← Retour
        </Button>
      </div>

      {/* Instructions rapides */}
      <div className="bg-blue-50 border-b px-6 py-2">
        <div className="flex gap-6 text-sm">
          <span>🖍️ <strong>Surligner</strong> : Sélectionnez du texte</span>
          <span>📌 <strong>Signet</strong> : Cliquez dans le document</span>
          <span>📝 <strong>Note</strong> : Cliquez sur une annotation existante</span>
        </div>
      </div>

      {/* PDF Viewer avec annotations */}
      <div className="flex-1">
        <PDFViewerWithAnnotations
          url={pdfUrl}
          documentId={documentId}
          organizationId={organizationId}
          showAnnotationPanel={true}
        />
      </div>
    </div>
  );
}
