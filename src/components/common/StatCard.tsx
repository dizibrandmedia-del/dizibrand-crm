import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  colorTheme?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'purple' | 'slate';
  hasLuminescentStroke?: boolean;
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  trend,
  colorTheme = 'indigo',
  hasLuminescentStroke = false,
  onClick,
  className = '',
}) => {
  const iconThemeStyles: Record<string, { bg: string; text: string }> = {
    indigo: { bg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', text: 'text-blue-400' },
    emerald: { bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', text: 'text-emerald-400' },
    amber: { bg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', text: 'text-amber-400' },
    rose: { bg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20', text: 'text-rose-400' },
    sky: { bg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20', text: 'text-cyan-400' },
    purple: { bg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20', text: 'text-purple-400' },
    slate: { bg: 'bg-slate-800/80 text-slate-400 border border-slate-700/60', text: 'text-slate-400' },
  };

  const style = iconThemeStyles[colorTheme] || iconThemeStyles.indigo;

  return (
    <div
      onClick={onClick}
      className={`stitch-card relative overflow-hidden rounded-xl p-4 sm:p-5 border border-[#232D42] bg-[#151A25] transition-all duration-200 ${
        hasLuminescentStroke ? 'stitch-luminescent-border shadow-lg shadow-blue-500/5' : ''
      } ${
        onClick ? 'cursor-pointer hover:bg-[#1A2232] hover:border-[#334155] hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate mr-1">{title}</span>
        <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${style.bg}`}>{icon}</div>
      </div>
      <div className="mt-2.5 sm:mt-3 flex items-baseline justify-between gap-1.5 sm:gap-2">
        <span className="text-xl sm:text-2xl xl:text-3xl font-sora font-semibold text-white tracking-tight tabular-nums truncate">
          {value}
        </span>
        {trend && (
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
              trend.isPositive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1.5 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
};

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; text?: string }> = ({
  size = 'md',
  text,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-3">
      <div
        className={`${sizeClasses[size]} border-indigo-600 border-t-transparent rounded-full animate-spin`}
      />
      {text && <span className="text-sm font-medium text-slate-500">{text}</span>}
    </div>
  );
};
