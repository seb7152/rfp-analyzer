"use client";

import { Card } from "@/components/ui/card";
import { RFPDocumentUpload } from "@/components/RFPDocumentUpload";

interface DocumentsContentProps {
  rfpId: string;
}

export default function DocumentsContent({ rfpId }: DocumentsContentProps) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Ajouter un document PDF</h2>
      <RFPDocumentUpload
        rfpId={rfpId}
        onUploadSuccess={() => {
          // Reload the page to show the new document
          window.location.reload();
        }}
      />
    </Card>
  );
}
