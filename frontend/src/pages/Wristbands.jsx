import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../context/LiveTelemetryContext';
import { API_URL, useAuth } from '../context/AuthContext';
import { Radio, Signal, Battery, BatteryCharging, AlertTriangle, Link as LinkIcon, Link2Off, RefreshCw } from 'lucide-react';

export default function Wristbands() {
  const { token, isAdmin } = useAuth();
  const { locations, refreshData } = useTelemetry();
  
  // Calculate battery levels and health
  const getBatteryColor = (level) => {
    if (level <= 20) return 'text-rose-500 fill-rose-500/10';
    if (level <= 50) return 'text-amber-500 fill-amber-500/10';
    return 'text-emerald-500 fill-emerald-500/10';
  };

  const getBatteryBarColor = (level) => {
    if (level <= 20) return 'bg-rose-500 shadow-rose-500/20';
    if (level <= 50) return 'bg-amber-500 shadow-amber-500/20';
    return 'bg-emerald-500 shadow-emerald-500/20';
  };

  const getSignalStrength = (strength) => {
    const bars = Number(strength) || 4;
    return (
      <div className="flex gap-0.5 items-end h-3">
        {[1, 2, 3, 4, 5].map((bar) => (
          <span 
            key={bar} 
            className={`w-0.75 rounded-t-sm transition-colors ${
              bar <= bars 
                ? 'bg-blue-400' 
                : 'bg-slate-800'
            }`} 
            style={{ height: `${bar * 20}%` }}
          />
        ))}
      </div>
    );
  };

  const handleUnassignWristband = async (user) => {
    if (!confirm(`Are you sure you want to unassign wristband ${user.wristbandId} from wearer ${user.name}?`)) return;
    try {
      const res = await fetch(`${API_URL}/users/${user.userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: user.name,
          phone: user.phone,
          wristbandId: null // Clear wristband
        })
      });
      if (res.ok) {
        refreshData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-wide">Wristband Management</h1>
          <p className="text-slate-400 text-xs mt-1">Surveillance dashboard tracking hardware configurations and battery health</p>
        </div>
        <button
          onClick={refreshData}
          className="flex items-center justify-center gap-2 py-3 px-4.5 text-xs font-bold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all"
        >
          <RefreshCw size={14} className="animate-spin-slow" />
          <span>Sync Status</span>
        </button>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">Monitored Nodes</span>
            <h3 className="text-2xl font-extrabold text-white mt-1">{locations.length} Units</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <Radio size={20} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">Critical Battery Nodes</span>
            <h3 className="text-2xl font-extrabold text-rose-400 mt-1">
              {locations.filter(l => l.battery <= 20).length} Units
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <AlertTriangle size={20} className={locations.filter(l => l.battery <= 20).length > 0 ? 'animate-bounce' : ''} />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">Signal Interlock Status</span>
            <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">Optimal</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Signal size={20} />
          </div>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {locations.map((loc) => {
          const isCritical = loc.battery <= 20;
          return (
            <div
              key={loc.wristbandId}
              className="p-5 rounded-2xl border border-slate-850 bg-slate-900/10 hover:shadow-lg transition-all space-y-4 flex flex-col justify-between"
            >
              {/* Card top */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-955/50 border border-slate-800 text-blue-400 flex items-center justify-center font-mono text-xs font-extrabold">
                      WB
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-white tracking-wide">{loc.wristbandId}</h4>
                      <span className="block text-[9.5px] text-slate-500 font-mono mt-0.25">Node deployment ID</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 critical-pulse" />
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Online</span>
                  </div>
                </div>

                {/* Connection Status details */}
                <div className="grid grid-cols-2 gap-3.5 bg-slate-950/40 p-3 rounded-xl border border-slate-850/80 text-[11px]">
                  {/* Signal Strength */}
                  <div className="space-y-1">
                    <span className="text-slate-500 block">Signal RSSI</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-300">
                      {getSignalStrength(loc.signalStrength)}
                      <span>Excellent</span>
                    </div>
                  </div>
                  {/* Battery State */}
                  <div className="space-y-1">
                    <span className="text-slate-500 block">Battery Level</span>
                    <div className={`flex items-center gap-1 font-bold ${getBatteryColor(loc.battery)}`}>
                      <Battery size={13} />
                      <span>{loc.battery}%</span>
                    </div>
                  </div>
                </div>

                {/* Battery Progression Bar */}
                <div className="space-y-1">
                  <div className="w-full h-1.5 rounded bg-slate-950 border border-slate-850 overflow-hidden">
                    <div 
                      className={`h-full rounded transition-all duration-500 ${getBatteryBarColor(loc.battery)}`} 
                      style={{ width: `${loc.battery}%` }}
                    />
                  </div>
                  {isCritical && (
                    <div className="flex items-center gap-1 text-[9.5px] text-rose-400 font-bold mt-1 animate-pulse">
                      <AlertTriangle size={10} />
                      <span>Battery voltage threshold critical! Charge immediately.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Bottom: Wearer Details Link */}
              <div className="border-t border-slate-800/80 pt-4 mt-2 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Assigned Profile</span>
                  <span className="font-bold text-slate-200">{loc.name}</span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleUnassignWristband(loc)}
                    className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-bold text-[10px] transition-colors"
                  >
                    <Link2Off size={12} />
                    <span>Unlink</span>
                  </button>
                )}
              </div>

            </div>
          );
        })}

        {locations.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-500 text-xs border border-dashed border-slate-850 rounded-2xl">
            No active wristbands connected.
          </div>
        )}
      </div>
    </div>
  );
}
