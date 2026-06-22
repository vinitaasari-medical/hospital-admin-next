import { apiClient } from "./apiClient";

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface BroadcastRecord {
  id: string;
  title: string;
  description: string;
  to_whom?: string;
  attachment_type?: string;
  attachment_url?: string;
  broadcast_list_id?: string;
  created_by?: string;
  created_at?: number;
  updated_at?: number;
}

export interface BroadcastListRecord {
  id: string;
  name: string;
  users?: number;
  created_by?: string;
  created_at?: number;
}

export interface BroadcastUserRecord {
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
  profession_id?: string;
  rank_id?: string;
  status?: string;
  created_at?: number;
}

export interface TopicRecord {
  id: string;
  name: string;
  status?: string;
  created_by?: string;
  created_at?: number;
}

export interface TopicPostRecord {
  id: string;
  title: string;
  description: string;
  topic_id?: string;
  created_by?: string;
  created_at?: number;
}

export interface EntityRecord {
  id: string;
  name: string;
  entity_type?: string;
}

// ─── Broadcasts (managebroadcast) ─────────────────────────────────────────────

export interface ListBroadcastsParams {
  next_token?: string | null;
  search_string?: string;
  start_date?: number | null;
  end_date?: number | null;
  broadcast_list_id?: string;
}

export const listBroadcasts = (params: ListBroadcastsParams = {}) => {
  const body: Record<string, unknown> = {
    action: "list",
    pagination_required: true,
    next_token: params.next_token ?? null,
    order_by: [{ key: "created_at", order: "DESC" }],
  };

  if (params.broadcast_list_id) body.broadcast_list_id = params.broadcast_list_id;
  if (params.start_date) body.start_date = params.start_date;
  if (params.end_date) body.end_date = params.end_date;

  if (params.search_string?.trim()) {
    body.search_string = params.search_string;
    body.search_fields = ["title", "description"];
    delete body.order_by;
  }

  return apiClient("POST", "admin", "managebroadcast", {
    body,
    shouldUseDefaultToken: false,
  });
};

export const createBroadcast = (params: {
  title: string;
  description: string;
  attachment_type?: string;
  attachment_url?: string;
  broadcast_list_id?: string;
}) => {
  const body: Record<string, unknown> = {
    action: "add",
    title: params.title,
    description: params.description,
    to_whom: "all_users",
  };
  if (params.attachment_type) body.attachment_type = params.attachment_type;
  if (params.attachment_url) body.attachment_url = params.attachment_url;
  if (params.broadcast_list_id) body.broadcast_list_id = params.broadcast_list_id;

  return apiClient("POST", "admin", "managebroadcast", {
    body,
    shouldUseDefaultToken: false,
  });
};

export const updateBroadcast = (params: {
  broadcast_id: string;
  title?: string;
  description?: string;
  attachment_type?: string;
  attachment_url?: string;
}) => {
  const body: Record<string, unknown> = {
    action: "update",
    broadcast_id: params.broadcast_id,
  };
  if (params.title !== undefined) body.title = params.title;
  if (params.description !== undefined) body.description = params.description;
  if (params.attachment_type !== undefined) body.attachment_type = params.attachment_type;
  if (params.attachment_url !== undefined) body.attachment_url = params.attachment_url;

  return apiClient("POST", "admin", "managebroadcast", {
    body,
    shouldUseDefaultToken: false,
  });
};

export const deleteBroadcasts = (broadcast_ids: string[]) =>
  apiClient("POST", "admin", "managebroadcast", {
    body: { action: "delete", broadcast_ids },
    shouldUseDefaultToken: false,
  });

// ─── Broadcast Lists (managebroadcastlist) ────────────────────────────────────

export interface ListBroadcastListsParams {
  next_token?: string | null;
  search_string?: string;
  start_date?: number | null;
  end_date?: number | null;
}

export const listBroadcastLists = (params: ListBroadcastListsParams = {}) => {
  const body: Record<string, unknown> = {
    action: "list",
    pagination_required: true,
    next_token: params.next_token ?? null,
    order_by: [{ key: "created_at", order: "DESC" }],
  };

  if (params.start_date) body.start_date = params.start_date;
  if (params.end_date) body.end_date = params.end_date;

  if (params.search_string?.trim()) {
    body.search_string = params.search_string;
    body.search_fields = ["name"];
    delete body.order_by;
  }

  return apiClient("POST", "admin", "managebroadcastlist", {
    body,
    shouldUseDefaultToken: false,
  });
};

export const createBroadcastList = (params: { name: string; user_ids: string[] }) =>
  apiClient("POST", "admin", "managebroadcastlist", {
    body: { action: "add", name: params.name, users: params.user_ids },
    shouldUseDefaultToken: false,
  });

export const updateBroadcastList = (params: {
  list_id: string;
  name?: string;
  user_ids?: string[];
}) => {
  const body: Record<string, unknown> = {
    action: "update",
    broadcast_list_id: params.list_id,
  };
  if (params.name !== undefined) body.name = params.name;
  if (params.user_ids !== undefined) body.users = params.user_ids;

  return apiClient("POST", "admin", "managebroadcastlist", {
    body,
    shouldUseDefaultToken: false,
  });
};

export const deleteBroadcastLists = (list_ids: string[]) =>
  apiClient("POST", "admin", "managebroadcastlist", {
    body: { action: "delete", broadcast_list_ids: list_ids },
    shouldUseDefaultToken: false,
  });

// ─── Users (listusers) ────────────────────────────────────────────────────────

export interface ListBroadcastUsersParams {
  next_token?: string | null;
  search_string?: string;
  broadcast_list_id?: string;
  profession_id?: string;
  rank_id?: string;
  start_date?: number | null;
  end_date?: number | null;
}

export const listBroadcastUsers = (params: ListBroadcastUsersParams = {}) => {
  const body: Record<string, unknown> = {
    pagination_required: 1,
    next_token: params.next_token ?? null,
    order_by: [{ key: "created_at", order: "DESC" }],
  };

  if (params.broadcast_list_id) body.broadcast_list_id = params.broadcast_list_id;
  if (params.profession_id) body.profession_id = params.profession_id;
  if (params.rank_id) body.rank_id = params.rank_id;
  if (params.start_date) body.start_date = params.start_date;
  if (params.end_date) body.end_date = params.end_date;

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

export const removeUsersFromList = (params: {
  broadcast_list_id: string;
  user_ids: string[];
}) =>
  apiClient("POST", "admin", "deleteuser", {
    body: {
      broadcast_list_id: params.broadcast_list_id,
      user_ids: params.user_ids,
    },
    shouldUseDefaultToken: false,
  });

// ─── Topics (managetopics) ────────────────────────────────────────────────────

export interface ListTopicsParams {
  next_token?: string | null;
  search_string?: string;
  start_date?: number | null;
  end_date?: number | null;
}

export const listTopics = (params: ListTopicsParams = {}) => {
  const body: Record<string, unknown> = {
    action: "list",
    pagination_required: true,
    next_token: params.next_token ?? null,
    order_by: [{ key: "created_at", order: "DESC" }],
  };

  if (params.start_date) body.start_date = params.start_date;
  if (params.end_date) body.end_date = params.end_date;

  if (params.search_string?.trim()) {
    body.search_string = params.search_string;
    body.search_fields = ["name"];
    delete body.order_by;
  }

  return apiClient("POST", "admin", "managetopics", {
    body,
    shouldUseDefaultToken: false,
  });
};

export const createTopic = (name: string) =>
  apiClient("POST", "admin", "managetopics", {
    body: { action: "add", name },
    shouldUseDefaultToken: false,
  });

export const updateTopic = (topic_id: string, name: string) =>
  apiClient("POST", "admin", "managetopics", {
    body: { action: "update", topic_id, name },
    shouldUseDefaultToken: false,
  });

export const deleteTopics = (topic_ids: string[]) =>
  apiClient("POST", "admin", "managetopics", {
    body: { action: "delete", topic_ids },
    shouldUseDefaultToken: false,
  });

// ─── Topic Posts (managetopicpost) ────────────────────────────────────────────

export interface ListTopicPostsParams {
  topic_id: string;
  next_token?: string | null;
  search_string?: string;
  start_date?: number | null;
  end_date?: number | null;
}

export const listTopicPosts = (params: ListTopicPostsParams) => {
  const body: Record<string, unknown> = {
    action: "list",
    topic_id: params.topic_id,
    pagination_required: true,
    next_token: params.next_token ?? null,
    order_by: [{ key: "created_at", order: "DESC" }],
  };

  if (params.start_date) body.start_date = params.start_date;
  if (params.end_date) body.end_date = params.end_date;

  if (params.search_string?.trim()) {
    body.search_string = params.search_string;
    body.search_fields = ["title", "description"];
    delete body.order_by;
  }

  return apiClient("POST", "admin", "managetopicpost", {
    body,
    shouldUseDefaultToken: false,
  });
};

export const createTopicPost = (params: {
  topic_id: string;
  title: string;
  description: string;
}) =>
  apiClient("POST", "admin", "managetopicpost", {
    body: { action: "add", ...params },
    shouldUseDefaultToken: false,
  });

export const updateTopicPost = (params: {
  post_id: string;
  title?: string;
  description?: string;
}) => {
  const body: Record<string, unknown> = { action: "update", post_id: params.post_id };
  if (params.title !== undefined) body.title = params.title;
  if (params.description !== undefined) body.description = params.description;

  return apiClient("POST", "admin", "managetopicpost", {
    body,
    shouldUseDefaultToken: false,
  });
};

export const deleteTopicPosts = (post_ids: string[]) =>
  apiClient("POST", "admin", "managetopicpost", {
    body: { action: "delete", post_ids },
    shouldUseDefaultToken: false,
  });

// ─── Entities (manageentities) ────────────────────────────────────────────────

export const listProfessions = () =>
  apiClient("POST", "common", "manageentities", {
    body: {
      action: "list",
      entity_type: "profession",
      pagination_required: false,
      next_token: null,
    },
    shouldUseDefaultToken: false,
  });

export const listRanks = (profession_id?: string) => {
  const body: Record<string, unknown> = {
    action: "list",
    entity_type: "rank",
    pagination_required: false,
    next_token: null,
  };
  if (profession_id) body.profession_id = profession_id;

  return apiClient("POST", "common", "manageentities", {
    body,
    shouldUseDefaultToken: false,
  });
};
