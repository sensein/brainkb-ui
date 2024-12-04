import {OAuthUserConfig, OAuthConfig} from "next-auth/providers/oauth";

interface ORCIDProfile {
    sub: string; // User's ORCID identifier (ORCID iD)
    name?: string; // Optional: Full name
    email?: string; // Optional: Email address
    given_name?: string; // Optional: First name
    family_name?: string; // Optional: Last name
    picture?: string; // Optional: Profile picture or URL
    url?: string; // Optional: ORCID URL
}

export default function ORCID<P extends ORCIDProfile>(
    options: OAuthUserConfig<P>
): OAuthConfig<P> {
    return {
        id: "orcid",
        name: "ORCID",
        type: "oauth",
        wellKnown: "https://orcid.org/.well-known/openid-configuration",
        authorization: {
            params: {
                scope: "openid email profile",
            },
        },
        idToken: true,
        checks: ["pkce", "state"],
        userinfo: {
            url: "https://orcid.org/oauth/userinfo",
            async request({client, tokens}) {
                const profile = await client.userinfo(tokens.access_token!);

                // Fallback for missing fields
                profile.name =
                    profile.name ||
                    `${profile.given_name || ""} ${profile.family_name || ""}`.trim();
                profile.url = `https://orcid.org/${profile.sub}`; // Construct ORCID URL

                return profile as ORCIDProfile;
            },
        },
        profile(profile) {
            return {
                id: profile.sub, // ORCID ID
                name: profile.name, // Full name or fallback
                email: profile.email, // Email or fallback
                image: profile.picture, // Optional profile picture
                url: profile.url, // ORCID URL
            };
        },
        options,
    };
}