"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showSubtitle?: boolean;
  href?: string;
}

export function BrandIcon({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("flex-shrink-0 transition-transform duration-300 hover:scale-105", className)}
    >
      <defs>
        <linearGradient id="orb-blue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#0EA5FF" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id="orb-silver-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#E5E6EA" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
        <filter id="orb-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Background Soft Glow */}
      <circle cx="50" cy="50" r="38" fill="#0EA5FF" fillOpacity="0.08" />

      {/* Main Metallic Ring */}
      <circle
        cx="50"
        cy="50"
        r="32"
        stroke="url(#orb-silver-grad)"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Inner Neon Core */}
      <circle
        cx="50"
        cy="50"
        r="24"
        stroke="url(#orb-blue-grad)"
        strokeWidth="2.5"
        strokeOpacity="0.8"
      />

      {/* Elliptical Cosmic Orbit */}
      <ellipse
        cx="50"
        cy="50"
        rx="42"
        ry="16"
        stroke="url(#orb-blue-grad)"
        strokeWidth="2.5"
        strokeDasharray="4 2"
        transform="rotate(-35 50 50)"
        filter="url(#orb-glow)"
      />

      {/* Glowing Star/Apogee */}
      <g transform="rotate(-35 50 50)">
        <circle cx="86" cy="50" r="5" fill="#0EA5FF" fillOpacity="0.4" />
        <circle cx="86" cy="50" r="3.5" fill="#38BDF8" />
        <circle cx="86" cy="50" r="2" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

export function BrandLogo({
  className,
  size = "md",
  showSubtitle = true,
  href,
}: BrandLogoProps) {
  const sizeMap = {
    sm: { icon: 28, text: "text-base", badge: "text-[10px] px-1.5 py-0.5", sub: "text-[8px]" },
    md: { icon: 38, text: "text-xl", badge: "text-xs px-2 py-0.5", sub: "text-[10px]" },
    lg: { icon: 48, text: "text-2xl", badge: "text-sm px-2.5 py-0.5", sub: "text-xs" },
    xl: { icon: 58, text: "text-3xl", badge: "text-base px-3 py-1", sub: "text-xs" },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={cn("inline-flex items-center gap-3 select-none group", className)}>
      <BrandIcon size={currentSize.icon} />
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className={cn("font-black tracking-tight text-white transition-colors group-hover:text-[#F8FAFC]", currentSize.text)}>
            ORBÍTICA
          </span>
          <span
            className={cn(
              "font-extrabold rounded-lg bg-[#0EA5FF]/15 border border-[#0EA5FF]/50 text-[#0EA5FF] tracking-wider shadow-[0_0_12px_rgba(14,165,255,0.25)]",
              currentSize.badge
            )}
          >
            POS
          </span>
        </div>
        {showSubtitle && (
          <span className={cn("font-mono font-medium text-[#8E929E] tracking-widest uppercase", currentSize.sub)}>
            STUDIO • COSTA RICA
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}