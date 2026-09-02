import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ImportWithStepper } from "@/components/ImportWithStepper";

interface JsonImportPageProps {
  params: {
    rfpId: string;
  };
}

/**
 * The former import screen, kept as the escape hatch for data that is already
 * structured (an export from another tool, a payload prepared by hand). The
 * everyday path is the preparation hub one level up.
 */
export default function JsonImportPage({ params }: JsonImportPageProps) {
  return (
    <div className="min-h-screen bg-slate-50 py-8 dark:bg-slate-950">
      <div className="mx-auto mb-4 max-w-5xl px-6">
        <Link
          href={`/dashboard/rfp/${params.rfpId}/import`}
          className="flex w-fit items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Retour à la préparation
        </Link>
      </div>
      <ImportWithStepper rfpId={params.rfpId} />
    </div>
  );
}
