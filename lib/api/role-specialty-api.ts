import { apiClient } from "./apiClient";

// ─── Shared entity item type returned in all list responses ──────────────────

export interface EntityItem {
  id: string;
  name: string;
  is_enabled: boolean;
  created_by?: string;
  created_at?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const manageEntities = (body: Record<string, unknown>) =>
  apiClient("POST", "common", "manageentities", { body, shouldUseDefaultToken: false });

// ─── Professions ─────────────────────────────────────────────────────────────

export const listProfessions = (search?: string) => {
  const body: Record<string, unknown> = {
    action: "list",
    entity_type: "profession",
    pagination_required: false,
    next_token: null,
    order_by: [{ key: "created_at", order: "DESC" }],
  };
  if (search?.trim()) {
    body.search_string = search;
    body.search_fields = ["name"];
    delete body.order_by;
  }
  return manageEntities(body);
};

export const createProfession = (name: string) =>
  manageEntities({ action: "create", entity_type: "profession", entity_name: name });

export const updateProfession = (
  id: string,
  updates: { entity_name?: string; is_enabled?: boolean },
) =>
  manageEntities({
    action: "update",
    entity_type: "profession",
    entity_id: id,
    ...updates,
  });

// ─── Specialties ─────────────────────────────────────────────────────────────

export const listSpecialties = (profession_id: string, search?: string) => {
  const body: Record<string, unknown> = {
    action: "list",
    entity_type: "specialty",
    profession_id,
    pagination_required: false,
    next_token: null,
    order_by: [{ key: "created_at", order: "DESC" }],
  };
  if (search?.trim()) {
    body.search_string = search;
    body.search_fields = ["name"];
    delete body.order_by;
  }
  return manageEntities(body);
};

export const createSpecialty = (profession_id: string, name: string) =>
  manageEntities({
    action: "create",
    entity_type: "specialty",
    entity_name: name,
    profession_id,
  });

// profession_id is REQUIRED by the API even for update/toggle operations
export const updateSpecialty = (
  id: string,
  profession_id: string,
  updates: { entity_name?: string; is_enabled?: boolean },
) =>
  manageEntities({
    action: "update",
    entity_type: "specialty",
    entity_id: id,
    profession_id,
    ...updates,
  });

// ─── Sub-Specialties ─────────────────────────────────────────────────────────

export const listSubSpecialties = (specialty_id: string, search?: string) => {
  const body: Record<string, unknown> = {
    action: "list",
    entity_type: "sub_specialty",
    specialty_id,
    pagination_required: false,
    next_token: null,
    order_by: [{ key: "created_at", order: "DESC" }],
  };
  if (search?.trim()) {
    body.search_string = search;
    body.search_fields = ["name"];
    delete body.order_by;
  }
  return manageEntities(body);
};

export const createSubSpecialty = (specialty_id: string, name: string) =>
  manageEntities({
    action: "create",
    entity_type: "sub_specialty",
    entity_name: name,
    specialty_id,
  });

// specialty_id is REQUIRED by the API even for update/toggle operations
export const updateSubSpecialty = (
  id: string,
  specialty_id: string,
  updates: { entity_name?: string; is_enabled?: boolean },
) =>
  manageEntities({
    action: "update",
    entity_type: "sub_specialty",
    entity_id: id,
    specialty_id,
    ...updates,
  });

// ─── Generic Ranks (no specialty_id) ─────────────────────────────────────────

export const listGenericRanks = (search?: string) => {
  const body: Record<string, unknown> = {
    action: "list",
    entity_type: "rank",
    pagination_required: false,
    next_token: null,
    order_by: [{ key: "created_at", order: "DESC" }],
  };
  if (search?.trim()) {
    body.search_string = search;
    body.search_fields = ["name"];
    delete body.order_by;
  }
  return manageEntities(body);
};

export const createGenericRank = (name: string) =>
  manageEntities({ action: "create", entity_type: "rank", entity_name: name });

export const updateGenericRank = (
  id: string,
  updates: { entity_name?: string; is_enabled?: boolean },
) =>
  manageEntities({ action: "update", entity_type: "rank", entity_id: id, ...updates });

// ─── Specialty-Scoped Ranks (specialty_id present) ───────────────────────────

export const listSpecialtyRanks = (specialty_id: string, search?: string) => {
  const body: Record<string, unknown> = {
    action: "list",
    entity_type: "rank",
    specialty_id,
    pagination_required: false,
    next_token: null,
    order_by: [{ key: "created_at", order: "DESC" }],
  };
  if (search?.trim()) {
    body.search_string = search;
    body.search_fields = ["name"];
    delete body.order_by;
  }
  return manageEntities(body);
};

export const createSpecialtyRank = (specialty_id: string, name: string) =>
  manageEntities({
    action: "create",
    entity_type: "rank",
    entity_name: name,
    specialty_id,
  });

// Rank update does not require a parent_id
export const updateSpecialtyRank = (
  id: string,
  updates: { entity_name?: string; is_enabled?: boolean },
) =>
  manageEntities({ action: "update", entity_type: "rank", entity_id: id, ...updates });
