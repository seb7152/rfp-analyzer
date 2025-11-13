import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import DocumentsContent from "./documents-content";

export default async function RFPDocumentsPage({
  params,
}: {
  params: { rfpId: string };
}) {
  const supabase = await createServerClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { rfpId } = params;

  // Get RFP details
  const { data: rfp, error: rfpError } = await supabase
    .from("rfps")
    .select("id, title, organization_id")
    .eq("id", rfpId)
    .single();

  if (rfpError || !rfp) {
    console.error(`[RFP Documents Page] Error fetching RFP ${rfpId}:`, rfpError || "RFP not found");
    redirect("/dashboard");
  }

  // Fetch documents list
  const { data: documents } = await supabase
    .from("rfp_documents")
    .select("id, filename, document_type, file_size, created_at")
    .eq("rfp_id", rfpId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cahier_charges: "Cahier des charges",
      specifications: "Spécifications",
      technical_brief: "Résumé technique",
      appendix: "Appendice",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{rfp.title}</h1>
          <p className="text-gray-500">Gestion des documents PDF</p>
        </div>
        <Link href={`/dashboard/rfp/${rfpId}/evaluate`}>
          <Button variant="outline">← Retour à l'évaluation</Button>
        </Link>
      </div>

      {/* Upload Section - Client Component */}
      <DocumentsContent rfpId={rfpId} />

      {/* Documents List */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          Documents téléchargés ({documents?.length || 0})
        </h2>

        {documents && documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{doc.filename}</p>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <span>{getDocumentTypeLabel(doc.document_type)}</span>
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>
                      {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    Télécharger
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600">
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucun document téléchargé</p>
            <p className="text-sm text-gray-400 mt-1">
              Commencez par ajouter vos PDFs ci-dessus
            </p>
          </div>
        )}
      </Card>

      {/* Info Box */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Informations</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Les fichiers PDF sont stockés de manière sécurisée dans Google Cloud Storage</li>
          <li>✓ Maximum 50MB par fichier</li>
          <li>✓ Les URLs de téléchargement expirent après 90 secondes pour des raisons de sécurité</li>
          <li>✓ Tous les accès sont enregistrés dans les journaux d'audit</li>
        </ul>
      </Card>
    </div>
  );
}
