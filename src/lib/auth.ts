import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Validate AUTH_SECRET in production at runtime (skip during build)
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PHASE) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required in production. Generate one with: openssl rand -base64 32");
  }
  if (secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters long");
  }
  const placeholders = ["change-me", "your-secret", "placeholder", "docker-dev-secret"];
  if (placeholders.some((p) => secret.toLowerCase().includes(p))) {
    throw new Error("AUTH_SECRET contains a placeholder value. Generate a real secret with: openssl rand -base64 32");
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      authorization: {
        params: { scope: "read:user user:email repo" },
      },
      profile(profile) {
        return {
          id: String(profile.id ?? profile.node_id ?? profile.login),
          name: profile.name ?? profile.login ?? null,
          email: profile.email ?? null,
          image: profile.avatar_url ?? null,
        };
      },
    }),
    Google({}),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        return valid ? user : null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.orgId = token.orgId ?? null;
        session.user.onboardingCompleted = token.onboardingCompleted ?? false;
        session.user.isAdmin = token.isAdmin ?? false;
      }
      return session;
    },
    async jwt({ token, user, trigger, account }) {
      if (user) {
        token.sub = user.id;
      }
      // Reload user data on sign-in, sign-up, and manual update
      // This ensures createUser event has time to set currentOrgId
      if (user || trigger === "update" || trigger === "signIn" || trigger === "signUp") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub! },
          select: { currentOrgId: true, onboardingCompleted: true, isAdmin: true, totpEnabled: true },
        });
        token.orgId = dbUser?.currentOrgId ?? null;
        token.onboardingCompleted = dbUser?.onboardingCompleted ?? false;
        token.isAdmin = dbUser?.isAdmin ?? false;
        token.requires2FA = dbUser?.totpEnabled ?? false;
      }
      // Refresh stored GitHub access_token on re-authentication
      if (account?.provider === "github" && account.access_token && token.sub) {
        await prisma.account.updateMany({
          where: { userId: token.sub, provider: "github" },
          data: {
            access_token: account.access_token,
            refresh_token: account.refresh_token ?? undefined,
            expires_at: account.expires_at ?? undefined,
          },
        });
      }
      return token;
    },
  },
  events: {
    async createUser({ user }) {
      // Auto-create a personal workspace organization for new users
      if (!user.id) return;
      const name = user.name || user.email?.split("@")[0] || "My";
      const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-workspace-${user.id.slice(-6)}`;
      const org = await prisma.organization.create({
        data: {
          name: `${name}'s Workspace`,
          slug,
          isPersonal: true,
          members: {
            create: { userId: user.id, role: "OWNER" },
          },
        },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { currentOrgId: org.id },
      });

      // Auto-accept pending org invites matching this email
      if (user.email) {
        const pendingInvites = await prisma.orgInvite.findMany({
          where: { email: user.email },
        });
        if (pendingInvites.length > 0) {
          const inviteOrgIds = pendingInvites.map((inv) => inv.orgId);
          // Batch fetch existing memberships
          const existingMemberships = await prisma.orgMember.findMany({
            where: { userId: user.id, orgId: { in: inviteOrgIds } },
            select: { orgId: true },
          });
          const existingOrgIds = new Set(existingMemberships.map((m) => m.orgId));
          // Batch create new memberships
          const newMemberships = pendingInvites
            .filter((inv) => !existingOrgIds.has(inv.orgId))
            .map((inv) => ({ userId: user.id!, orgId: inv.orgId, role: inv.role }));
          if (newMemberships.length > 0) {
            await prisma.orgMember.createMany({ data: newMemberships });
          }
          // Batch delete all processed invites
          await prisma.orgInvite.deleteMany({
            where: { id: { in: pendingInvites.map((inv) => inv.id) } },
          });
        }
      }
    },
  },
  pages: {
    signIn: "/login",
  },
});
