"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageState } from "@/components/shell/PageState";
import { SessionTabs } from "@/components/soutenances/SessionTabs";
import { SessionStamp } from "@/components/soutenances/SessionsPanel";
import { BriefPanel } from "@/components/soutenances/BriefPanel";
import { TranscriptPanel } from "@/components/soutenances/TranscriptPanel";
import { ReportPanel } from "@/components/soutenances/ReportPanel";
import { ProposalsPanel } from "@/components/soutenances/ProposalsPanel";
import { downloadDocx, useSession } from "@/hooks/use-soutenances";
import { sessionMarkdown, sessionTitle } from "@/lib/soutenance/documents";
import { formatDateTime, formatDuration } from "@/lib/format";

/**
 * One séance: brief, transcript, compte rendu, propositions, in the order
 * they happen. The tabs move between the retained suppliers.
 */
export default function SessionPage() {
  const params = useParams();
  const rfpId = params.rfpId as string;
  const supplierId = params.supplierId as string;
  const query = useSession(rfpId, supplierId);
  const [openAt, setOpenAt] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const handled = useCallback(() => setOpenAt(null), []);

  if (query.isLoading) return <PageState kind="loading" title="Chargement de la séance" />;
  if (query.error || !query.data) {
    return (
      <PageState
        kind="error"
        title="La séance n'a pas pu être chargée"
        description={query.error?.message}
        action={
          <Button variant="outline" asChild>
            <Link href={`/dashboard/rfp/${rfpId}/soutenances`}>Retour aux soutenances</Link>
          </Button>
        }
      />
    );
  }
  const detail = query.data;
  const { overview, supplier, session } = detail;
  const canEdit = overview.access === "owner" || overview.access === "admin";
  const canDecide = canEdit || overview.access === "evaluator";
  const mine = overview.sessions.find((s) => s.supplier.id === supplier.id);
  const meta = session?.transcript_meta ?? {};
  const target = overview.targetVersion;

  const exportSession = async () => {
    setExporting(true);
    try {
      await downloadDocx(sessionMarkdown({ overview, supplierName: supplier.name, session, brief: detail.brief, findings: detail.findings }), sessionTitle(overview, supplier.name));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export impossible.");
    } finally {
      setExporting(false);
    }
  };

  const lead = [
    session?.scheduled_at ? `Soutenance du ${formatDateTime(session.scheduled_at)}` : "Séance non datée",
    meta.duration_seconds ? formatDuration(meta.duration_seconds) : null,
    `propositions vers ${target ? `V${target.version_number} · ${target.version_name}` : "la version active"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 pb-8">
      <PageHeader
        title={supplier.name}
        lead={lead}
        className="pb-0"
        actions={
          <>
            {mine && <SessionStamp state={mine.state} />}
            <Button type="button" variant="outline" size="sm" onClick={exportSession} disabled={exporting || (!detail.brief?.report_markdown && !session?.report_markdown)}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exporter la séance
            </Button>
          </>
        }
      >
        <Link href={`/dashboard/rfp/${rfpId}/soutenances`} className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Soutenances
        </Link>
      </PageHeader>
      <SessionTabs rfpId={rfpId} overview={overview} currentId={supplier.id} />
      {supplier.removed && (
        <p className="mx-4 text-xs text-muted-foreground md:mx-8">
          Ce fournisseur a été retiré de la version{supplier.removed.reason ? ` : « ${supplier.removed.reason} »` : ""}. Sa séance reste consultable.
        </p>
      )}
      <BriefPanel rfpId={rfpId} detail={detail} canEdit={canEdit && !supplier.removed} />
      <TranscriptPanel rfpId={rfpId} detail={detail} canEdit={canEdit && !supplier.removed} openAt={openAt} onOpenAtHandled={handled} />
      <ReportPanel rfpId={rfpId} detail={detail} canEdit={canEdit && !supplier.removed} />
      <ProposalsPanel rfpId={rfpId} detail={detail} canDecide={canDecide && !supplier.removed} onQuote={setOpenAt} />
    </div>
  );
}
