export type PageMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

/** Axios body: { status, message, data: Laravel paginator } */
export function parseLaravelPage<T>(envelope: unknown): { items: T[]; meta: PageMeta } {
  const e = envelope as {
    data?: { data?: T[]; current_page?: number; last_page?: number; per_page?: number; total?: number };
  };
  const p = e.data;
  return {
    items: Array.isArray(p?.data) ? p.data : [],
    meta: {
      current_page: p?.current_page ?? 1,
      last_page: p?.last_page ?? 1,
      per_page: p?.per_page ?? 20,
      total: p?.total ?? 0,
    },
  };
}
