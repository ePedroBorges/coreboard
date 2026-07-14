import { describe, expect, it } from "vitest";
import { buildPaymentLinkUrl } from "@/lib/paymentLinks";

describe("buildPaymentLinkUrl", () => {
  it.each([
    ["pro_monthly", "00wdR810cdOYfwC0sl0co00"],
    ["pro_yearly", "4gM00i5gs3ak5W22At0co01"],
    ["pro_lifetime", "00w6oGfV6dOY1FMejb0co02"],
  ] as const)("builds a secure live link for %s", (planId, linkId) => {
    const result = new URL(buildPaymentLinkUrl(planId, "user_123", " Pedro@Example.com "));

    expect(result.origin).toBe("https://buy.stripe.com");
    expect(result.pathname).toBe(`/${linkId}`);
    expect(result.searchParams.get("client_reference_id")).toBe("user_123");
    expect(result.searchParams.get("locked_prefilled_email")).toBe("pedro@example.com");
    expect(result.searchParams.get("locale")).toBe("pt-BR");
  });

  it("rejects checkout without an account email", () => {
    expect(() => buildPaymentLinkUrl("pro_monthly", "user_123", "")).toThrow(/e-mail valido/i);
  });
});

