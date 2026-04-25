import React from 'react';

export default function Loader({ size = 'md', text = 'Loading...' }) {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4'
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className={`${sizeClasses[size]} border-dark-100 border-t-primary-500 rounded-full animate-spin`}></div>
      {text && <p className="mt-3 text-gray-400 text-sm">{text}</p>}
    </div>
  );
}
