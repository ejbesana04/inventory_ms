import type { User } from "../interfaces/user";
import webClient from "../api/webClient";
import AxiosInstance from "../api/AxiosInstance";

type ApiEnvelope<T> = {
  status: string;
  message: string;
  data: T;
};

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

  async fetchCurrentUser(): Promise<User | null> {
    try {
      const { data } = await AxiosInstance.get<ApiEnvelope<{ user: User }>>("/v1/auth/me");
      if (data.status !== "Success" || !data.data?.user) {
        return null;
      }
      return data.data.user;
    } catch {
      return null;
    }
  }
}

export default new AuthService();
