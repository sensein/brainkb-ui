/**
 * Typed wrappers around the usermanagement_service admin/access endpoints.
 *
 * Every call carries the logged-in user's backend JWT (issued by the OAuth
 * callback and stored in the NextAuth session) so the backend can enforce
 * its require_admin / role checks. See UI_INTEGRATION.md §4 for the full
 * endpoint list.
 */

"use client";

import { getSession } from "next-auth/react";
import { env } from "@/src/config/env";

// ─── Domain types ─────────────────────────────────────────────────────────

export interface AvailableRole {
  id?: number;
  name: string;
  description?: string | null;
  category?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export type AvailableRoleInput = Pick<AvailableRole, "name" | "description" | "category" | "is_active">;

export interface Permission {
  id?: number;
  name: string;
  resource: string;
  action: string;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type PermissionInput = Pick<Permission, "name" | "resource" | "action" | "description">;

export interface PageAccess {
  id?: number;
  page_key: string;
  description?: string | null;
  is_public: boolean;
  allowed_roles: string[];
  allowed_user_emails: string[];
  created_at?: string | null;
  updated_at?: string | null;
}

export type PageAccessInput = Omit<PageAccess, "id" | "created_at" | "updated_at">;

export interface AdminUserListItem {
  profile_id: number;
  name: string;
  email: string;
  orcid_id?: string | null;
  roles: string[];
  providers: string[];
  created_at?: string | null;
  is_banned?: boolean;
  banned_at?: string | null;
  banned_by?: number | null;
  ban_reason?: string | null;
}

export interface BanResult {
  profile_id: number;
  is_banned: boolean;
  banned_at?: string | null;
  banned_by?: number | null;
  ban_reason?: string | null;
}

export interface UserRoleInput {
  role: string;
  is_active: boolean;
  expires_at?: string | null;
}

// ─── HTTP plumbing ────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  const token = (session as any)?.backendToken as string | undefined;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = { ...(await authHeaders()), ...(init.headers as Record<string, string> | undefined) };
  const res = await fetch(`${env.userManagementApiBase}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* ignored */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

// ─── Roles ────────────────────────────────────────────────────────────────

export const adminApi = {
  listRoles: () => request<AvailableRole[]>("/api/admin/roles"),
  createRole: (body: AvailableRoleInput) =>
    request<AvailableRole>("/api/admin/roles", { method: "POST", body: JSON.stringify(body) }),
  updateRole: (id: number, body: AvailableRoleInput) =>
    request<AvailableRole>(`/api/admin/roles/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteRole: (id: number) => request<void>(`/api/admin/roles/${id}`, { method: "DELETE" }),
  getRolePermissions: (id: number) => request<Permission[]>(`/api/admin/roles/${id}/permissions`),
  setRolePermissions: (id: number, permission_ids: number[]) =>
    request<Permission[]>(`/api/admin/roles/${id}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ permission_ids }),
    }),

  // Permissions
  listPermissions: () => request<Permission[]>("/api/admin/permissions"),
  createPermission: (body: PermissionInput) =>
    request<Permission>("/api/admin/permissions", { method: "POST", body: JSON.stringify(body) }),
  updatePermission: (id: number, body: PermissionInput) =>
    request<Permission>(`/api/admin/permissions/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deletePermission: (id: number) =>
    request<void>(`/api/admin/permissions/${id}`, { method: "DELETE" }),

  // Page access
  listPageAccess: () => request<PageAccess[]>("/api/admin/page-access"),
  getPageAccess: (page_key: string) =>
    request<PageAccess>(`/api/admin/page-access/${encodeURIComponent(page_key)}`),
  upsertPageAccess: (page_key: string, body: PageAccessInput) =>
    request<PageAccess>(`/api/admin/page-access/${encodeURIComponent(page_key)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deletePageAccess: (page_key: string) =>
    request<void>(`/api/admin/page-access/${encodeURIComponent(page_key)}`, { method: "DELETE" }),

  // Users
  listUsers: (params: { q?: string; role?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.role) qs.set("role", params.role);
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.offset != null) qs.set("offset", String(params.offset));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<AdminUserListItem[]>(`/api/admin/users${suffix}`);
  },
  countUsers: () => request<{ count: number }>("/api/admin/users/count"),
  deleteUser: (profile_id: number) =>
    request<void>(`/api/admin/users/${profile_id}`, { method: "DELETE" }),
  assignRoleToUser: (profile_id: number, body: UserRoleInput) =>
    request<string[]>(`/api/admin/users/${profile_id}/roles`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  removeRoleFromUser: (profile_id: number, role_name: string) =>
    request<string[]>(
      `/api/admin/users/${profile_id}/roles/${encodeURIComponent(role_name)}`,
      { method: "DELETE" },
    ),

  // ─── User bans ─────────────────────────────────────────────────────────
  banUser: (profile_id: number, reason: string) =>
    request<BanResult>(`/api/admin/users/${profile_id}/ban`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  unbanUser: (profile_id: number) =>
    request<BanResult>(`/api/admin/users/${profile_id}/ban`, { method: "DELETE" }),

  // ─── Shared API keys (admin-only) ───────────────────────────────────────
  getOpenRouterKey: (reveal: boolean = false) =>
    request<SharedOpenRouterKeyAdminView>(
      `/api/admin/settings/openrouter-key${reveal ? "?reveal=true" : ""}`,
    ),
  setOpenRouterKey: (body: { api_key: string; allowed_role_names?: string[] | null }) =>
    request<{ has_key: boolean; last_4: string | null; length: number; allowed_role_names: string[] }>(
      "/api/admin/settings/openrouter-key",
      { method: "PUT", body: JSON.stringify(body) },
    ),
  deleteOpenRouterKey: () =>
    request<void>("/api/admin/settings/openrouter-key", { method: "DELETE" }),
};

// Shape returned by GET /api/admin/settings/openrouter-key.
// `plaintext` is only populated when called with reveal=true.
export interface SharedOpenRouterKeyAdminView {
  has_key: boolean;
  last_4: string | null;
  length: number;
  allowed_role_names: string[];
  updated_at: string | null;
  updated_by: number | null;
  plaintext: string | null;
}

// Shape returned by GET /api/settings/openrouter-key/effective (any signed-in user).
// `api_key` is the value the browser should use for OpenRouter calls — never
// render it as plaintext to non-admins.
export interface EffectiveOpenRouterKey {
  source: "shared" | "none";
  api_key: string | null;
  last_4: string | null;
}

export async function getEffectiveOpenRouterKey(): Promise<EffectiveOpenRouterKey> {
  return request<EffectiveOpenRouterKey>("/api/settings/openrouter-key/effective");
}
