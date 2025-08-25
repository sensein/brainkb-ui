export interface Activity {
  id: number;
  profile_id: number;
  activity_type: string;
  description: string;
  created_at: string;
  meta_data?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  location?: string | null;
  isp?: string | null;
  as_info?: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserProfile {
  email: string;
  orcid_id: string;
  [key: string]: any;
}
