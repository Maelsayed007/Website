'use client';

type RevenueSourceListProps = {
    sourceData: Record<string, number>;
    total: number;
};

export function RevenueSourceList({ sourceData, total }: RevenueSourceListProps) {
    const sortedSources = Object.entries(sourceData).sort((a, b) => b[1] - a[1]);

    const colors = ['#90C17C', '#FF9800', '#2196F3', '#9C27B0', '#F44336', '#00BCD4'];

    return (
        <div className="bg-white rounded-2xl border border-[#E5E3DD] p-8">
            <h3 className="text-sm font-bold text-[#1A2E1A] uppercase tracking-[0.1em] mb-6">Revenue by Source</h3>

            {sortedSources.length === 0 ? (
                <p className="text-sm text-[#6B6B6B] text-center py-4">No data available</p>
            ) : (
                <>
                    {/* Progress Bar */}
                    <div className="h-3 w-full bg-[#F5F3EE] rounded-full overflow-hidden flex mb-6">
                        {sortedSources.map(([source, amount], index) => (
                            <div
                                key={source}
                                style={{
                                    width: `${(amount / (total || 1)) * 100}%`,
                                    backgroundColor: colors[index % colors.length]
                                }}
                            />
                        ))}
                    </div>

                    {/* Source List */}
                    <div className="space-y-3">
                        {sortedSources.map(([source, amount], index) => (
                            <div key={source} className="flex items-center justify-between py-2 border-b border-[#E5E3DD] last:border-0">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: colors[index % colors.length] }}
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-[#1A1A1A] capitalize">{source}</p>
                                        <p className="text-xs text-[#6B6B6B]">
                                            {((amount / (total || 1)) * 100).toFixed(1)}% of total
                                        </p>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-[#2E5C3A]">
                                    €{amount.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Total */}
                    <div className="mt-4 pt-4 border-t-2 border-[#E5E3DD]">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-[#1A1A1A] uppercase">Total Revenue</span>
                            <span className="text-lg font-bold text-[#2E5C3A]">€{total.toLocaleString()}</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
