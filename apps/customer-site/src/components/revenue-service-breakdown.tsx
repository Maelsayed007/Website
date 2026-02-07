'use client';

type RevenueServiceBreakdownProps = {
    data: {
        total: number;
        houseboat: number;
        restaurant: number;
        cruise: number;
    };
};

export function RevenueServiceBreakdown({ data }: RevenueServiceBreakdownProps) {
    const services = [
        { name: 'Houseboats', amount: data.houseboat, color: 'bg-[#90C17C]', textColor: 'text-[#2E7D32]' },
        { name: 'Restaurant', amount: data.restaurant, color: 'bg-[#FF9800]', textColor: 'text-[#E65100]' },
        { name: 'Cruises', amount: data.cruise, color: 'bg-[#2196F3]', textColor: 'text-[#1565C0]' }
    ];

    return (
        <div className="bg-white rounded-2xl border border-[#E5E3DD] p-8">
            <h3 className="text-sm font-bold text-[#1A2E1A] uppercase tracking-[0.1em] mb-6">Revenue by Service</h3>

            {/* Progress Bar */}
            <div className="h-3 w-full bg-[#F5F3EE] rounded-full overflow-hidden flex mb-6">
                {services.map((service) => (
                    <div
                        key={service.name}
                        className={service.color}
                        style={{ width: `${(service.amount / (data.total || 1)) * 100}%` }}
                    />
                ))}
            </div>

            {/* Breakdown List */}
            <div className="space-y-3">
                {services.map((service) => (
                    <div key={service.name} className="flex items-center justify-between py-2 border-b border-[#E5E3DD] last:border-0">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${service.color}`} />
                            <div>
                                <p className="text-sm font-bold text-[#1A2E1A]">{service.name}</p>
                                <p className="text-xs font-medium text-[#5F738C]">
                                    {((service.amount / (data.total || 1)) * 100).toFixed(1)}% of total
                                </p>
                            </div>
                        </div>
                        <span className={`text-sm font-bold ${service.textColor}`}>
                            €{service.amount.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>

            {/* Total */}
            <div className="mt-4 pt-4 border-t-2 border-[#E5E3DD]">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#1A2E1A] uppercase tracking-widest">Total Revenue</span>
                    <span className="text-xl font-black text-[#1A2E1A]">€{data.total.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}
