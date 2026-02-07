'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";

const countries = [
    { label: "Portugal", code: "+351", iso: "PT" },
    { label: "United Kingdom", code: "+44", iso: "GB" },
    { label: "Spain", code: "+34", iso: "ES" },
    { label: "France", code: "+33", iso: "FR" },
    { label: "Germany", code: "+49", iso: "DE" },
    { label: "United States", code: "+1", iso: "US" },
    { label: "Canada", code: "+1", iso: "CA" },
    { label: "Ireland", code: "+353", iso: "IE" },
    { label: "Netherlands", code: "+31", iso: "NL" },
    { label: "Switzerland", code: "+41", iso: "CH" },
];

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

const PhoneInput = ({ value, onChange, className }: PhoneInputProps) => {
    const [open, setOpen] = useState(false);
    const [country, setCountry] = useState(countries[0]);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        onChange(rawValue);
    };

    return (
        <div className={cn("flex gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className="flex h-11 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 outline-none focus:border-[#34C759] focus:border-2"
                    >
                        <span className="text-lg leading-none">{country.iso === 'PT' ? '🇵🇹' : country.iso === 'GB' ? '🇬🇧' : country.iso === 'ES' ? '🇪🇸' : country.iso === 'FR' ? '🇫🇷' : '🌐'}</span>
                        <span className="font-headline">{country.code}</span>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0 rounded-2xl" align="start">
                    <Command className="rounded-2xl">
                        <CommandInput placeholder="Search country..." className="font-headline" />
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                            {countries.map((c) => (
                                <CommandItem
                                    key={c.iso}
                                    value={c.label}
                                    onSelect={() => {
                                        setCountry(c);
                                        setOpen(false);
                                    }}
                                    className="font-headline cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 text-[#34C759]",
                                            country.iso === c.iso ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {c.label} ({c.code})
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>

            <Input
                type="tel"
                placeholder="912 345 678"
                value={value}
                onChange={handlePhoneChange}
                className="flex-1 h-11 border-slate-200 focus-visible:border-2 focus-visible:border-[#34C759] rounded-xl text-base font-medium text-[#18230F]"
            />
        </div>
    );
};

export default PhoneInput;
