import { apiClient } from "./apiClient";

// ─── List Users ────────────────────────────────────────────────────────────

export interface ListUsersParams {
  next_token?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  profession_id?: string | null;
  rank_id?: string | null;
  search_string?: string;
}

export const listUsers = (params: ListUsersParams = {}) => {
  const body: Record<string, unknown> = {
    pagination_required: 1,
    next_token: params.next_token ?? null,
    order_by: [{ key: "created_at", order: "DESC" }],
  };

  if (params.start_date && params.end_date) {
    body.start_date = params.start_date;
    body.end_date = params.end_date;
  }
  if (params.profession_id) body.profession_id = params.profession_id;
  if (params.rank_id) body.rank_id = params.rank_id;

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
    delete body.order_by;
  }

  return apiClient("POST", "admin", "listusers", {
    body,
    shouldUseDefaultToken: false,
  });
};

// ─── CRUD ──────────────────────────────────────────────────────────────────

export const createUser = (body: Record<string, unknown>) =>
  apiClient("POST", "admin", "createuser", {
    body,
    shouldUseDefaultToken: false,
  });

export const updateUser = (body: Record<string, unknown>) =>
  apiClient("POST", "admin", "updateuser", {
    body,
    shouldUseDefaultToken: false,
  });

export const deleteUsers = (user_ids: string[]) =>
  apiClient("POST", "admin", "deleteuser", {
    body: { user_ids },
    shouldUseDefaultToken: false,
  });

// ─── User Removal Flow ─────────────────────────────────────────────────────

export const removeUserFromAllDepartment = (
  user_id: string,
  is_force_delete: boolean
) =>
  apiClient("POST", "ext", "removeuserfromalldepartment", {
    body: { user_id, is_force_delete },
    shouldUseDefaultToken: false,
  });

export const removeUserFromSubnetwork = (user_id: string) =>
  apiClient("POST", "ext", "removeuserfromsubnetwork", {
    body: { user_id },
    shouldUseDefaultToken: false,
  });

// ─── Reference Data ────────────────────────────────────────────────────────

export const listProfessions = () =>
  apiClient("POST", "common", "manageentities", {
    body: { action: "list", entity_type: "profession" },
    shouldUseDefaultToken: false,
  });

export const listRanks = (profession_id: string) =>
  apiClient("POST", "common", "manageentities", {
    body: { action: "list", entity_type: "rank", profession_id },
    shouldUseDefaultToken: false,
  });

export const listSubnetworks = () =>
  apiClient("POST", "admin", "listclustersubnetworks", {
    body: {},
    shouldUseDefaultToken: false,
  });

// ─── Bulk Import ───────────────────────────────────────────────────────────

export interface ListImportFilesParams {
  next_token?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export const listImportFiles = (params: ListImportFilesParams = {}) => {
  const body: Record<string, unknown> = {
    action: "list",
    pagination_required: true,
    next_token: params.next_token ?? null,
    "order_by": [{
      "key": "created_at",
      "order": "DESC"
    }]
  };

  if (params.status) body.status = params.status;
  if (params.start_date && params.end_date) {
    body.start_date = params.start_date;
    body.end_date = params.end_date;
  }
  return apiClient("POST", "admin", "managebulkuseruploadstatistics", {
    body,
    shouldUseDefaultToken: false,
  });
};

export const viewImportFile = (file_id: string) =>
  apiClient("POST", "admin", "managebulkuseruploadstatistics", {
    body: { action: "view", file_id },
    shouldUseDefaultToken: false,
  });

export const bulkUserUpload = (file_path: string) =>
  apiClient("POST", "admin", "bulkuserupload", {
    body: { file_path },
    shouldUseDefaultToken: false,
  });
