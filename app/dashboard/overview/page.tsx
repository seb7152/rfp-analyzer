import { redirect } from "next/navigation";

/** The overview duplicated the home; one screen is authoritative now. */
export default function OverviewPage() {
  redirect("/dashboard");
}
