import React from 'react';

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 28, showText = true, className = "" }) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Custom Interlocking Threadline Signal SVG Mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <rect width="32" height="32" rx="6" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
        {/* Signal Thread 1 */}
        <path
          d="M6 16C10 16 11 9 16 9C21 9 22 23 26 23"
          stroke="#10b981"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Signal Thread 2 */}
        <path
          d="M6 23C11 23 12 16 16 16C20 16 21 9 26 9"
          stroke="#0ea5e9"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="2 3"
        />
        {/* Convergence Node */}
        <circle cx="16" cy="16" r="2.8" fill="#10b981" />
        <circle cx="16" cy="16" r="5" stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.4" />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span className="font-semibold tracking-wider text-sm text-slate-100 uppercase font-mono">
            Threadline
          </span>
          <span className="text-[10px] text-slate-400 font-mono tracking-tight -mt-0.5">
            Revenue Operations
          </span>
        </div>
      )}
    </div>
  );
};
