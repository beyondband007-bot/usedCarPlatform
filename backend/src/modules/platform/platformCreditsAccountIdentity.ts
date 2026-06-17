export type PlatformCreditsAccountIdentity =
  | {
      accountScope: "personal";
      creditsUserId: number;
      creditsTenantId: null;
    }
  | {
      accountScope: "tenant";
      creditsUserId: number;
      creditsTenantId: number;
    };

export function resolvePlatformCreditsAccountIdentity(input: {
  creditsUserId?: number | null;
  accountScope?: string | null;
  creditsTenantId?: number | null;
}): PlatformCreditsAccountIdentity | null {
  if (!input.creditsUserId) return null;

  if (input.accountScope === "tenant") {
    if (!input.creditsTenantId) return null;
    return {
      accountScope: "tenant",
      creditsUserId: input.creditsUserId,
      creditsTenantId: input.creditsTenantId,
    };
  }

  return {
    accountScope: "personal",
    creditsUserId: input.creditsUserId,
    creditsTenantId: null,
  };
}
