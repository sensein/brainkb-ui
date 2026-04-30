import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    orcid_id?: string | null;
    backendToken?: string;
    profileId?: number | null;
    userId?: number | null;
    roles?: string[];
    scopes?: string[];
    authSource?: string;
  }

  interface Session {
    user: {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      orcid_id?: string | null;
    };
    // Backend-issued JWT used to call usermanagement_service endpoints
    backendToken?: string;
    profileId?: number | null;
    userId?: number | null;
    roles?: string[];
    scopes?: string[];
    authSource?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendToken?: string;
    profileId?: number | null;
    userId?: number | null;
    roles?: string[];
    scopes?: string[];
    authSource?: string;
  }
}
