// This file has been replaced by lemonsqueezy.ts
// Re-exporting for backward compatibility with any remaining references
export {
  PLAN_LIMITS,
  lemonSqueezyEnabled as paddleEnabled,
  getCustomerPortalUrl,
  verifyWebhookSignature,
  resolvePlanFromVariantId as resolvePlanFromPriceId,
} from "./lemonsqueezy";

// Re-export the Lemon Squeezy client check as paddle for backward compat
export const paddle = null;
