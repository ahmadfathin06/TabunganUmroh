export const getPagination = (page = 1, limit = 10) => {
  const p = Math.max(parseInt(page) || 1, 1);
  const l = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
  const skip = (p - 1) * l;
  return { skip, take: l, page: p, limit: l };
};