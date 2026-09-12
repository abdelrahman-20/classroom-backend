export const parsePagination = (query: Record<string, unknown>) => {
  const page = Math.max(1, parseInt(String(query.page ?? 1), 10) || 1);
  const limit = Math.min(100, parseInt(String(query.limit ?? 10), 10) || 10);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

export const paginationMeta = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

export const escapeLike = (input: string) =>
  input.replace(/([%_\\])/g, "\\$1");
