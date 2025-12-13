import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      accountId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    accountId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accountId?: string | null;
  }
}
