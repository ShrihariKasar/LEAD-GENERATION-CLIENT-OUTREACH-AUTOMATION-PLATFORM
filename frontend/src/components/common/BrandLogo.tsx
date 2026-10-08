import React from 'react';

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  theme?: 'light' | 'dark';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 32,
  showText = true,
  className = "",
  theme = 'light'
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Icon Mark */}
      <div
        style={{ width: size, height: size }}
        className="bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold shadow-sm transition-colors group-hover:bg-blue-600 shrink-0"
      >
        <svg
          width={Math.round(size * 0.6)}
          height={Math.round(size * 0.6)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Signal Thread 1 */}
          <path d="M4 12c4 0 5-6 8-6s4 12 8 12" />
          {/* Signal Thread 2 */}
          <path d="M4 18c4 0 5-6 8-6s4-6 8-6" strokeOpacity="0.6" strokeDasharray="2 3" />
          {/* Node */}
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold tracking-tight text-base leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Threadline
          </span>
          <span className={`text-xs font-medium tracking-tight ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Outreach Automation
          </span>
        </div>
      )}
    </div>
  );
};
