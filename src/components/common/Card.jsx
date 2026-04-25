import React from 'react';

export default function Card({ children, className = '', onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`
        bg-dark-300 rounded-xl p-4 card-shadow
        ${onClick ? 'cursor-pointer hover:bg-dark-200 transition-colors' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
