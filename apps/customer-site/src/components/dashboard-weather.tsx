'use client';

import { Cloud, Wind, Thermometer, Droplets } from 'lucide-react';

export function DashboardWeather() {
    return (
        <div className="bg-amber-100/50 rounded-2xl p-6 border border-[#854d0e]/10">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-[#854d0e]">Amieira Lake</h3>
                    <p className="text-sm text-[#854d0e]/60">Mon, Feb 02</p>
                </div>
                <div className="p-2 bg-white rounded-full border border-[#854d0e]/10">
                    <Cloud className="h-6 w-6 text-[#854d0e]" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[#854d0e]/60 text-xs font-bold uppercase tracking-wider">
                        <Thermometer className="h-3 w-3" />
                        Temp
                    </div>
                    <p className="text-2xl font-black text-[#18230F]">18°C</p>
                </div>
                <div className="space-y-1 text-right">
                    <div className="flex items-center gap-1.5 justify-end text-[#854d0e]/60 text-xs font-bold uppercase tracking-wider">
                        <Wind className="h-3 w-3" />
                        Wind
                    </div>
                    <p className="text-2xl font-black text-[#18230F]">12 <span className="text-sm font-bold opacity-50">km/h</span></p>
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[#854d0e]/60 text-xs font-bold uppercase tracking-wider">
                        <Droplets className="h-3 w-3" />
                        Humidity
                    </div>
                    <p className="text-lg font-black text-[#18230F]">45%</p>
                </div>
                <div className="space-y-1 text-right">
                    <div className="flex items-center gap-1.5 justify-end text-[#854d0e]/60 text-xs font-bold uppercase tracking-wider">
                        <Cloud className="h-3 w-3" />
                        Sky
                    </div>
                    <p className="text-lg font-black text-[#18230F]">Partly Cloud</p>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#854d0e]/10">
                <p className="text-[10px] font-bold text-[#854d0e]/50 uppercase tracking-[0.2em] text-center">
                    Optimal Conditions for Sailing
                </p>
            </div>
        </div>
    );
}
