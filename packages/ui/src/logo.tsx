'use client';

import Image from 'next/image';
import { cn } from "./lib/utils";

interface LogoProps {
  className?: string;
  logoUrl?: string;
  companyName?: string;
  isWhite?: boolean;
}

export default function Logo({ className, logoUrl, companyName, isWhite }: LogoProps) {
  if (logoUrl) {
    return (
      <div className={cn("relative aspect-[3/1]", className || "h-10 w-auto")}>
        <Image
          src={logoUrl}
          alt={companyName || "Logo"}
          fill
          className={cn(
            "object-contain object-left",
            // Apply white filter if isWhite prop is true
            isWhite && "brightness-0 invert"
          )}
          priority
        />
      </div>
    );
  }

  if (companyName) {
    return (
      <span className={cn("text-xl font-bold uppercase tracking-widest", isWhite ? "text-white" : "text-[#010a1f]", className)}>
        {companyName}
      </span>
    )
  }

  return (
    <span className={cn("text-xl font-bold uppercase tracking-widest", isWhite ? "text-white" : "text-[#010a1f]", className)}>
      AMIEIRA
    </span>
  );
}
