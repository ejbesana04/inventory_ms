import AxiosInstance from "../api/AxiosInstance";
import { handleRequest } from "../api/apiHandler";

const BASE_PREFIX = "v1/users";

/** Avoid stacking toasts with the axios interceptor (403/5xx) and page catch handlers. */
const USER_REQ_SILENT = { silentStatuses: [400, 401, 403, 409, 422, 500, 503] } as const;

type UserListParams = {
    search?: string;
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: "asc" | "desc";
    filter?: "active" | "deleted" | "all";
};

const UserService = {

    // GET /api/v1/users
    getAll: (params?: UserListParams) =>
        handleRequest(
            AxiosInstance.get(`${BASE_PREFIX}`, { params }),
            "Failed to fetch users",
            USER_REQ_SILENT
        ),
    
    // GET /api/v1/users/{id}
    getOne: (id: string | number) =>
        handleRequest(
            AxiosInstance.get(`${BASE_PREFIX}/${id}`),
            "Failed to fetch user details",
            USER_REQ_SILENT
        ),
    
    // POST /api/v1/users
    create: (data: Record<string, unknown> | FormData) =>
        handleRequest(
            AxiosInstance.post(`${BASE_PREFIX}`, data),
            "Failed to create user",
            USER_REQ_SILENT
        ),
    
    // PUT /api/v1/users/{id}
    update: (id: string | number, data: Record<string, unknown> | FormData) =>
        handleRequest(
            AxiosInstance.put(`${BASE_PREFIX}/${id}`, data),
            "Failed to update user",
            USER_REQ_SILENT
        ),
    
    // DELETE /api/v1/users/{id}
    delete: (id: string | number) =>
        handleRequest(
            AxiosInstance.delete(`${BASE_PREFIX}/${id}`),
            "Failed to delete user",
            USER_REQ_SILENT
        ),

    restore: (id: string | number) =>
        handleRequest(
            AxiosInstance.post(`${BASE_PREFIX}/${id}/restore`),
            "Failed to restore user",
            USER_REQ_SILENT
        ),

    // ✅ ADD THIS method (used by Dashboard)
    getActiveCount: () =>
        handleRequest(
            AxiosInstance.get(`${BASE_PREFIX}/active/count`),
            "Failed to fetch active user count",
            USER_REQ_SILENT
        ),
};

export default UserService;