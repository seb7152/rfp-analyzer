/**
 * The OpenRouter balance, checked before a launch so an empty account is
 * told at the click and not discovered in a failed job an hour later.
 * A short cache: every launch route asks, the balance moves slowly.
 */

import { NextResponse } from "next/server";

const OPENROUTER_CREDITS = "https://openrouter.ai/api/v1/credits";
const CACHE_MS = 60_000;
/** Below this, a job's max_tokens is refused by OpenRouter (Sonnet-class output at 48 k tokens ≈ 0,7 $). */
export const CREDIT_FLOOR_USD = 2;

export interface CreditsInfo {
  total: number;
  usage: number;
  remaining: number;
  checkedAt: string;
}

let cache: { at: number; info: CreditsInfo | null } | null = null;

/** The balance, or null when the key has no balance to read (network error, unlimited key). */
export async function readOpenRouterCredits(): Promise<CreditsInfo | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.info;
  let info: CreditsInfo | null = null;
  try {
    const res = await fetch(OPENROUTER_CREDITS, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(5_000) });
    if (res.ok) {
      const body = (await res.json()) as { data?: { total_credits?: number; total_usage?: number } };
      const total = Number(body.data?.total_credits ?? NaN);
      const usage = Number(body.data?.total_usage ?? NaN);
      if (Number.isFinite(total) && Number.isFinite(usage)) info = { total, usage, remaining: total - usage, checkedAt: new Date().toISOString() };
    }
  } catch {
    info = null;
  }
  cache = { at: Date.now(), info };
  return info;
}

export function formatCredits(usd: number): string {
  return `${usd.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}

/**
 * The 402 answer of a launch route when the balance cannot pay a job, null
 * otherwise. An unreadable balance never blocks: the job would say.
 */
export async function creditsGuard(): Promise<NextResponse | null> {
  const info = await readOpenRouterCredits();
  if (!info || info.remaining >= CREDIT_FLOOR_USD) return null;
  const left = info.remaining <= 0 ? "Le compte OpenRouter est à zéro" : `Il reste ${formatCredits(info.remaining)} sur le compte OpenRouter`;
  return NextResponse.json(
    { error: `${left} : rechargez-le (openrouter.ai › Credits) avant de lancer. Un travail refusé pour crédit insuffisant échoue sans consommer.`, credits: info },
    { status: 402 }
  );
}

/** Forget the cached balance, after a job reports a 402: the next launch re-reads it. */
export function forgetCredits(): void {
  cache = null;
}
