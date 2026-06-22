import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import {
  apiBasePath,
  apiDomainAdmin,
  apiDomainCommon,
  apiDomainSetting,
  apiDomainUser,
  apiDomainStaffing,
} from "./api-groups";

/* -------------------------------------------------------------------------- */
/*                               LocalStorage                                 */
/* -------------------------------------------------------------------------- */

const getLS = (key: string): string | null =>
  typeof window !== "undefined" ? window.localStorage.getItem(key) : null;

export const getUserId = (): string | null => getLS("userId");
export const getUserEmail = (): string | null => getLS("email");

const getUser = (): Record<string, unknown> | null => {
  try {
    const raw = getLS("user");
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/*                         JWT SIGN (unauth only)                             */
/* -------------------------------------------------------------------------- */

// Delegates to a Next.js server route so the signing secret is never
// embedded in the client bundle (avoids NEXT_PUBLIC_ exposure).
const signJwtToken = async (): Promise<string> => {
  const res = await fetch("/api/auth/sign-token", { method: "POST" });
  if (!res.ok) throw new Error("Token service unavailable");
  const body = (await res.json()) as { token?: string; error?: string };
  if (!body.token) throw new Error(body.error ?? "Token service unavailable");
  return body.token;
};

/* -------------------------------------------------------------------------- */
/*                              CSRF Token                                    */
/* -------------------------------------------------------------------------- */

const getCsrfToken = (): string => {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? match[1] : "";
};

/* -------------------------------------------------------------------------- */
/*                               Axios Instance                               */
/* -------------------------------------------------------------------------- */

const myInstance: AxiosInstance = axios.create({
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

/* -------------------------------------------------------------------------- */
/*                            Request Interceptor                             */
/* -------------------------------------------------------------------------- */

myInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    config.headers["X-CSRF-Token"] = csrfToken;
  }
  return config;
});

/* -------------------------------------------------------------------------- */
/*                           Response Interceptor                             */
/* -------------------------------------------------------------------------- */

export const forceLogout = (): void => {
  if (typeof window !== "undefined") {
    localStorage.clear();
    window.location.href = "/login";
  }
};

let isRefreshing = false;
let failedQueue: Array<{ resolve: () => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown): void => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve()
  );
  failedQueue = [];
};

const buildUnauthHeaders = async (): Promise<Record<string, string>> => ({
  "content-type": "application/json",
  channel: "web",
  authorization: `Bearer ${await signJwtToken()}`,
  user_id: getUserId() ?? "",
});

myInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };
    const status: number | undefined = error?.response?.status;
    const errorType: string | undefined =
      error?.response?.data?.error?.errorType;

    const isTerminalSessionError =
      errorType === "SESSION_EXPIRED" ||
      errorType === "SESSION_INVALIDATED" ||
      errorType === "INVALID_TOKEN";

    if (status === 401 && !isTerminalSessionError && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: () => resolve(myInstance(originalRequest)),
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const unauthHeaders = await buildUnauthHeaders();
        const refreshResponse = await myInstance.post(
          `${getBasePathName("common")}/${apiBasePath["common"]}/unauth/generatenewtoken`,
          { device_id: getLS("device_id"), user_type: "hospital-admin" },
          { headers: unauthHeaders }
        );

        const newTokens =
          refreshResponse.data?.content?.data || refreshResponse.data?.data;
        if (newTokens?.refresh_token) {
          localStorage.setItem("refresh_token", newTokens.refresh_token);
        }
        if (newTokens?.access_token) {
          localStorage.setItem("access_token", newTokens.access_token);
        }

        processQueue(null);
        return myInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        forceLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (
      (status === 401 &&
        (errorType === "SESSION_EXPIRED" ||
          errorType === "SESSION_INVALIDATED" ||
          errorType === "INVALID_TOKEN")) ||
      (status === 403 &&
        (errorType === "DEVICE_MISMATCH" ||
          errorType === "CHANNEL_MISMATCH" ||
          errorType === "INVALID_TOKEN"))
    ) {
      forceLogout();
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

/* -------------------------------------------------------------------------- */
/*                         Silent Token Refresh                               */
/* -------------------------------------------------------------------------- */

export async function refreshTokenSilently(): Promise<void> {
  if (!getLS("userId")) return;

  const unauthHeaders = await buildUnauthHeaders();
  const response = await myInstance.post(
    `${getBasePathName("common")}/${apiBasePath["common"]}/unauth/generatenewtoken`,
    { device_id: getLS("device_id"), user_type: "hospital-admin" },
    { headers: unauthHeaders, _retry: true } as AxiosRequestConfig
  );

  const newTokens = response.data?.content?.data || response.data?.data;
  if (newTokens?.refresh_token)
    localStorage.setItem("refresh_token", newTokens.refresh_token);
  if (newTokens?.access_token)
    localStorage.setItem("access_token", newTokens.access_token);
}

/* -------------------------------------------------------------------------- */
/*                             Base Domain Map                                */
/* -------------------------------------------------------------------------- */

const getBasePathName = (module: string): string => {
  switch (module) {
    case "admin":
    case "main_admin":
    case "ext":
    case "subnetwork":
      return apiDomainAdmin;
    case "common":
      return apiDomainCommon;
    case "user":
      return apiDomainUser;
    case "settings":
      return apiDomainSetting;
    case "staffing":
      return apiDomainStaffing;
    default:
      return "";
  }
};

/* -------------------------------------------------------------------------- */
/*                           Types                                             */
/* -------------------------------------------------------------------------- */

export interface ApiClientOptions {
  body?: Record<string, unknown> | null;
  map?: boolean;
  subnetwork_id?: string | null;
  subnetwork_map?: boolean;
  shouldUseDefaultToken?: boolean;
  enableLogging?: boolean;
  cancelToken?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  errorHandle?: boolean;
}

interface ApiError {
  errorType?: string;
  message?: string;
  userMessage?: string;
  errors?: unknown;
}

interface ApiResponseBody {
  code: number;
  error?: ApiError;
  message?: string;
  content?: {
    data?: unknown;
    has_more?: boolean;
    next_token?: string | null;
  };
}

/* -------------------------------------------------------------------------- */
/*                                API CLIENT                                  */
/* -------------------------------------------------------------------------- */

export async function apiClient(
  method: string,
  basePathName: string,
  endPoint: string,
  {
    body,
    map = false,
    subnetwork_id = null,
    subnetwork_map = false,
    shouldUseDefaultToken = false,
    enableLogging: _enableLogging = false,
    cancelToken = "",
    ...customConfig
  }: ApiClientOptions = {}
): Promise<ApiResponseBody> {
  const basePath = apiBasePath[basePathName];
  const user = getUser();

  /* ------------------------------ Headers --------------------------------- */

  const headers: Record<string, string> = {
    "content-type": "application/json",
    channel: "web",
  };

  if (shouldUseDefaultToken) {
    headers.authorization = `Bearer ${await signJwtToken()}`;
  } else {
    headers.user_id = getUserId() ?? "";
    headers.network_user_id = getUserId() ?? "";
  }

  /* ------------------ ENDPOINT LOGIC (UNCHANGED FROM REACT) --------------- */

  if (endPoint !== "unauth/hospitaladminlogin") {
    const networkId = getLS("network_id");
    if (getLS("net_id") && endPoint === "managedepartments") {
      headers.network_id = getLS("network_id") ?? getLS("net_id") ?? "";
    } else {
      if (subnetwork_map && subnetwork_id) {
        headers.network_id = subnetwork_id;
        headers.network_id_type = "subnetwork";
      } else {
        if (
          networkId &&
          !map &&
          (endPoint === "listusers" ||
            endPoint === "createuser" ||
            basePathName === "staffing" ||
            endPoint === "createofficialgroup" ||
            endPoint === "viewdepartmentusersbulkimportstatistics" ||
            endPoint === "removeuserfromdepartment" ||
            endPoint === "removeuserfromalldepartment" ||
            endPoint === "removeuserfromsubnetwork" ||
            endPoint === "editofficialgroup" ||
            endPoint === "gethospitaladminmetrics" ||
            endPoint === "extendstaffscheduletemplate" ||
            endPoint === "managedepartments" ||
            endPoint === "listdepartmentusers" ||
            endPoint === "getofficialgroupbyfilter" ||
            endPoint === "deletestaffingduty" ||
            endPoint === "adddepartmentusers" ||
            endPoint === "removedepartmentusers" ||
            endPoint === "listdepartmentoptions" ||
            endPoint === "deleteofficialgroup" ||
            endPoint === "listduties" ||
            endPoint === "managebroadcastlist" ||
            endPoint === "createstaffscheduletemplate" ||
            endPoint === "createadmin" ||
            endPoint === "listadmins" ||
            endPoint === "users-subnetwork-map-bulk-import/list-imports" ||
            endPoint === "users-subnetwork-map-bulk-import/import-file" ||
            endPoint === "users-subnetwork-map-bulk-import/view-import-records" ||
            endPoint === "updateadmin" ||
            endPoint === "deletedepartment" ||
            endPoint === "bulkdepartmentusermapupload" ||
            endPoint === "listdepartmentusersbulkimportstatistics")
        ) {
          headers.network_id = networkId;
          headers.network_id_type = "subnetwork";
        } else {
          headers.network_id = getLS("cluster_id") ?? "";
          headers.network_id_type = "cluster";
        }
      }
    }

    const dept = (user as Record<string, string> | null)?.department_id;
    if (dept) {
      headers.department_id = dept;
    }
  } else {
    headers.network_id = "public";
  }

  /* ----------------------------- Email Header ----------------------------- */

  if (!shouldUseDefaultToken && getUserEmail()) {
    headers.email = getUserEmail()!;
  }

  /* ------------------------------ Axios Config ----------------------------- */

  const config: AxiosRequestConfig = {
    method,
    baseURL: getBasePathName(basePathName),
    url: `${basePath}/${endPoint}`,
    headers: {
      ...headers,
      ...(customConfig.headers ?? {}),
    },
    responseType: "json",
    timeout: customConfig.timeout ?? 0,
    cancelToken: cancelToken as import("axios").CancelToken,
    data: body ?? {},
  };

  /* ------------------------------ API CALL -------------------------------- */

  return myInstance(config)
    .then(({ data }: { data: ApiResponseBody }) => {
      if (!data) {
        return Promise.reject({
          code: 500,
          message: "Empty response",
          userMessage: "Empty response",
        });
      }

      try {
        const parsedObj = data;
        const isSuccess =
          parsedObj.code >= 200 && parsedObj.code < 300 && !parsedObj.error;

        if (!isSuccess) {
          const status = parsedObj?.code;
          const errorType = parsedObj?.error?.errorType;

          const shouldLogout =
            (status === 401 &&
              (errorType === "SESSION_EXPIRED" ||
                errorType === "SESSION_INVALIDATED" ||
                errorType === "INVALID_TOKEN")) ||
            (status === 403 &&
              (errorType === "DEVICE_MISMATCH" ||
                errorType === "CHANNEL_MISMATCH" ||
                errorType === "INVALID_TOKEN"));

          if (shouldLogout) {
            forceLogout();
            return Promise.reject({ code: status, message: "Session ended" });
          }

          return Promise.reject({
            code: parsedObj?.code || 500,
            message:
              parsedObj?.error?.message ||
              parsedObj?.message ||
              "Something went wrong",
            userMessage:
              parsedObj?.error?.userMessage ||
              parsedObj?.message ||
              "Something went wrong",
            errorData:
              parsedObj?.error?.errors ||
              parsedObj?.message ||
              "Something went wrong",
          });
        }

        if (parsedObj?.content?.data !== undefined) {
          return {
            ...parsedObj,
            content: {
              data: parsedObj.content.data ?? null,
              has_more: parsedObj.content.has_more ?? false,
              next_token: parsedObj.content.next_token ?? null,
            },
          };
        }

        return { ...parsedObj };
      } catch {
        return Promise.reject({
          code: 403,
          message: "Invalid response format",
          userMessage: "Invalid response format",
        });
      }
    })
    .catch((error) => {
      const status: number | undefined = error?.response?.status;
      const errorType: string | undefined =
        error?.response?.data?.error?.errorType;

      const shouldLogout =
        (status === 401 &&
          (errorType === "SESSION_EXPIRED" ||
            errorType === "SESSION_INVALIDATED" ||
            errorType === "INVALID_TOKEN")) ||
        (status === 403 &&
          (errorType === "DEVICE_MISMATCH" ||
            errorType === "CHANNEL_MISMATCH" ||
            errorType === "INVALID_TOKEN"));

      if (shouldLogout) {
        forceLogout();
        return Promise.reject({ code: status, message: "Session ended" });
      }

      if (
        error.config &&
        Object.prototype.hasOwnProperty.call(error.config, "errorHandle") &&
        error.config.errorHandle === false
      ) {
        return Promise.reject(error);
      }

      return Promise.reject({
        code: error?.code || error?.response?.status || 500,
        message: error.message,
        userMessage: error?.userMessage,
        errorData: error?.errorData,
      });
    });
}
