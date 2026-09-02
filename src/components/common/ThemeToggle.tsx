import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`relative inline-flex items-center gap-2 p-2 rounded-xl text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#ed1a3b]/40 ${
        isDark
          ? 'bg-slate-800/90 hover:bg-slate-700/90 text-amber-300 border border-slate-700/80 shadow-sm shadow-black/40'
          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle light and dark mode"
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 scale-100" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-300 -rotate-12 scale-100" />
        )}
      </div>
      {showLabel && (
        <span className="hidden sm:inline text-xs font-medium tracking-tight">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
};
