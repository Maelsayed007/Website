'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type PaginationProps = {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  pageSizes?: number[];
  className?: string;
};

const DEFAULT_PAGE_SIZES = [6, 12, 24, 48];

function buildPageList(totalPages: number, currentPage: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push('ellipsis');
  for (let p = start; p <= end; p += 1) pages.push(p);
  if (end < totalPages - 1) pages.push('ellipsis');

  pages.push(totalPages);
  return pages;
}

export function Pagination({
  totalItems,
  currentPage,
  pageSize,
  pageSizes = DEFAULT_PAGE_SIZES,
  className,
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  const pageItems = useMemo(() => buildPageList(totalPages, safePage), [safePage, totalPages]);

  const pushWith = (nextPage: number, nextPageSize = pageSize) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(nextPage));
    params.set('pageSize', String(nextPageSize));
    router.push(`${pathname}?${params.toString()}`);
  };

  const from = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(totalItems, safePage * pageSize);

  return (
    <div className={cn('flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-4 md:flex-row md:items-center md:justify-between', className)}>
      <div className="text-sm text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{from}</span> to{' '}
        <span className="font-semibold text-foreground">{to}</span> of{' '}
        <span className="font-semibold text-foreground">{totalItems}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-2 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => pushWith(1, Number(value))}
          >
            <SelectTrigger className="h-9 w-[84px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-xl"
          onClick={() => pushWith(1)}
          disabled={safePage <= 1}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-xl"
          onClick={() => pushWith(safePage - 1)}
          disabled={safePage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="mx-1 flex items-center gap-1">
          {pageItems.map((item, index) =>
            item === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="px-2 text-sm text-muted-foreground">
                ...
              </span>
            ) : (
              <Button
                key={item}
                variant={item === safePage ? 'default' : 'outline'}
                className="h-9 min-w-9 rounded-xl px-3 text-sm"
                onClick={() => pushWith(item)}
              >
                {item}
              </Button>
            )
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-xl"
          onClick={() => pushWith(safePage + 1)}
          disabled={safePage >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-xl"
          onClick={() => pushWith(totalPages)}
          disabled={safePage >= totalPages}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
