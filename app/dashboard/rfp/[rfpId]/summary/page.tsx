import { redirect } from "next/navigation";

/**
 * The ten-tab summary was split into chapters. Deep links keep working:
 * each former tab maps to the chapter that hosts it now.
 */
const TAB_ROUTES: Record<string, string> = {
  dashboard: "suivi",
  weights: "parametres#ponderations",
  requirements: "referentiel",
  analysis: "decision",
  soutenances: "soutenances",
  export: "export",
  financial: "financial-grid",
  analysts: "parametres#analystes",
  versions: "parametres#versions",
  settings: "parametres#consultation",
};

export default function SummaryPage({
  params,
  searchParams,
}: {
  params: { rfpId: string };
  searchParams: { tab?: string };
}) {
  const target = TAB_ROUTES[searchParams.tab ?? ""] ?? "";
  redirect(`/dashboard/rfp/${params.rfpId}/${target}`);
}
