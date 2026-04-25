import React from 'react';

export default function Tabs({ tabs, activeTab, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 p-1 bg-dark-400 rounded-lg ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`
            flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all
            ${activeTab === tab.value 
              ? 'bg-primary-600 text-white' 
              : 'text-gray-400 hover:text-white hover:bg-dark-200'
            }
          `}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${activeTab === tab.value ? 'bg-primary-700' : 'bg-dark-200'}`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
