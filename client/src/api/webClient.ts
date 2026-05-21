import axios, { type InternalAxiosRequestConfig } from "axios";
import { getCookie } from "../util/cookies";

const API_ORIGIN = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

const webClient = axios.create({
  baseURL: API_ORIGIN,
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

webClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
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

export default webClient;
