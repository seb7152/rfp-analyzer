/**
 * PostgREST caps every request at a fixed number of rows (1000 by default on
 * Supabase). Queries that legitimately return more — every response of an RFP
 * with 200 requirements x 10 suppliers is 2000 rows — were silently truncated,
 * which both under-reported dashboards and hid the real cost of the query.
 *
 * `fetchAllRows` pages through the result with `.range()` until a short page
 * signals the end.
 */
const DEFAULT_PAGE_SIZE = 1000;

type RangeableQuery<T> = {
  range: (
    from: number,
    to: number
  ) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>;
};

export async function fetchAllRows<T>(
  buildQuery: () => RangeableQuery<T>,
  options: { pageSize?: number; label?: string } = {}
): Promise<T[]> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const rows: T[] = [];

  for (let page = 0; ; page++) {
    const from = page * pageSize;
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);

    if (error) {
      throw new Error(
        `Failed to fetch ${options.label ?? "rows"}: ${error.message}`
      );
    }

    const batch = data || [];
    rows.push(...batch);

    if (batch.length < pageSize) {
      return rows;
    }
  }
}
