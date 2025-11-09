import { ImportWithStepper } from "@/components/ImportWithStepper";

interface ImportPageProps {
  params: {
    rfpId: string;
  };
}

export default function ImportPage({ params }: ImportPageProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8">
      <ImportWithStepper rfpId={params.rfpId} />
    </div>
  );
}
