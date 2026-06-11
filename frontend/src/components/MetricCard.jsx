import React from 'react';

export default function MetricCard({ title, value, icon: Icon, color, description }) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      glow: 'shadow-blue-500/5',
      icon: 'text-blue-400',
      text: 'text-blue-400',
    },
    green: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      glow: 'shadow-emerald-500/5',
      icon: 'text-emerald-400',
      text: 'text-emerald-400',
    },
    yellow: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      glow: 'shadow-amber-500/5',
      icon: 'text-amber-400',
      text: 'text-amber-400',
    },
    red: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      glow: 'shadow-rose-500/5',
      icon: 'text-rose-400',
      text: 'text-rose-400',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      glow: 'shadow-purple-500/5',
      icon: 'text-purple-400',
      text: 'text-purple-400',
    }
  };

  const currentTheme = colorMap[color] || colorMap.blue;

  return (
    <div className={`
      relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg
      glass-panel ${currentTheme.border} ${currentTheme.glow}
    `}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400 tracking-wide">{title}</span>
        <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${currentTheme.bg}`}>
          <Icon size={20} className={currentTheme.icon} />
        </div>
      </div>
      
      <div className="mt-4">
        <span className="text-3xl font-extrabold font-sans text-white tracking-tight">
          {value}
        </span>
        {description && (
          <span className="block mt-1.5 text-xs text-slate-500 font-medium">
            {description}
          </span>
        )}
      </div>
    </div>
  );
}
