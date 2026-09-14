import { DecisionView } from "@/components/decision/DecisionView";

export default function DecisionPage({ params }: { params: { rfpId: string } }) {
  return <DecisionView rfpId={params.rfpId} />;
}
