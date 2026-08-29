function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

export function verifyWebhookToken(
  providedToken: string | null,
  secret: string | undefined
): boolean {
  return Boolean(secret && providedToken && constantTimeEqual(providedToken, secret));
}

export function getBearerToken(authorization: string | null): string | null {
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length);
}

/** Header required by n8n's Header Auth credential for application triggers. */
export function createN8nWebhookHeaders(secret: string | undefined): HeadersInit {
  if (!secret) {
    throw new Error("N8N_WEBHOOK_SECRET environment variable is not configured");
  }

  return {
    "Content-Type": "application/json",
    "x-n8n-token": secret,
  };
}
