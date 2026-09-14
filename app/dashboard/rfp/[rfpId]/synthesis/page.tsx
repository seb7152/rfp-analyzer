import { redirect } from "next/navigation";

/** The read-only synthesis is the decision view now. */
export default function SynthesisPage({ params }: { params: { rfpId: string } }) {
  redirect(`/dashboard/rfp/${params.rfpId}/decision`);
}
