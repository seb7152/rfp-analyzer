import { AnalysisChapter } from "@/components/preparation/AnalysisChapter";

export default function AnalysePage({ params }: { params: { rfpId: string } }) {
  return <AnalysisChapter rfpId={params.rfpId} />;
}
