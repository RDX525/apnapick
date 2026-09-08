/**
 * Verification provider abstraction.
 * Do not couple the product to a single SMS/email/doc vendor.
 */

export type VerificationProviderId =
  | "manual_admin"
  | "manual_document"
  | "email"
  | "phone"
  | "external_business"
  | "admin_override";

export type VerificationContext = {
  claimId: string;
  businessId: string;
  userId: string;
  email?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown>;
};

export type VerificationSession = {
  sessionId: string;
  provider: VerificationProviderId;
  status: "started" | "pending" | "verified" | "failed";
  message?: string;
};

export type VerificationResult = {
  success: boolean;
  provider: VerificationProviderId;
  sessionId?: string;
  externalRef?: string;
  message?: string;
  raw?: Record<string, unknown>;
};

export interface VerificationProvider {
  id: VerificationProviderId;
  start(context: VerificationContext): Promise<VerificationSession>;
  check(sessionId: string): Promise<VerificationResult>;
}

export class ManualAdminVerificationProvider implements VerificationProvider {
  id: VerificationProviderId = "manual_admin";

  async start(context: VerificationContext): Promise<VerificationSession> {
    return {
      sessionId: `admin:${context.claimId}`,
      provider: this.id,
      status: "pending",
      message: "Queued for admin verification",
    };
  }

  async check(sessionId: string): Promise<VerificationResult> {
    return {
      success: false,
      provider: this.id,
      sessionId,
      message: "Awaiting admin review",
    };
  }
}

export class ManualDocumentVerificationProvider implements VerificationProvider {
  id: VerificationProviderId = "manual_document";

  async start(context: VerificationContext): Promise<VerificationSession> {
    return {
      sessionId: `doc:${context.claimId}`,
      provider: this.id,
      status: "pending",
      message: "Upload a business document for review",
    };
  }

  async check(sessionId: string): Promise<VerificationResult> {
    return {
      success: false,
      provider: this.id,
      sessionId,
      message: "Document under review",
    };
  }
}

export class AdminOverrideVerificationProvider implements VerificationProvider {
  id: VerificationProviderId = "admin_override";

  async start(context: VerificationContext): Promise<VerificationSession> {
    return {
      sessionId: `override:${context.claimId}`,
      provider: this.id,
      status: "verified",
      message: "Admin override verification recorded",
    };
  }

  async check(sessionId: string): Promise<VerificationResult> {
    return {
      success: true,
      provider: this.id,
      sessionId,
      message: "Verified by admin override",
    };
  }
}

/** Future: email OTP, phone OTP, third-party KYB — register here. */
const PROVIDERS: Record<VerificationProviderId, () => VerificationProvider> = {
  manual_admin: () => new ManualAdminVerificationProvider(),
  manual_document: () => new ManualDocumentVerificationProvider(),
  admin_override: () => new AdminOverrideVerificationProvider(),
  email: () => new ManualAdminVerificationProvider(),
  phone: () => new ManualAdminVerificationProvider(),
  external_business: () => new ManualAdminVerificationProvider(),
};

export function getVerificationProvider(
  id: VerificationProviderId = "manual_admin",
): VerificationProvider {
  return (PROVIDERS[id] ?? PROVIDERS.manual_admin)();
}

/** @deprecated Prefer VerificationProvider.start/check */
export type VerificationRequest = VerificationContext & {
  provider: VerificationProviderId;
  payload?: Record<string, unknown>;
};
