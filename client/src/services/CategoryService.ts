import AxiosInstance from "../api/AxiosInstance";

export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

const CategoryService = {
  getAll: async () => {
    const response = await AxiosInstance.get<{ data: Category[] }>('/v1/categories');
    return response.data;
  },

  create: async (data: { name: string; description?: string }) => {
    const response = await AxiosInstance.post<{ data: Category }>('/v1/categories', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Category>) => {
    const response = await AxiosInstance.put<{ data: Category }>(`/v1/categories/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await AxiosInstance.delete(`/v1/categories/${id}`);
  },
};

export default CategoryService;