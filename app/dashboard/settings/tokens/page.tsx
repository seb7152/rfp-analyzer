import { redirect } from "next/navigation";

/** The tokens moved under Agents & IA › MCP. */
export default function TokensRedirect() {
  redirect("/dashboard/agents/mcp");
}
