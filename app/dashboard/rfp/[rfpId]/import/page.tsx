import { redirect } from "next/navigation";

/** The preparation hub moved to its own chapter route. */
export default function ImportPage({ params }: { params: { rfpId: string } }) {
  redirect(`/dashboard/rfp/${params.rfpId}/preparation`);
}
