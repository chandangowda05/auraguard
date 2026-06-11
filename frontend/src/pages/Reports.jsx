import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import Chart from 'chart.js/auto';
import { FileSpreadsheet, FileText, Calendar, Filter, AlertTriangle, ShieldAlert, Award } from 'lucide-react';

export default function Reports() {
  const { token } = useAuth();
  const [range, setRange] = useState('weekly'); // 'daily', 'weekly', 'monthly'
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const chartTrendRef = useRef(null);
  const chartTrendInstance = useRef(null);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/reports?range=${range}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (e) {
      console.error('Error fetching reports data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [range, token]);

  // Handle Chart rendering
  useEffect(() => {
    if (loading || !reportData) return;

    if (chartTrendInstance.current) {
      chartTrendInstance.current.destroy();
    }

    if (chartTrendRef.current) {
      // Group alerts by day of week or hours to build a trend line
      const alertLogs = reportData.alerts || [];
      const labels = [];
      const dataPoints = [];

      if (range === 'daily') {
        // Group by 4 hour blocks
        for (let i = 24; i >= 0; i -= 4) {
          const t = new Date();
          t.setHours(t.getHours() - i);
          labels.push(`${t.getHours()}:00`);
          
          const count = alertLogs.filter(a => {
            const diff = (new Date() - new Date(a.timestamp)) / (1000 * 60 * 60);
            return diff >= i - 4 && diff < i;
          }).length;
          dataPoints.push(count);
        }
      } else {
        // Group by last 7 days
        const days = range === 'weekly' ? 7 : 30;
        const block = range === 'weekly' ? 1 : 4; // Step by 4 days if monthly
        
        for (let i = days; i >= 0; i -= block) {
          const t = new Date();
          t.setDate(t.getDate() - i);
          labels.push(t.toLocaleDateString([], { month: 'short', day: 'numeric' }));

          const count = alertLogs.filter(a => {
            const diff = (new Date() - new Date(a.timestamp)) / (1000 * 60 * 60 * 24);
            return diff >= i - block && diff < i;
          }).length;
          dataPoints.push(count);
        }
      }

      chartTrendInstance.current = new Chart(chartTrendRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'System Anomalies Alerts Logged',
            data: dataPoints,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointBackgroundColor: '#2563eb',
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
            y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 10 }, stepSize: 1 } }
          }
        }
      });
    }

    return () => {
      if (chartTrendInstance.current) {
        chartTrendInstance.current.destroy();
      }
    };
  }, [reportData, loading, range]);

  // Dynamic file exports (CSV builder)
  const exportToCSV = (datasetType) => {
    if (!reportData) return;

    let headers = [];
    let rows = [];
    let filename = `AuraGuard_${range}_Report`;

    if (datasetType === 'alerts') {
      headers = ['Alert ID', 'Wearer Name', 'Wristband ID', 'Alert Category', 'Severity', 'Message', 'Timestamp', 'Status'];
      rows = reportData.alerts.map(a => [
        a.id, a.userName, a.wristbandId, a.alertType, a.severity, `"${a.message.replace(/"/g, '""')}"`, a.timestamp, a.status
      ]);
      filename += '_Alerts.csv';
    } else if (datasetType === 'activities') {
      headers = ['Wearer Name', 'Wristband ID', 'AI Activity Classification', 'Timestamp'];
      rows = reportData.activities.map(a => [
        a.userName, a.wristbandId, a.activityType, a.timestamp
      ]);
      filename += '_Activities.csv';
    } else {
      headers = ['Wearer Name', 'Wristband ID', 'Latitude', 'Longitude', 'Timestamp'];
      rows = reportData.movements.map(g => [
        g.userName, g.wristbandId, g.latitude, g.longitude, g.timestamp
      ]);
      filename += '_Movements.csv';
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Browser standard document printing (triggers styled print setup)
  const triggerPrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 printable-reports-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/20 pb-2 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-wide">Historical Reports</h1>
          <p className="text-slate-400 text-xs mt-1">Generate and export geofencing safety matrices and activity charts</p>
        </div>
        
        {/* Interval Selector */}
        <div className="flex items-center gap-2 bg-[#0d1321]/50 border border-slate-800 p-1.5 rounded-xl">
          <Calendar size={13} className="text-slate-500 ml-2" />
          {['daily', 'weekly', 'monthly'].map((item) => (
            <button
              key={item}
              onClick={() => setRange(item)}
              className={`
                px-3 py-1.5 rounded-lg text-[10.5px] font-bold capitalize transition-colors
                ${range === item 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-400 hover:text-slate-200'}
              `}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-500 text-xs">
          Compiling report matrices logs...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Printable Document Title */}
          <div className="hidden print:block text-slate-800 space-y-2 border-b-2 border-slate-350 pb-4 mb-4">
            <h1 className="text-2xl font-extrabold">AuraGuard Security Surveillance Report</h1>
            <p className="text-xs">Generated on: {new Date().toLocaleString()} | Scope: {range.toUpperCase()}</p>
          </div>

          {/* Core Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <ShieldAlert size={20} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wide">Total Violations</span>
                <span className="text-xl font-black text-white">{reportData?.stats?.totalAlerts || 0} Logs</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wide">Geofence Crossings</span>
                <span className="text-xl font-black text-rose-400">{reportData?.stats?.geofenceViolations || 0} Crossings</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Calendar size={20} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wide">Fall Detections</span>
                <span className="text-xl font-black text-amber-400">{reportData?.stats?.activitySummary?.fall || 0} Falls</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Award size={20} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wide">System Security Rating</span>
                <span className="text-xl font-black text-emerald-400">98.2%</span>
              </div>
            </div>
          </div>

          {/* Interactive Trend Chart */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40 h-80 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-white tracking-wide">Anomaly Alerts Occurrence Trend</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Plot tracking safety triggers frequency</p>
            </div>
            <div className="relative flex-1 mt-4 h-48">
              <canvas ref={chartTrendRef} />
            </div>
          </div>

          {/* Exporter Triggers Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 print:hidden">
            {/* CSV data downloads */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40 space-y-4">
              <div>
                <h3 className="font-bold text-white tracking-wide">Excel Data Sheets Exports (CSV)</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Download database tabular spreadsheets datasets</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  onClick={() => exportToCSV('alerts')}
                  className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border border-slate-800 hover:border-blue-500 bg-slate-950/20 hover:bg-slate-900/50 text-slate-300 font-bold transition-all"
                >
                  <FileSpreadsheet size={20} className="text-blue-400" />
                  <span>Alerts Feed</span>
                </button>
                <button
                  onClick={() => exportToCSV('activities')}
                  className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border border-slate-800 hover:border-blue-500 bg-slate-950/20 hover:bg-slate-900/50 text-slate-300 font-bold transition-all"
                >
                  <FileSpreadsheet size={20} className="text-amber-400" />
                  <span>AI States</span>
                </button>
                <button
                  onClick={() => exportToCSV('gps')}
                  className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border border-slate-800 hover:border-blue-500 bg-slate-950/20 hover:bg-slate-900/50 text-slate-300 font-bold transition-all"
                >
                  <FileSpreadsheet size={20} className="text-emerald-400" />
                  <span>GPS Logs</span>
                </button>
              </div>
            </div>

            {/* Print/PDF */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-white tracking-wide">Safety Analysis Exporter (PDF)</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Generate print document for administration audits</p>
              </div>

              <button
                onClick={triggerPrintPDF}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-md"
              >
                <FileText size={16} />
                <span>Print Safety Audit Sheet</span>
              </button>
            </div>
          </div>

          {/* Table List of Recent Activity for printing details */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40 space-y-4">
            <div>
              <h3 className="font-bold text-white tracking-wide">Historical Alerts Summary</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Chronological summary listing registered anomalies</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3 px-2">Time</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Wearer</th>
                    <th className="pb-3">Violation Alert Message</th>
                    <th className="pb-3 text-right pr-2">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300 font-medium">
                  {reportData?.alerts?.slice(0, 15).map((a) => (
                    <tr key={a.id} className="hover:bg-slate-900/10 transition-colors">
                      <td className="py-3 px-2 text-slate-400 font-mono">
                        {new Date(a.timestamp).toLocaleDateString()} {new Date(a.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 font-semibold text-slate-200">{a.alertType}</td>
                      <td className="py-3 font-semibold text-slate-100">{a.userName}</td>
                      <td className="py-3 text-slate-400">{a.message}</td>
                      <td className="py-3 text-right pr-2">
                        <span className={`text-[10px] font-bold ${a.severity === 'Critical' ? 'text-red-400' : 'text-amber-400'}`}>
                          {a.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {reportData?.alerts?.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-500">
                        No historical violations to display.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
