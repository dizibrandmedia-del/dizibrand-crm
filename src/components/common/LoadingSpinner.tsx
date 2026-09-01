import React from 'react';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  text = 'Loading...',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div
        className={`${sizeClasses} border-indigo-600 border-t-transparent rounded-full animate-spin`}
      />
      {text && (
        <p className="mt-3 text-xs text-slate-400 font-medium tracking-wide">
          {text}
        </p>
      )}
    </div>
  );
};
