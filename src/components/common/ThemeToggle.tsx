import React from 'react';
import { useTheme } from '../../context/ThemeContext.js';
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
      className={`group relative inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer ${
        isDark
          ? 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-slate-700/80 shadow-inner shadow-black/30'
          : 'bg-white hover:bg-slate-100 text-indigo-600 border border-slate-200 shadow-sm'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme mode"
    >
      <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden">
        {/* Sun Icon for Dark Mode */}
        <Sun
          className={`w-4 h-4 text-amber-400 transition-all duration-300 transform ${
            isDark
              ? 'rotate-0 scale-100 opacity-100 text-amber-400'
              : '-rotate-90 scale-0 opacity-0 absolute'
          }`}
        />

        {/* Moon Icon for Light Mode */}
        <Moon
          className={`w-4 h-4 text-indigo-600 transition-all duration-300 transform ${
            !isDark
              ? 'rotate-0 scale-100 opacity-100 text-indigo-600'
              : 'rotate-90 scale-0 opacity-0 absolute'
          }`}
        />
      </div>

      {showLabel && (
        <span className="text-[11px] font-semibold tracking-tight pr-1">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </button>
  );
};
