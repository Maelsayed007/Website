export type SearchParamsInput = Record<string, string | string[] | undefined>;

type PaginationQueryOptions = {
  defaultPage?: number;
  defaultPageSize?: number;
  maxPageSize?: number;
  allowedPageSizes?: readonly number[];
};

export type ParsedPaginationQuery = {
  page: number;
  pageSize: number;
};

function toSingleValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

export function parsePaginationQuery(
  searchParams: SearchParamsInput,
  options: PaginationQueryOptions = {}
): ParsedPaginationQuery {
  const defaultPage = options.defaultPage ?? 1;
  const defaultPageSize = options.defaultPageSize ?? 12;
  const maxPageSize = options.maxPageSize ?? 48;

  const page = parsePositiveInt(toSingleValue(searchParams.page), defaultPage);
  const requestedPageSize = parsePositiveInt(
    toSingleValue(searchParams.pageSize),
    defaultPageSize
  );

  let pageSize = Math.min(maxPageSize, requestedPageSize);
  if (options.allowedPageSizes?.length) {
    pageSize = options.allowedPageSizes.includes(pageSize)
      ? pageSize
      : defaultPageSize;
  }

  return { page, pageSize };
}
