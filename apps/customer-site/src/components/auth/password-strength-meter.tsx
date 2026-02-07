'use client';

import React from 'react';
import { cn } from '@/lib/utils';


interface PasswordStrengthMeterProps {
    password: string;
}

const PasswordStrengthMeter = ({ password }: PasswordStrengthMeterProps) => {
    const getStrength = (pass: string) => {
        let score = 0;
        if (!pass) return score;
        if (pass.length > 6) score++;
        if (pass.length > 10) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[0-9]/.test(pass)) score++;
        if (/[^A-Za-z0-9]/.test(pass)) score++;
        return score;
    };

    const strength = getStrength(password);

    const getLabel = (s: number) => {
        if (s === 0) return '';
        if (s <= 2) return 'Weak';
        if (s <= 3) return 'Fair';
        if (s <= 4) return 'Good';
        return 'Strong';
    };

    const getColor = (s: number) => {
        if (s <= 2) return 'bg-red-500';
        if (s <= 3) return 'bg-yellow-500';
        if (s <= 4) return 'bg-blue-500';
        return 'bg-[#34C759]';
    };

    const getWidth = (s: number) => {
        if (s === 0) return '0%';
        return `${(s / 5) * 100}%`;
    };

    if (!password) return null;

    return (
        <div className="mt-2 space-y-1.5">
            <div className="flex justify-between items-center px-1">
                <span className="text-[11px] font-bold text-[#18230F]/40 font-headline">Password security</span>
                <span className={cn(
                    "text-[11px] font-bold font-headline transition-colors duration-300",
                    strength <= 2 ? "text-red-500" : strength <= 3 ? "text-yellow-600" : strength <= 4 ? "text-blue-600" : "text-[#34C759]"
                )}>
                    {getLabel(strength)}
                </span>
            </div>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={cn("h-full transition-all duration-500 ease-out rounded-full", getColor(strength))}
                    style={{ width: getWidth(strength) }}
                />
            </div>
        </div>
    );
};

export default PasswordStrengthMeter;
