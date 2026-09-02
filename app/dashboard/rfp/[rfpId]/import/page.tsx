import { PreparationHub } from "@/components/preparation/PreparationHub";

interface ImportPageProps {
  params: {
    rfpId: string;
  };
}

export default function ImportPage({ params }: ImportPageProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PreparationHub rfpId={params.rfpId} />
    </div>
  );
}
