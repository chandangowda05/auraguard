import React from 'react';

export default function MetricCard({ title, value, icon: Icon, color, description }) {
  // Map old colors to DepthFold variants
  const colorMap = {
    blue: 'ux-parent--ocean',
    green: 'ux-parent--mint',
    yellow: 'ux-parent--solar',
    red: 'ux-parent--solar',
    purple: 'ux-parent--violet',
  };

  // Fallback to ocean if none matched
  const currentTheme = colorMap[color] || 'ux-parent--ocean';

  return (
    <div className={`ux-parent ${currentTheme}`}>
      <div className="ux-card">
        <div className="ux-logo" aria-hidden="true">
            <span className="ux-circle"></span>
            <span className="ux-circle"></span>
            <span className="ux-circle">
                <Icon size={24} strokeWidth={2.5} />
            </span>
        </div>
        <div className="ux-glass"></div>
        <div className="ux-content">
            <span className="ux-title">{title}</span>
            <span className="ux-text font-sans tracking-tight">{value}</span>
            {description && (
              <span className="ux-desc opacity-90">{description}</span>
            )}
        </div>
      </div>
    </div>
  );
}
