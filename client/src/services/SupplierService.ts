import AxiosInstance from "../api/AxiosInstance";

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

const SupplierService = {
  getAll: async () => {
    const response = await AxiosInstance.get<{ data: Supplier[] }>('/v1/suppliers');
    return response.data;
  },

  create: async (data: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) => {
    const response = await AxiosInstance.post<{ data: Supplier }>('/v1/suppliers', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Supplier>) => {
    const response = await AxiosInstance.put<{ data: Supplier }>(`/v1/suppliers/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await AxiosInstance.delete(`/v1/suppliers/${id}`);
  },
};

export default SupplierService;