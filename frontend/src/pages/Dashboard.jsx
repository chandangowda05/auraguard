import React, { useEffect, useRef } from 'react';
import { useTelemetry } from '../context/LiveTelemetryContext';
import MetricCard from '../components/MetricCard';
import Chart from 'chart.js/auto';
import { 
  Radio, 
  Users, 
  ShieldAlert, 
  Flame, 
  Skull, 
  Hourglass, 
  CheckCircle,
  Activity,
  AlertOctagon,
  Clock,
  MapPin
} from 'lucide-react';

export default function Dashboard({ setActiveTab }) {
  const { locations, alerts, acknowledgeAlert } = useTelemetry();
  
  const chartActivityRef = useRef(null);
  const chartAlertRef = useRef(null);
  const chartActivityInstance = useRef(null);
  const chartAlertInstance = useRef(null);

  // 1. Calculations
  const totalWristbands = locations.length;
  const activeUsers = locations.filter(u => u.status === 'Active').length;
  const usersInRestricted = locations.filter(u => u.violations && u.violations.length > 0).length;
  const usersInSafe = totalWristbands - usersInRestricted;

  const activeAlerts = alerts.filter(a => a.status === 'Active').length;
  const emergencyAlerts = alerts.filter(a => a.alertType === 'Emergency Button').length;
  const fallAlerts = alerts.filter(a => a.alertType === 'Fall Detection').length;
  const inactivityAlerts = alerts.filter(a => a.alertType === 'Long Inactivity Detection').length;
  const runningAlerts = alerts.filter(a => a.alertType === 'Running Detection').length;

  // Recent 5 active/warning alerts
  const recentAlerts = alerts.slice(0, 5);

  // Render Charts in useEffect
  useEffect(() => {
    // A. Destroy existing charts if any
    if (chartActivityInstance.current) chartActivityInstance.current.destroy();
    if (chartAlertInstance.current) chartAlertInstance.current.destroy();

    // B. Build Activity distribution values
    const actCounts = { Normal: 0, Running: 0, Inactivity: 0, Fall: 0 };
    locations.forEach(l => {
      if (l.activity === 'Running') actCounts.Running++;
      else if (l.activity === 'Inactivity') actCounts.Inactivity++;
      else if (l.activity === 'Fall Detection') actCounts.Fall++;
      else actCounts.Normal++;
    });

    if (chartActivityRef.current) {
      chartActivityInstance.current = new Chart(chartActivityRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Normal State', 'Running', 'Inactivity', 'Fall Detected'],
          datasets: [{
            data: [actCounts.Normal, actCounts.Running, actCounts.Inactivity, actCounts.Fall],
            backgroundColor: ['#10b981', '#f59e0b', '#6366f1', '#ef4444'],
            borderWidth: 1,
            borderColor: '#0f172a'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', font: { size: 11 } }
            }
          }
        }
      });
    }

    // C. Build Alert trends severity distributions
    const severityCounts = { Critical: 0, Warning: 0, Info: 0 };
    alerts.forEach(a => {
      if (a.severity === 'Critical') severityCounts.Critical++;
      else if (a.severity === 'Warning') severityCounts.Warning++;
      else severityCounts.Info++;
    });

    if (chartAlertRef.current) {
      chartAlertInstance.current = new Chart(chartAlertRef.current, {
        type: 'bar',
        data: {
          labels: ['Critical', 'Warning', 'Information'],
          datasets: [{
            label: 'Alert Counts',
            data: [severityCounts.Critical, severityCounts.Warning, severityCounts.Info],
            backgroundColor: ['#f43f5e', '#fbbf24', '#38bdf8'],
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
            y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', stepSize: 1 } }
          }
        }
      });
    }

    return () => {
      if (chartActivityInstance.current) chartActivityInstance.current.destroy();
      if (chartAlertInstance.current) chartAlertInstance.current.destroy();
    };
  }, [locations, alerts]);

  // Format Helper for alert type icons
  const getAlertStyle = (type, severity) => {
    if (severity === 'Critical') return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    if (severity === 'Warning') return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
  };

  const getStatusBadge = (activity) => {
    if (activity === 'Fall Detection') return 'bg-red-500/15 text-red-400 border border-red-500/30 glow-text-red';
    if (activity === 'Running') return 'bg-amber-500/15 text-amber-400 border border-amber-500/30 glow-text-yellow';
    if (activity === 'Inactivity') return 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30';
    return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 glow-text-green';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-wide">IoT Dashboard</h1>
          <p className="text-slate-400 text-xs mt-1">Real-time surveillance overview & health telemetry</p>
        </div>
        <div className="flex items-center gap-3 bg-[#0d1321]/50 border border-slate-800 p-2.5 rounded-2xl">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 critical-pulse" />
          <span className="text-xs font-semibold text-slate-300">Live Telemetry Gateway Connection</span>
        </div>
      </div>

      {/* 9 Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <MetricCard title="Total Wristbands" value={totalWristbands} icon={Radio} color="blue" description="Configured system units" />
        <MetricCard title="Active Users" value={activeUsers} icon={Users} color="purple" description="Users actively wearing device" />
        <MetricCard title="Users in Safe Zone" value={usersInSafe} icon={CheckCircle} color="green" description="Inside normal designated coordinates" />
        <MetricCard title="Users in Restricted" value={usersInRestricted} icon={AlertOctagon} color="red" description="Inside red boundary regions" />
        <MetricCard title="Active Alerts" value={activeAlerts} icon={ShieldAlert} color="red" description="Currently unresolved anomalies" />
        <MetricCard title="Emergency SOS" value={emergencyAlerts} icon={Skull} color="red" description="SOS Panic buttons pressed" />
        <MetricCard title="Fall Detection Alerts" value={fallAlerts} icon={Flame} color="red" description="MPU6050 sudden shock triggers" />
        <MetricCard title="Inactivity Alerts" value={inactivityAlerts} icon={Hourglass} color="yellow" description="Wearer stationary > 5 minutes" />
        <MetricCard title="Running Alerts" value={runningAlerts} icon={Activity} color="yellow" description="High acceleration movement logs" />
      </div>

      {/* Main Grid: Charts & Live Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Side: Live Activity Feed */}
        <div className="lg:col-span-8 space-y-5">
          {/* Active Wearers Table */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white tracking-wide">Live Wearer Status</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Real-time status updates per wristband</p>
              </div>
              <button 
                onClick={() => setActiveTab('map')}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline"
              >
                Open Full Map
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3 px-2">Wearer ID</th>
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Last Active Position</th>
                    <th className="pb-3">Battery</th>
                    <th className="pb-3">AI State</th>
                    <th className="pb-3 text-right pr-2">Geofence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300 font-medium">
                  {locations.map((loc) => (
                    <tr key={loc.wristbandId} className="hover:bg-slate-900/20 transition-colors">
                      <td className="py-3 px-2 font-mono text-blue-400">{loc.wristbandId}</td>
                      <td className="py-3 font-semibold text-slate-100">{loc.name}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <MapPin size={12} className="text-slate-500" />
                          <span>{loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 font-semibold ${loc.battery <= 20 ? 'text-red-400' : 'text-slate-300'}`}>
                          {loc.battery}%
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(loc.activity)}`}>
                          {loc.activity}
                        </span>
                      </td>
                      <td className="py-3 text-right pr-2">
                        {loc.violations && loc.violations.length > 0 ? (
                          <span className="text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">
                            Restricted
                          </span>
                        ) : (
                          <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">
                            Safe Zone
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {locations.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-500">
                        No active wristbands connected. Open Telemetry Simulator to create one!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Activity Pie Chart */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40 flex flex-col justify-between h-80">
              <div>
                <h3 className="font-bold text-white tracking-wide">AI Activity Distribution</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">MPU6050 classified statuses</p>
              </div>
              <div className="relative flex-1 mt-4 h-48">
                <canvas ref={chartActivityRef} />
              </div>
            </div>

            {/* Alert Severity Chart */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40 flex flex-col justify-between h-80">
              <div>
                <h3 className="font-bold text-white tracking-wide">Alerts Severity Metrics</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Critical vs warnings log distributions</p>
              </div>
              <div className="relative flex-1 mt-4 h-48">
                <canvas ref={chartAlertRef} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Glowing Live Alert Feed */}
        <div className="lg:col-span-4 p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white tracking-wide">Active Alert Feed</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Live anomaly alarms stream</p>
            </div>
            <button 
              onClick={() => setActiveTab('alerts')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline"
            >
              View History
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
            {recentAlerts.map((alert) => (
              <div
                key={alert._id}
                className={`
                  p-4 rounded-xl border space-y-2.5 transition-all
                  ${alert.status === 'Active' ? 'bg-[#12192c]/50' : 'bg-slate-900/20 opacity-60'}
                  ${alert.severity === 'Critical' && alert.status === 'Active' ? 'border-rose-500/30 border-l-4 border-l-rose-500 shadow-lg shadow-rose-950/20' : 'border-slate-800'}
                `}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded tracking-wider ${getAlertStyle(alert.alertType, alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock size={10} />
                    <span>{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-200">
                  {alert.alertType}
                </div>
                
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  {alert.message}
                </p>

                {alert.status === 'Active' && (
                  <button
                    onClick={() => acknowledgeAlert(alert._id)}
                    className="w-full text-center py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10.5px] font-bold text-slate-300 border border-slate-700/80 transition-colors"
                  >
                    Acknowledge Alert
                  </button>
                )}
              </div>
            ))}

            {recentAlerts.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-xs">
                No alerts logged in system database. Safe Status active.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
