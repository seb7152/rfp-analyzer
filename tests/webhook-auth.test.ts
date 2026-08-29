import { describe, expect, it } from "vitest";
import {
  createN8nWebhookHeaders,
  verifyWebhookToken,
} from "../lib/security/webhook-auth";

describe("webhook token authentication", () => {
  const secret = "test-webhook-secret";

  it("accepts the configured callback token", () => {
    expect(verifyWebhookToken(secret, secret)).toBe(true);
  });

  it("rejects a wrong callback token", () => {
    expect(verifyWebhookToken("wrong-token", secret)).toBe(false);
  });

  it("rejects an absent callback token", () => {
    expect(verifyWebhookToken(null, secret)).toBe(false);
  });

  it("creates the dedicated n8n trigger credential header", () => {
    expect(createN8nWebhookHeaders("trigger-secret")).toEqual({
      "Content-Type": "application/json",
      "x-n8n-token": "trigger-secret",
    });
  });

  it("fails closed when the n8n trigger secret is absent", () => {
    expect(() => createN8nWebhookHeaders(undefined)).toThrow(
      "N8N_WEBHOOK_SECRET environment variable is not configured"
    );
  });
});
