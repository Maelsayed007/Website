'use client';

type RevenueSourceListProps = {
  sourceData: Record<string, number>;
  total: number;
};

export function RevenueSourceList({ sourceData, total }: RevenueSourceListProps) {
  const sortedSources = Object.entries(sourceData).sort((a, b) => b[1] - a[1]);
  const colors = ['#16a34a', '#f59e0b', '#2563eb', '#7c3aed', '#ef4444', '#06b6d4'];

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="mb-6 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        Revenue by Source
      </h3>

      {sortedSources.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No data available</p>
      ) : (
        <>
          <div className="mb-6 flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {sortedSources.map(([source, amount], index) => (
              <div
                key={source}
                style={{
                  width: `${(amount / (total || 1)) * 100}%`,
                  backgroundColor: colors[index % colors.length],
                }}
              />
            ))}
          </div>

          <div className="space-y-3">
            {sortedSources.map(([source, amount], index) => (
              <div key={source} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <div>
                    <p className="text-sm font-medium capitalize text-foreground">{source}</p>
                    <p className="text-xs text-muted-foreground">
                      {((amount / (total || 1)) * 100).toFixed(1)}% of total
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  EUR {amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Revenue
              </span>
              <span className="text-lg font-semibold text-foreground">EUR {total.toLocaleString()}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

