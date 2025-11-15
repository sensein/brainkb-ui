import NextAuth from "next-auth"

declare module "next-auth" {
  interface User {
    id?: string
    orcid_id?: string
    name?: string | null
    email?: string | null
    image?: string | null
  }

  interface Session {
    user: {
      id?: string
      orcid_id?: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    orcid_id?: string
  }
}









