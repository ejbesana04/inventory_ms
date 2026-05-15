import type { User, Role } from "../interfaces/user";
import AxiosInstance from "../api/AxiosInstance";
import webClient from "../api/webClient";

type ApiEnvelope<T> = {
  status: string;
  message: string;
  data: T;
};

export type SetupStatus = {
  has_users: boolean;
};

export type FirstUserPayload = {
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  password: string;
  password_confirmation: string;
  role: Extract<Role, "admin" | "manager">;
};

class SetupService {
  async getStatus(): Promise<SetupStatus> {
    const { data } = await AxiosInstance.get<ApiEnvelope<SetupStatus>>("/v1/setup/status");
    return data.data ?? { has_users: true };
  }

  async createFirstUser(payload: FirstUserPayload): Promise<User> {
    await webClient.get("/sanctum/csrf-cookie");
    const { data } = await webClient.post<ApiEnvelope<{ user: User }>>(
      "/api/v1/setup/first-user",
      payload
    );
    if (!data.data?.user) {
      throw new Error(data.message || "Unable to create the first account.");
    }
    return data.data.user;
  }
}

export default new SetupService();
