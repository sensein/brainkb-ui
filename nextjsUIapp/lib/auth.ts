import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import type { OAuthConfig } from "next-auth/providers";

export const authOptions: AuthOptions = {
  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),

    // GitHub OAuth Provider
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    }),

    // ORCID OAuth Provider
    {
      id: "orcid",
      name: "ORCIDProvider",
      type: "oauth",
      wellKnown: "https://orcid.org/.well-known/openid-configuration", // ORCID OpenID configuration
      authorization: { params: { scope: "/authenticate" } }, // ORCID specific scope
      idToken: true,
      checks: ["pkce", "state"], // Security checks
      clientId: process.env.ORCID_CLIENT_ID as string,
      clientSecret: process.env.ORCID_CLIENT_SECRET as string,
      profile(profile: any) {
        return {
          id: profile.sub, // ORCID iD
          name: profile.name, // User's name
          email: profile.email, // User's email (if available)
          image: profile.picture, // Profile picture (not commonly used in ORCID)
        };
      },
    } as OAuthConfig<any>, // Cast the ORCID provider as an OAuthConfig
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.id = profile.id || token.id; // Save ORCID iD in JWT
        token.name = profile.name || token.name;
        token.email = profile.email || token.email;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id; // Pass ORCID iD (or other provider's ID) to the session
      session.user.name = token.name;
      session.user.email = token.email;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET, // Secret for token signing
};

export default NextAuth(authOptions);
