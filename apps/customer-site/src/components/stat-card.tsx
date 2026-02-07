'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

type StatCardProps = {
    label: string;
    value: string | number;
    icon?: LucideIcon;
    iconColor?: string;
};

export function StatCard({ label, value, icon: Icon, iconColor = 'text-[#1A2E1A]' }: StatCardProps) {
    return (
        <div className="bg-[#F1F8F0] px-6 py-6 rounded-2xl flex items-center justify-between h-[100px]">
            <div className="flex flex-col justify-center">
                <span className="text-4xl font-black leading-none text-[#1A2E1A] mb-2">
                    {value}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#000000]">
                    {label}
                </span>
            </div>
            {Icon && (
                <div className="w-10 h-10 rounded-lg bg-white/80 flex items-center justify-center flex-shrink-0">
                    <Icon className={cn("h-5 w-5 stroke-[2px]", iconColor)} />
                </div>
            )}
        </div>
    );
}
