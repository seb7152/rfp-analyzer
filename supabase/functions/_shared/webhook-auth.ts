function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

export function isValidWebhookRequest(request: Request): boolean {
  const secret = Deno.env.get("N8N_WEBHOOK_TOKEN");
  const token = request.headers.get("x-n8n-token");

  return Boolean(secret && token && constantTimeEqual(token, secret));
}
