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
    // "SessionExpired" once the backend credential behind this session is gone and
    // cannot be renewed. SessionExpiryWatcher turns it into a single sign-out.
    error?: "SessionExpired";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendToken?: string;
    backendRefreshToken?: string | null;
    backendTokenExp?: number;
    profileId?: number | null;
    userId?: number | null;
    roles?: string[];
    scopes?: string[];
    authSource?: string;
    error?: "SessionExpired";
  }
}
