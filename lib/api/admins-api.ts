import { apiClient } from "./apiClient";
export { listSubnetworks } from "./users-api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  staff_id?: string;
  admin_type: string;
  status: string;
  profile_url?: string;
  created_by?: string;
  created_at?: number;
  subnetwork_ids?: string[];
  department_ids?: string[];
  has_all_cluster?: 0 | 1;
  has_manage_network?: 0 | 1;
  role_id?: string;
  page_ids?: string[];
  profession_name?: string;
  network_id?: string;
  department_id?: string;
}

export interface PortalPage {
  id: string;
  page: string;
  description?: string;
}

export interface DeptItem {
  id: string;
  name: string;
}

export interface ApiCandidateUser {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  staff_id?: string;
  phone_number?: string;
  country_code?: string;
  profile_url?: string;
  rank_name?: string;
  profession_name?: string;
  status?: string;
  exists_hospital_admin_with_same_email?: boolean;
}

// ─── List Admins ──────────────────────────────────────────────────────────────

export interface ListAdminsParams {
  next_token?: string | null;
  status?: string;
  admin_type?: string;
  search_string?: string;
}

export const listAdmins = (params: ListAdminsParams = {}) => {
  const body: Record<string, unknown> = {
    pagination_required: true,
    next_token: params.next_token ?? null,
    order_by: [{ key: "created_at", order: "DESC" }],
  };

  if (params.status) body.status = params.status;
  if (params.admin_type) body.admin_type = params.admin_type;

  if (params.search_string?.trim()) {
    body.search_string = params.search_string;
    body.search_fields = ["first_name", "last_name", "email", "staff_id"];
    delete body.order_by;
  }

  return apiClient("POST", "admin", "listadmins", {
    body,
    shouldUseDefaultToken: false,
  });
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createAdmin = (body: Record<string, unknown>) =>
  apiClient("POST", "admin", "createadmin", {
    body,
    shouldUseDefaultToken: false,
  });

export const updateAdmin = (body: Record<string, unknown>) =>
  apiClient("POST", "admin", "updateadmin", {
    body,
    shouldUseDefaultToken: false,
  });

export const deleteAdmins = (admin_ids: string[]) =>
  apiClient("POST", "admin", "deleteadmin", {
    body: { admin_ids },
    shouldUseDefaultToken: false,
  });

export const resetAdminPassword = (email: string) =>
  apiClient("POST", "admin", "resethospitaladminpassword", {
    body: { email },
    shouldUseDefaultToken: false,
  });

// ─── Reference Data ───────────────────────────────────────────────────────────

export const listPortalPages = () =>
  apiClient("POST", "main_admin", "getportalpage", {
    body: {},
    shouldUseDefaultToken: false,
  });

export const listPageAccessRoles = () =>
  apiClient("POST", "main_admin", "admin/getpageaccessroles", {
    body: { pagination_required: false, next_token: null, order_by: { key: "created_at", order: "DESC" } },
    shouldUseDefaultToken: false,
  });

export const listDepartments = () =>
  apiClient("POST", "admin", "managedepartments", {
    body: { pagination_required: false, next_token: null, action: "list" },
    shouldUseDefaultToken: false,
  });

// ─── User Picker ──────────────────────────────────────────────────────────────

export const listAdminCandidates = (params: {
  next_token?: string | null;
  search_string?: string;
} = {}) => {
  const body: Record<string, unknown> = {
    pagination_required: 1,
    next_token: params.next_token ?? null,
    require: ["email"],
    checks: { exists_hospital_admin_with_same_email: true },
  };

  if (params.search_string?.trim()) {
    body.search_string = params.search_string;
    body.search_fields = [
      "first_name",
      "last_name",
      "email",
      "phone_number",
      "staff_id",
      "concat_cc_phone",
    ];
  }

  return apiClient("POST", "admin", "listusers", {
    body,
    shouldUseDefaultToken: false,
  });
};

// ─── Invite Admin (new user path) ─────────────────────────────────────────────

export const inviteAdmin = (body: Record<string, unknown>) =>
  apiClient("POST", "admin", "inviteadmin", {
    body,
    shouldUseDefaultToken: false,
  });
