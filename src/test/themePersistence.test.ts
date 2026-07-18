import { describe, expect, it } from "vitest";
import { canEnforceFreeAppearance } from "@/lib/appearance";

describe("theme persistence guard", () => {
  it("does not overwrite a saved theme while subscription verification is unavailable", () => {
    expect(canEnforceFreeAppearance({
      storageHydrated: true,
      subscriptionLoading: false,
      subscriptionVerified: false,
      isPro: false,
    })).toBe(false);
  });

  it("only restricts Pro appearance after a confirmed Free result", () => {
    expect(canEnforceFreeAppearance({
      storageHydrated: true,
      subscriptionLoading: false,
      subscriptionVerified: true,
      isPro: false,
    })).toBe(true);
  });
});
