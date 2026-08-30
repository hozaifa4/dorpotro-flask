import React from 'react';

interface DorpotroLogoProps {
  className?: string;
  size?: number;
}

export default function DorpotroLogo({ className = '', size = 32 }: DorpotroLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 select-none cursor-pointer ${className}`}>
      <div 
        className="relative flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        {/* Glow behind the logo */}
        <div className="absolute inset-0 bg-indigo-500/10 rounded-xl blur-md animate-pulse"></div>
        
        {/* Sleek SVG Vector Logo */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full text-primary drop-shadow-sm relative z-10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Base Shield Grid of Transparency/Security */}
          <path
            d="M50 82C68 72 78 57 78 38V18L50 10L22 18V38C22 57 32 72 50 82Z"
            fill="url(#logo-shield-grad)"
            stroke="#031636"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Golden Seal of Public Procurement Trust */}
          <circle
            cx="50"
            cy="46"
            r="18"
            fill="url(#gold-radial-grad)"
            className="animate-pulse"
          />

          {/* Minimalist Document Folio Sheet containing rising Analytical pillars */}
          <rect
            x="40"
            y="34"
            width="20"
            height="24"
            rx="2.5"
            fill="white"
            fillOpacity="0.9"
            stroke="#046c50"
            strokeWidth="2.2"
          />

          {/* Two small analytical graph pillars (bids & volume) on document */}
          <rect
            x="45"
            y="46"
            width="3.5"
            height="7"
            rx="0.8"
            fill="#046c50"
          />
          <rect
            x="51.5"
            y="41"
            width="3.5"
            height="12"
            rx="0.8"
            fill="#6366f1"
          />

          {/* Sleek magnifying glass ring intersecting bottom-right for Intel Search */}
          <circle
            cx="60"
            cy="56"
            r="7"
            stroke="#031636"
            strokeWidth="2.5"
            fill="white"
          />
          <line
            x1="65"
            y1="61"
            x2="73"
            y2="69"
            stroke="#031636"
            strokeWidth="2.8"
            strokeLinecap="round"
          />

          {/* Gradient definitions */}
          <defs>
            <linearGradient id="logo-shield-grad" x1="22" y1="10" x2="78" y2="82" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f3f4f6" />
              <stop offset="50%" stopColor="#e5e7eb" />
              <stop offset="100%" stopColor="#d1d5db" />
            </linearGradient>

            <linearGradient id="gold-radial-grad" x1="32" y1="28" x2="68" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FEE2E2" stopOpacity="0.2" />
              <stop offset="20%" stopColor="#FEF08A" />
              <stop offset="60%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {/* Platform Name Typography with sleek badge */}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-display font-black text-primary text-[19px] tracking-tight">
            DORPOTRO<span className="text-emerald-650 text-emerald-600">.BD</span>
          </span>
          <span className="text-[10px] font-mono bg-indigo-100 hover:bg-indigo-150 text-indigo-700 px-1.5 py-0.5 rounded-sm font-black uppercase tracking-wider select-none border border-indigo-200">
            INTEL
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
          Tender Intelligence Platform
        </span>
      </div>
    </div>
  );
}
