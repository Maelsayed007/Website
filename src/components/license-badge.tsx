'use client';

import { Anchor } from 'lucide-react';

export function LicenseBadge() {
    return (
        <div className="relative w-32 h-24 flex flex-col items-center justify-end mb-1 group cursor-default transform hover:scale-105 transition-transform duration-300">

            {/* SVG Upper Arch Text */}
            <div className="absolute top-0 w-full h-full">
                <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
                    {/* Defined path for the text to curve over */}
                    <path
                        id="archPath"
                        d="M 20, 110 A 80, 80 0 0 1 180, 110"
                        fill="transparent"
                    />
                    <text className="fill-white font-black uppercase tracking-[0.1em]" fontSize="20" fontWeight="900" textAnchor="middle">
                        <textPath xlinkHref="#archPath" startOffset="50%">
                            No License Required
                        </textPath>
                    </text>
                </svg>
            </div>

            {/* Central Icon Badge - Slightly smaller */}
            <div className="relative z-10 w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-[0_5px_15px_rgba(20,20,20,0.3)] border-[3px] border-white/20 mt-1">
                <Anchor className="w-7 h-7 text-white drop-shadow-md" strokeWidth={2.5} />
            </div>

        </div>
    );
}
