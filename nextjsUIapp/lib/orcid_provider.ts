import { OAuthUserConfig, OAuthConfig } from "next-auth/providers/oauth";

interface ORCIDProfile {
  sub: string;
  name: string;
  email: string;
  picture?: string;
}

const ORCIDProvider = (options:  OAuthUserConfig<ORCIDProfile>): OAuthConfig<ORCIDProfile> => ({
  id: "orcid",
  name: "ORCID",
  type: "oauth",
  wellKnown: "https://orcid.org/.well-known/openid-configuration",
  authorization: { params: { scope: "/authenticate" } },
  idToken: true,
  checks: ["pkce", "state"],
  profile(profile: any) {
    console.log('ORCID_CLIENT_ID:', process.env.ORCID_CLIENT_ID);

    console.log('ORCID Profile Response:', profile);
    return {
      id: profile.sub,
      name: profile.name,
      email: profile.email,
    };
  },
  clientId: options.clientId, // Pass clientId from options
  clientSecret: options.clientSecret, // Pass clientSecret from options
});

export default ORCIDProvider;
