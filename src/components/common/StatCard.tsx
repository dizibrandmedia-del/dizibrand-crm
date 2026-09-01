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
    indigo: { bg: 'bg-indigo-50/50 hover:border-indigo-200', iconBg: 'bg-indigo-50 text-indigo-600', text: 'text-indigo-600' },
    emerald: { bg: 'bg-emerald-50/40 hover:border-emerald-200', iconBg: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-600' },
    amber: { bg: 'bg-amber-50/40 hover:border-amber-200', iconBg: 'bg-amber-50 text-amber-600', text: 'text-amber-600' },
    rose: { bg: 'bg-rose-50/40 hover:border-rose-200', iconBg: 'bg-rose-50 text-rose-600', text: 'text-rose-600' },
    sky: { bg: 'bg-sky-50/40 hover:border-sky-200', iconBg: 'bg-sky-50 text-sky-600', text: 'text-sky-600' },
    purple: { bg: 'bg-purple-50/40 hover:border-purple-200', iconBg: 'bg-purple-50 text-purple-600', text: 'text-purple-600' },
    slate: { bg: 'bg-slate-50 hover:border-slate-300', iconBg: 'bg-slate-100 text-slate-700', text: 'text-slate-700' },
  };

  const style = themeStyles[colorTheme] || themeStyles.indigo;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-slate-200/80 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      } ${style.bg} ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
        <div className={`p-2.5 rounded-xl ${style.iconBg} shadow-sm`}>{icon}</div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{value}</span>
        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend.isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
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
