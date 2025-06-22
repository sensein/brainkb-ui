import GithubProvider from "next-auth/providers/github";
import ORCIDProvider from "@/lib/orcid_provider";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
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

