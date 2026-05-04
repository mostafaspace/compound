import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import * as Keychain from "react-native-keychain";
import { Platform } from "react-native";
import { setOfflineState } from "../store/systemSlice";
import { logout } from "../store/authSlice";

const authTokenService = "compound.mobile.authToken";

const localApiBaseUrl = Platform.select({
  android: "http://10.0.2.2:8000/api/v1",
  ios: "http://localhost:8000/api/v1",
  default: "http://localhost:8000/api/v1",
});

const configuredApiBaseUrl = process.env.COMPOUND_API_BASE_URL?.trim();
const defaultApiBaseUrl = configuredApiBaseUrl || localApiBaseUrl;

const prepareHeaders = (headers: Headers, getState: () => unknown) => {
  headers.set("Accept", "application/json");

  const state = getState() as any;
  const token = state.auth.token;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const compoundId = state.auth.user?.compoundId;
  if (compoundId) {
    headers.set("X-Compound-Id", compoundId);
  }

  return headers;
};

const joinUrl = (baseUrl: string, path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
};

const parseNativeResponse = (xhr: XMLHttpRequest) => {
  const text = xhr.responseText ?? "";
  const contentType = xhr.getResponseHeader("content-type") ?? "";

  if (!text.length) {
    return null;
  }

  if (contentType.includes("application/json")) {
    return JSON.parse(text);
  }

  const trimmed = text.trim();
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    return JSON.parse(trimmed);
  }

  return text;
};

const nativeBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
) => {
  const request = typeof args === "string" ? { url: args } : args;
  const method = request.method ?? "GET";
  const url = joinUrl(defaultApiBaseUrl, request.url);
  const headers = prepareHeaders(new Headers((request.headers ?? undefined) as any), api.getState);
  const body = request.body;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const serializedBody =
    body == null || typeof body === "string" || isFormData ? body ?? null : JSON.stringify(body);

  if (serializedBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const result = await new Promise<{ status: number; data: unknown; headers: Record<string, string> }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open(method, url, true);

      headers.forEach((value, key) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.onload = () => {
        const responseHeaders: Record<string, string> = {};
        xhr
          .getAllResponseHeaders()
          .trim()
          .split(/[\r\n]+/)
          .forEach((line) => {
            if (!line) {
              return;
            }

            const parts = line.split(": ");
            const header = parts.shift();
            if (header) {
              responseHeaders[header.toLowerCase()] = parts.join(": ");
            }
          });

        try {
          resolve({
            status: xhr.status,
            data: parseNativeResponse(xhr),
            headers: responseHeaders,
          });
        } catch (error) {
          reject({
            status: "PARSING_ERROR",
            originalStatus: xhr.status,
            data: xhr.responseText ?? "",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      };

      xhr.onerror = () => {
        reject({
          status: "FETCH_ERROR",
          error: "Network request failed",
        });
      };

      xhr.onabort = () => {
        reject({
          status: "FETCH_ERROR",
          error: "Request aborted",
        });
      };

      api.signal.addEventListener(
        "abort",
        () => {
          xhr.abort();
        },
        { once: true },
      );

      xhr.send(serializedBody as any);
    });

    if (result.status >= 200 && result.status < 300) {
      return { data: result.data };
    }

    return {
      error: {
        status: result.status,
        data: result.data,
      },
    };
  } catch (error) {
    return {
      error: error as FetchBaseQueryError,
    };
  }
};

const webBaseQuery = fetchBaseQuery({
  baseUrl: defaultApiBaseUrl,
  prepareHeaders: (headers, { getState }) => prepareHeaders(headers, getState),
});

const baseQuery = Platform.OS === "web" ? webBaseQuery : nativeBaseQuery;

const baseQueryWithFallback: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 'FETCH_ERROR') {
    api.dispatch(setOfflineState({ isOffline: true, error: "Network Error: Could not connect to server" }));
  } else if (result.error && result.error.status === 401) {
    api.dispatch(logout());
    await Keychain.resetGenericPassword({ service: authTokenService });

    const state = api.getState() as any;
    if (state.system?.isOffline) {
      api.dispatch(setOfflineState({ isOffline: false }));
    }
  } else {
    const state = api.getState() as any;
    if (state.system?.isOffline) {
       api.dispatch(setOfflineState({ isOffline: false }));
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithFallback,
  tagTypes: [
    "User",
    "VerificationRequest",
    "UnitMembership",
    "VisitorRequest",
    "Issue",
    "Notification",
    "Announcement",
    "Finance",
    "Vote",
    "Poll",
    "UnitAccount",
    "UserDocument",
    "PolicyConsent",
    "Admin",
  ],
  endpoints: () => ({}),
});
