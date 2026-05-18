import type { User } from "../interfaces/user";
import webClient from "../api/webClient";
import AxiosInstance from "../api/AxiosInstance";

type ApiEnvelope<T> = {
  status: string;
  message: string;
  data: T;
};

/** Deduplicate concurrent `/v1/auth/me` calls (e.g. React StrictMode dev double-mount). */
let sessionRequest: Promise<User | null> | null = null;

class AuthService {
  async ensureCsrfCookie(): Promise<void> {
    await webClient.get("/sanctum/csrf-cookie");
  }

  async login(email: string, password: string, remember: boolean): Promise<User> {
    await this.ensureCsrfCookie();
    const { data } = await webClient.post<ApiEnvelope<{ user: User }>>("/login", {
      email,
      password,
      remember,
    });
    if (!data.data?.user) {
      throw new Error(data.message || "Unable to sign in.");
    }
    return data.data.user;
  }

  async logout(): Promise<void> {
    await this.ensureCsrfCookie();
    await webClient.post("/logout");
  }

  clearSessionRequestCache(): void {
    sessionRequest = null;
  }

  async fetchCurrentUser(): Promise<User | null> {
    if (!sessionRequest) {
      sessionRequest = (async (): Promise<User | null> => {
        try {
          const { data } = await AxiosInstance.get<ApiEnvelope<{ user: User }>>("/v1/auth/me");
          if (data.status !== "Success" || !data.data?.user) {
            return null;
          }
          return data.data.user;
        } catch {
          return null;
        }
      })().finally(() => {
        sessionRequest = null;
      });
    }
    return sessionRequest;
  }
}

export default new AuthService();