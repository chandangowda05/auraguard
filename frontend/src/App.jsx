import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LiveTelemetryProvider, useTelemetry } from './context/LiveTelemetryContext';
import Sidebar from './components/Sidebar';
import DeviceSimulator from './components/DeviceSimulator';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MapTracking from './pages/MapTracking';
import Geofencing from './pages/Geofencing';
import Alerts from './pages/Alerts';
import Users from './pages/Users';
import Wristbands from './pages/Wristbands';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { 
  Menu, 
  Bell, 
  Radio, 
  Activity, 
  AlertTriangle, 
  X,
  Volume2,
  VolumeX,
  Volume
} from 'lucide-react';

function DashboardLayout() {
  const { locations, alerts, notification, setNotification, acknowledgeAlert } = useTelemetry();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Tab switching router
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'map':
        return <MapTracking />;
      case 'geofencing':
        return <Geofencing />;
      case 'alerts':
        return <Alerts />;
      case 'users':
        return <Users />;
      case 'wristbands':
        return <Wristbands />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  const getAlertBannerStyle = (severity) => {
    if (severity === 'Critical') return 'bg-rose-950/95 border-rose-500 shadow-rose-900/30';
    return 'bg-amber-950/95 border-amber-500 shadow-amber-900/30';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-transparent font-sans">
      
      {/* Sidebar Drawer */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
      />

      {/* Main Panel Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Top Navbar */}
        <header className="h-20 flex items-center justify-between px-6 border-b border-slate-800 shrink-0 bg-[#0d1321]/40 backdrop-blur-md relative z-30 print:hidden">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="text-slate-400 hover:text-white md:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-semibold uppercase tracking-wider">
              <span>Security Terminal</span>
              <span>/</span>
              <span className="text-slate-300 font-bold capitalize">{activeTab}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Alarm sound status indicator */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 bg-slate-900/50 border border-slate-800/80 py-1.5 px-3 rounded-xl">
              <Volume size={13} className="text-blue-400" />
              <span>Alarm Audio Armed</span>
            </div>
            
            {/* Notifications Alert Center Icon */}
            <button 
              onClick={() => setActiveTab('alerts')}
              className="relative p-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900/20 transition-all shrink-0"
            >
              <Bell size={16} />
              {alerts.filter(a => a.status === 'Active').length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
              )}
            </button>
          </div>
        </header>

        {/* Dynamic page container viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10 print:p-0">
          {renderTabContent()}
        </main>

        {/* IoT Hardware Telemetry Simulation Drawer overlay */}
        <DeviceSimulator />

        {/* Global Warning Emergency Alert Banner overlay (Flashes on critical incidents) */}
        {notification && (
          <div className="fixed inset-x-0 top-0 z-[2000] flex justify-center p-4 animate-in slide-in-from-top duration-300 print:hidden">
            <div className={`
              w-full max-w-xl p-5 rounded-2xl border-2 backdrop-blur-xl shadow-2xl flex items-start gap-4 text-white
              ${getAlertBannerStyle(notification.severity)}
            `}>
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 shrink-0 border border-white/15 animate-bounce">
                <AlertTriangle size={22} className={notification.severity === 'Critical' ? 'text-rose-400' : 'text-amber-400'} />
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-sm tracking-wide uppercase">
                    {notification.severity} INCIDENT TRIGGERED
                  </h4>
                  <span className="text-[10px] text-white/60 font-mono">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                <p className="text-xs font-bold leading-relaxed text-slate-200">
                  {notification.message}
                </p>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      acknowledgeAlert(notification._id);
                      setNotification(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-white text-slate-900 font-extrabold text-[10.5px] hover:bg-slate-100 active:scale-95 transition-all shadow-md"
                  >
                    Acknowledge SOS
                  </button>
                  <button
                    onClick={() => setNotification(null)}
                    className="px-3 py-1.5 rounded-lg bg-transparent border border-white/30 text-white font-bold text-[10.5px] hover:bg-white/10 transition-colors"
                  >
                    Dismiss Indicator
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setNotification(null)}
                className="text-white/60 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

import ShaderBackground from './components/ui/shader-background';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <>
        <div className="fixed inset-0 z-0 pointer-events-none">
          <ShaderBackground />
        </div>
        <div className="fixed inset-0 bg-[#070b13]/60 z-0 pointer-events-none" />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center gap-4 font-sans">
          <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          <span className="text-xs font-semibold text-slate-400 tracking-wider">AURA-GUARD IoT INITIALIZING...</span>
        </div>
      </>
    );
  }

  // Route: if logged in show layout dashboard, else show login screen
  return (
    <>
      <div className="fixed inset-0 z-0 pointer-events-none">
        <ShaderBackground />
      </div>
      <div className="fixed inset-0 bg-[#070b13]/60 z-0 pointer-events-none" />
      <div className="relative z-10 h-full">
        {user ? (
          <LiveTelemetryProvider>
            <DashboardLayout />
          </LiveTelemetryProvider>
        ) : (
          <Login />
        )}
      </div>
    </>
  );
}
