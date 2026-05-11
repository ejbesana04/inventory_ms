import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { notify } from "../util/notify";
import { getCookie } from "../util/cookies";
import { PATHS } from "../routes/path";
import { dispatchSessionExpired } from "../auth/sessionEvents";

const AxiosInstance = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

// REQUEST
AxiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.headers = config.headers ?? {};

  const token = getCookie("XSRF-TOKEN");
  if (token) config.headers["X-XSRF-TOKEN"] = token;

  config.headers["X-Requested-With"] = "XMLHttpRequest";
  config.headers["Accept"] = "application/json";

  if (!(config.data instanceof FormData) && !config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }

  return config;
});

// RESPONSE (ONLY GLOBAL ERRORS)
AxiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    const isAuthMe = url.includes("v1/auth/me");
    const onLoginPage = window.location.pathname === PATHS.LOGIN;

    if (status === 401 && !isAuthMe && !onLoginPage) {
      notify.error("Session expired. Please log in again.");
      dispatchSessionExpired();
    }

    if (status === 403) {
      const data = error.response?.data as { message?: string } | undefined;
      const msg = data?.message?.trim();
      notify.error(msg || "Access denied.");
    }

    if (typeof status === "number" && status >= 500) {
      notify.error("Server error. Try again later.");
    }

    return Promise.reject(error);
  }
);

export default AxiosInstance;