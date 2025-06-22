import GithubProvider from "next-auth/providers/github";
import ORCIDProvider from "@/lib/orcid_provider";
import crypto from "crypto";

// Generate a strong fallback secret
const generateFallbackSecret = () => {
  return crypto.randomBytes(32).toString('base64');
};

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET || generateFallbackSecret(),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    }),
    ORCIDProvider({
      clientId: process.env.ORCID_CLIENT_ID as string,
      clientSecret: process.env.ORCID_CLIENT_SECRET as string,
    }),
  ],
};

