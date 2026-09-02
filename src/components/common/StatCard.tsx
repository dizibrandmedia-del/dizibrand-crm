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
  onClick,
  className = '',
}) => {
  const themeStyles: Record<string, { bg: string; iconBg: string; text: string }> = {
    indigo: { bg: 'bg-indigo-50/50 dark:bg-indigo-950/20 hover:border-indigo-200 dark:hover:border-indigo-800/60', iconBg: 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400', text: 'text-indigo-600 dark:text-indigo-400' },
    emerald: { bg: 'bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-200 dark:hover:border-emerald-800/60', iconBg: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400', text: 'text-emerald-600 dark:text-emerald-400' },
    amber: { bg: 'bg-amber-50/40 dark:bg-amber-950/20 hover:border-amber-200 dark:hover:border-amber-800/60', iconBg: 'bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400', text: 'text-amber-600 dark:text-amber-400' },
    rose: { bg: 'bg-rose-50/40 dark:bg-rose-950/20 hover:border-rose-200 dark:hover:border-rose-800/60', iconBg: 'bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400', text: 'text-rose-600 dark:text-rose-400' },
    sky: { bg: 'bg-sky-50/40 dark:bg-sky-950/20 hover:border-sky-200 dark:hover:border-sky-800/60', iconBg: 'bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400', text: 'text-sky-600 dark:text-sky-400' },
    purple: { bg: 'bg-purple-50/40 dark:bg-purple-950/20 hover:border-purple-200 dark:hover:border-purple-800/60', iconBg: 'bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400', text: 'text-purple-600 dark:text-purple-400' },
    slate: { bg: 'bg-slate-50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700', iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300', text: 'text-slate-700 dark:text-slate-300' },
  };

  const style = themeStyles[colorTheme] || themeStyles.indigo;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900/90 p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      } ${style.bg} ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl ${style.iconBg} shadow-sm`}>{icon}</div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</span>
        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend.isPositive ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
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
