import { apiClient } from "./apiClient";

// ─── Department CRUD ─────────────────────────────────────────────────────────

export const listDepartments = (params: {
  next_token?: string | null;
  search_string?: string;
} = {}) =>
  apiClient("POST", "admin", "managedepartments", {
    body: {
      action: "list",
      pagination_required: 0,
      next_token: params.next_token ?? null,
      order_by: [{ key: "created_at", order: "DESC" }],
      ...(params.search_string?.trim()
        ? { search_string: params.search_string, search_fields: ["name", "code"] }
        : {}),
    },
    shouldUseDefaultToken: false,
  });

export const createDepartment = (body: {
  name: string;
  code?: string;
  type: "primary" | "sub";
  primary_department_id?: string;
  head_user_id?: string;
}) =>
  apiClient("POST", "admin", "managedepartments", {
    body: { action: "add", ...body },
    shouldUseDefaultToken: false,
  });

export const updateDepartment = (body: {
  department_id: string;
  name: string;
  code?: string;
  head_user_id?: string;
}) =>
  apiClient("POST", "admin", "managedepartments", {
    body: { action: "update", ...body },
    shouldUseDefaultToken: false,
  });

export const deleteDepartments = (department_ids: string[]) =>
  apiClient("POST", "admin", "managedepartments", {
    body: { action: "delete", department_ids },
    shouldUseDefaultToken: false,
  });

// ─── Department Users ─────────────────────────────────────────────────────────

export const listDepartmentUsers = (
  department_id: string,
  params: { search_string?: string } = {}
) =>
  apiClient("POST", "admin", "listdepartmentusers", {
    body: {
      department_id,
      ...(params.search_string?.trim()
        ? {
            search_string: params.search_string,
            search_fields: ["first_name", "last_name", "email", "phone_number"],
          }
        : {}),
    },
    shouldUseDefaultToken: false,
  });

export const addDepartmentUsers = (department_id: string, user_ids: string[]) =>
  apiClient("POST", "admin", "adddepartmentusers", {
    body: { department_id, user_ids },
    shouldUseDefaultToken: false,
  });

export const removeDepartmentUsers = (department_id: string, user_ids: string[]) =>
  Promise.all(
    user_ids.map((user_id) =>
      apiClient("POST", "ext", "removeuserfromdepartment", {
        body: { department_id, user_id, is_force_delete: false },
        shouldUseDefaultToken: false,
      })
    )
  );

// ─── Official Groups ──────────────────────────────────────────────────────────

export const listOfficialGroups = (department_id: string, next_token?: string | null) =>
  apiClient("POST", "admin", "getofficialgroupbyfilter", {
    body: {
      pagination_required: true,
      next_token: next_token ?? null,
      order_by: [{ key: "created_at", order: "DESC" }],
      department_id,
    },
    shouldUseDefaultToken: false,
  });

export const createOfficialGroup = (body: {
  name: string;
  description?: string;
  department_id: string;
  profile_url?: string;
  members: Array<{ member_id: string; role: "admin" | "member" }>;
}) =>
  apiClient("POST", "admin", "createofficialgroup", {
    body: { ...body, is_official_group: true },
    shouldUseDefaultToken: false,
  });

export const editOfficialGroup = (body: {
  group_id: string;
  name?: string;
  description?: string;
  profile_url?: string;
  add_admin_ids?: string[];
  remove_admin_ids?: string[];
}) =>
  apiClient("POST", "admin", "editofficialgroup", {
    body,
    shouldUseDefaultToken: false,
  });

export const deleteOfficialGroups = (group_ids: string[]) =>
  apiClient("POST", "admin", "deleteofficialgroup", {
    body: { group_ids },
    shouldUseDefaultToken: false,
  });

// ─── Single department delete (ext/deletedepartment — handles 409 blocked duties) ──

export const deleteDepartmentSingle = (department_id: string) =>
  apiClient("POST", "ext", "deletedepartment", {
    body: { department_id },
    shouldUseDefaultToken: false,
  });

// ─── Single user removal with force-delete support ────────────────────────────

export const removeUserFromDepartment = (params: {
  department_id: string;
  user_id: string;
  is_force_delete: boolean;
}) =>
  apiClient("POST", "ext", "removeuserfromdepartment", {
    body: params,
    shouldUseDefaultToken: false,
  });

// ─── User Search (pickers) ───────────────────────────────────────────────────

export const listUsersForPicker = (params: {
  next_token?: string | null;
  search_string?: string;
  mapping_checks?: { department_id?: string };
} = {}) =>
  apiClient("POST", "admin", "listusers", {
    body: {
      pagination_required: 1,
      next_token: params.next_token ?? null,
      ...(params.search_string?.trim()
        ? {
            search_string: params.search_string,
            search_fields: [
              "first_name",
              "last_name",
              "email",
              "phone_number",
              "staff_id",
              "concat_cc_phone",
            ],
          }
        : {}),
      ...(params.mapping_checks ? { mapping_checks: params.mapping_checks } : {}),
    },
    shouldUseDefaultToken: false,
  });

// ─── Schedule APIs ────────────────────────────────────────────────────────────

export const listDuties = (params: {
  group_id: string;
  department_id: string;
  sub_department_id?: string;
  duty_code?: string;
  is_summary?: boolean;
}) =>
  apiClient("POST", "staffing", "listduties", {
    body: params,
    shouldUseDefaultToken: false,
  });

export const deleteStaffingDuty = (duty_code: string) =>
  apiClient("POST", "ext", "deletestaffingduty", {
    body: { duty_code },
    shouldUseDefaultToken: false,
  });

export const createDutyTemplate = (body: Record<string, unknown>) =>
  apiClient("POST", "staffing", "createdutytemplate", {
    body,
    shouldUseDefaultToken: false,
  });

export const createStaffScheduleTemplate = (body: Record<string, unknown>) =>
  apiClient("POST", "staffing", "createstaffscheduletemplate", {
    body,
    shouldUseDefaultToken: false,
  });

export const getDutyById = (params: {
  staffing_duty_id: string;
  start_date: number;
  end_date: number;
}) =>
  apiClient("POST", "staffing", "getdutybyid", {
    body: params,
    shouldUseDefaultToken: false,
  });

export const listDutyTemplates = (params: {
  group_id: string;
  department_id: string;
  sub_department_id?: string;
}) =>
  apiClient("POST", "staffing", "listdutytemplates", {
    body: params,
    shouldUseDefaultToken: false,
  });

export const publishStaffingDuty = (params: {
  staffing_duty_id: string;
  publish_status: "published" | "draft";
  local_time_epoch: number;
}) =>
  apiClient("POST", "staffing", "publishstaffingduty", {
    body: params,
    shouldUseDefaultToken: false,
  });

export const extendStaffScheduleTemplate = (body: Record<string, unknown>) =>
  apiClient("POST", "staffing", "extendstaffscheduletemplate", {
    body,
    shouldUseDefaultToken: false,
  });

export const assignCoverageUser = (params: {
  staffing_coverage_assignment_id: string;
  assignee_user_id: string;
}) =>
  apiClient("POST", "staffing", "assigncoverageuser", {
    body: params,
    shouldUseDefaultToken: false,
  });
