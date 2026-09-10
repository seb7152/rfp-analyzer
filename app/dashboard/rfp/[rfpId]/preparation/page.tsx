import { PreparationHub } from "@/components/preparation/PreparationHub";

export default function PreparationPage({
  params,
}: {
  params: { rfpId: string };
}) {
  return <PreparationHub rfpId={params.rfpId} />;
}
