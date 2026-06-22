import { apiClient } from "./apiClient";

// ─── List Network Users (uses subnetwork network_id header automatically) ───

export interface ListNetworkUsersParams {
  next_token?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  profession_id?: string | null;
  rank_id?: string | null;
  search_string?: string;
}

export const listNetworkUsers = (params: ListNetworkUsersParams = {}) => {
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

// ─── List All Users for Mapping (bypasses subnetwork filter, returns is_mapped flag) ─

export interface ListUsersForMappingParams {
  next_token?: string | null;
  search_string?: string;
  subnetwork_id: string;
}

export const listUsersForMapping = (params: ListUsersForMappingParams) => {
  const body: Record<string, unknown> = {
    pagination_required: 1,
    next_token: params.next_token ?? null,
    mapping_checks: { subnetwork_id: params.subnetwork_id },
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

  // map: true bypasses network_id header so we get all users, not just mapped ones
  return apiClient("POST", "admin", "listusers", {
    body,
    map: true,
    shouldUseDefaultToken: false,
  });
};

// ─── Map Users to Subnetwork ────────────────────────────────────────────────

export const mapUsersToSubnetwork = (userIds: string[], networkId: string) =>
  apiClient("POST", "admin", "mapusersubnetwork", {
    body: {
      user_ids: userIds,
      subnetwork_ids: [networkId],
    },
    shouldUseDefaultToken: false,
  });

// ─── Create Network User (Trainee) ──────────────────────────────────────────

export const createNetworkUser = (body: Record<string, unknown>) =>
  apiClient("POST", "admin", "createuser", {
    body: { ...body, user_type: "trainee" },
    shouldUseDefaultToken: false,
  });

// ─── Remove User from Subnetwork ────────────────────────────────────────────

export const removeNetworkUser = (user_id: string) =>
  apiClient("POST", "ext", "removeuserfromsubnetwork", {
    body: { user_id },
    shouldUseDefaultToken: false,
  });

// ─── Bulk Map Import Files ───────────────────────────────────────────────────

export interface ListNetworkImportFilesParams {
  next_token?: string | null;
  status?: string | null;
}

export const listNetworkImportFiles = (params: ListNetworkImportFilesParams = {}) => {
  const body: Record<string, unknown> = {
    pagination_required: true,
    next_token: params.next_token ?? null,
    order_by: [{ key: "created_at", order: "DESC" }],
  };
  if (params.status) body.status = params.status;

  return apiClient("POST", "admin", "users-subnetwork-map-bulk-import/list-imports", {
    body,
    shouldUseDefaultToken: false,
  });
};

export const viewNetworkImportFile = (file_id: string) =>
  apiClient("POST", "admin", "users-subnetwork-map-bulk-import/view-import-records", {
    body: { file_id },
    shouldUseDefaultToken: false,
  });

export const importNetworkMapFile = (file_path: string, map_by: "email" | "staff_id") =>
  apiClient("POST", "admin", "users-subnetwork-map-bulk-import/import-file", {
    body: { file_path, map_by },
    shouldUseDefaultToken: false,
  });
