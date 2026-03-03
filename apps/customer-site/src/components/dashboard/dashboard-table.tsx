import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

type DashboardTableProps = {
  headers: Array<string | ReactNode>;
  children: ReactNode;
  className?: string;
  tableClassName?: string;
};

export function DashboardTable({
  headers,
  children,
  className,
  tableClassName,
}: DashboardTableProps) {
  return (
    <Card className={cn('shadow-none', className)}>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className={tableClassName}>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                {headers.map((header, idx) => (
                  <TableHead key={`dashboard-table-header-${idx}`} className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>{children}</TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardTableRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <TableRow className={cn('hover:bg-muted/40', className)}>{children}</TableRow>;
}

export function DashboardTableCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <TableCell className={cn('align-middle', className)}>{children}</TableCell>;
}

