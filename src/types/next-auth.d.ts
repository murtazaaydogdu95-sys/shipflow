import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      orgId?: string | null;
      onboardingCompleted?: boolean;
      isAdmin?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    orgId?: string | null;
    onboardingCompleted?: boolean;
    isAdmin?: boolean;
    requires2FA?: boolean;
  }
}
