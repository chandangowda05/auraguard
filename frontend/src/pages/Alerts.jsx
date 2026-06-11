import React, { useState } from 'react';
import { useTelemetry } from '../context/LiveTelemetryContext';
import { ShieldAlert, CheckCircle, Clock, MapPin, Search, Filter } from 'lucide-react';

export default function Alerts() {
  const { alerts, acknowledgeAlert } = useTelemetry();
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    // Search query match
    const nameMatch = alert.userName?.toLowerCase().includes(search.toLowerCase());
    const msgMatch = alert.message?.toLowerCase().includes(search.toLowerCase());
    const typeMatch = alert.alertType?.toLowerCase().includes(search.toLowerCase());
    
    if (search && !nameMatch && !msgMatch && !typeMatch) return false;

    // Severity match
    if (filterSeverity !== 'All' && alert.severity !== filterSeverity) return false;

    // Status match
    if (filterStatus !== 'All' && alert.status !== filterStatus) return false;

    return true;
  });

  const getSeverityStyle = (severity) => {
    if (severity === 'Critical') return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    if (severity === 'Warning') return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
  };

  const getStatusStyle = (status) => {
    if (status === 'Active') return 'bg-rose-500/15 text-rose-400 border border-rose-500/30 glow-text-red animate-pulse';
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-wide">Alert Management</h1>
        <p className="text-slate-400 text-xs mt-1">System logs tracking restricted entries, MPU6050 falls, and sensor warnings</p>
      </div>

      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl border border-slate-800 bg-[#0d1321]/40">
        
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search by wearer name, device ID or violation message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 text-xs text-slate-200 bg-slate-950/40 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Severity */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-500 shrink-0" />
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="w-full px-3 py-2 text-xs text-slate-300 rounded-xl bg-slate-950/40 border border-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="Warning">Warning</option>
            <option value="Information">Information</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2.5 text-xs text-slate-300 rounded-xl bg-slate-950/40 border border-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Acknowledged">Acknowledged</option>
          </select>
        </div>
      </div>

      {/* Alerts Logs Container */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 px-2">Alert Time</th>
                <th className="pb-3">Alert Category</th>
                <th className="pb-3">Wearer</th>
                <th className="pb-3">Location Coordinates</th>
                <th className="pb-3">Severity</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300 font-medium">
              {filteredAlerts.map((alert) => (
                <tr key={alert._id} className="hover:bg-slate-900/10 transition-colors">
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock size={12} className="text-slate-500" />
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="font-bold text-slate-200">
                      {alert.alertType}
                    </div>
                    <div className="text-[10px] text-slate-500 max-w-xs mt-0.5 leading-relaxed truncate" title={alert.message}>
                      {alert.message}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="font-semibold text-slate-100">{alert.userName}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{alert.wristbandId}</div>
                  </td>
                  <td className="py-4 font-mono text-[11px] text-slate-400">
                    {alert.location?.latitude ? (
                      <a 
                        href={`https://maps.google.com/?q=${alert.location.latitude},${alert.location.longitude}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1 hover:text-blue-400 transition-colors inline-flex"
                      >
                        <MapPin size={12} className="text-slate-500" />
                        <span>{alert.location.latitude.toFixed(5)}, {alert.location.longitude.toFixed(5)}</span>
                      </a>
                    ) : (
                      <span className="text-slate-600">N/A</span>
                    )}
                  </td>
                  <td className="py-4">
                    <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded tracking-wider ${getSeverityStyle(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="py-4">
                    <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded tracking-wider ${getStatusStyle(alert.status)}`}>
                      {alert.status}
                    </span>
                  </td>
                  <td className="py-4 text-right pr-2">
                    {alert.status === 'Active' ? (
                      <button
                        onClick={() => acknowledgeAlert(alert._id)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-white text-[10px] shadow-sm shadow-blue-600/10 active:scale-95 transition-all"
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase py-1 px-2 rounded bg-slate-900 border border-slate-800">
                        <CheckCircle size={10} className="text-emerald-500" />
                        <span>Resolved</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredAlerts.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No alert entries match the active filters query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
